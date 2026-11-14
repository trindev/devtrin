<?php

namespace App\Services;

use App\Support\AppVersion;
use App\Support\OpcacheSwitch;
use App\Support\ReleaseIntegrity;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use ZipArchive;

/**
 * อัปเดตแอปตัวเองจาก GitHub Release (สำหรับ shared host ที่ไม่มี SSH)
 *
 * ขั้นที่ 1 install(): ดาวน์โหลด zip → แตกไฟล์แยกไว้ → ตรวจความครบ → สลับไฟล์เข้าที่
 *   (โฟลเดอร์เดิมย้ายไปเก็บใน storage/app/update-backups ไว้ย้อนกลับ, ไม่แตะ .env และ storage/)
 * ขั้นที่ 2 (request ใหม่ ใช้โค้ดใหม่แล้ว): migrate + cache — ดู MaintenanceController::finishUpdate
 */
class SelfUpdater
{
    /** ไฟล์/โฟลเดอร์ที่ห้ามทับ */
    private const PRESERVE = ['.env', 'storage'];

    private const KEEP_BACKUPS = 2;

    public function __construct(private ?string $targetPath = null) {}

    public function configured(): bool
    {
        return filled(config('services.github.repo')) && filled(config('services.github.token'));
    }

    /** release ล่าสุด 5 รุ่นที่มีไฟล์ zip (cache 5 นาที) */
    public function releases(bool $fresh = false): array
    {
        if (! $this->configured()) {
            return [];
        }
        if ($fresh) {
            Cache::forget('self-update:releases');
        }

        return Cache::remember('self-update:releases', 300, function () {
            $response = $this->github()->get('https://api.github.com/repos/'.config('services.github.repo').'/releases', ['per_page' => 5]);
            $response->throw();

            return collect($response->json())
                ->reject(fn ($r) => $r['draft'])
                ->map(function ($r) {
                    $asset = collect($r['assets'])->first(fn ($a) => preg_match('/^devtrin-.*\.zip$/', $a['name']));

                    return $asset ? [
                        'tag' => $r['tag_name'],
                        'version' => ltrim($r['tag_name'], 'v'),
                        'name' => $r['name'] ?: $r['tag_name'],
                        'notes' => mb_substr((string) $r['body'], 0, 2000),
                        'published_at' => $r['published_at'],
                        'prerelease' => $r['prerelease'],
                        'asset_id' => $asset['id'],
                        'size' => $asset['size'],
                    ] : null;
                })
                ->filter()->values()->all();
        });
    }

    public function latest(): ?array
    {
        return collect($this->releases())->first(fn ($r) => ! $r['prerelease']);
    }

    public function updateAvailable(): bool
    {
        $latest = $this->latest();

        return $latest && version_compare($latest['version'], AppVersion::version($this->target()), '>');
    }

    /** ตรวจว่า PHP เขียนไฟล์ของแอปได้ (shared host บางที่ล็อกไว้) */
    public function writableProblems(): array
    {
        $paths = [$this->target(), ...array_map(fn ($d) => $this->target().'/'.$d, ['app', 'vendor', 'public', 'config', 'routes', 'resources', 'database', 'bootstrap'])];

        return array_values(array_filter($paths, fn ($p) => file_exists($p) && ! is_writable($p)));
    }

    /** ขั้นที่ 1 — คืนค่าเวอร์ชันที่ติดตั้ง */
    public function install(string $tag): string
    {
        $release = collect($this->releases(fresh: true))->firstWhere('tag', $tag)
            ?? throw new RuntimeException("ไม่พบ release {$tag} ที่มีไฟล์ zip");

        $lock = Cache::lock('self-update', 600);
        if (! $lock->get()) {
            throw new RuntimeException('มีการอัปเดตอื่นกำลังทำงานอยู่');
        }

        try {
            @set_time_limit(600);
            $work = storage_path('app/updates/'.$tag.'-'.now()->format('YmdHis'));
            File::ensureDirectoryExists($work);

            $zipPath = $this->download($release['asset_id'], $work.'/release.zip');
            $extracted = $this->extract($zipPath, $work.'/files');
            $this->verify($extracted, $release['version']);
            $this->swap($extracted, $release['tag']);

            File::deleteDirectory($work);

            return $release['version'];
        } finally {
            $lock->release();
        }
    }

    private function download(int $assetId, string $to): string
    {
        $response = $this->github()
            ->withHeaders(['Accept' => 'application/octet-stream'])
            ->timeout(300)
            ->sink($to)
            ->get('https://api.github.com/repos/'.config('services.github.repo')."/releases/assets/{$assetId}");

        if ($response->successful() && ! is_file($to)) {
            file_put_contents($to, $response->body()); // บาง HTTP client (เช่นตอน test) ไม่เขียน sink ให้
        }
        if (! $response->successful() || ! is_file($to) || filesize($to) < 100) {
            throw new RuntimeException("ดาวน์โหลดไม่สำเร็จ (HTTP {$response->status()})");
        }

        return $to;
    }

    private function extract(string $zipPath, string $to): string
    {
        $zip = new ZipArchive;
        if ($zip->open($zipPath) !== true) {
            throw new RuntimeException('เปิดไฟล์ zip ไม่ได้');
        }
        // กัน zip-slip: ห้ามมี path ที่ออกนอกโฟลเดอร์
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (str_contains($name, '..') || str_starts_with($name, '/')) {
                throw new RuntimeException("พบ path ไม่ปลอดภัยใน zip: {$name}");
            }
        }
        $zip->extractTo($to);
        $zip->close();

        return $to;
    }

    private function verify(string $dir, string $expectedVersion): void
    {
        foreach (['artisan', 'vendor/autoload.php', 'public/index.php', 'public/build/manifest.json', 'bootstrap/app.php'] as $required) {
            if (! file_exists("{$dir}/{$required}")) {
                throw new RuntimeException("ไฟล์ใน release ไม่ครบ: ไม่มี {$required}");
            }
        }
        $version = AppVersion::version($dir);
        if ($version !== $expectedVersion) {
            throw new RuntimeException("VERSION ใน zip ({$version}) ไม่ตรงกับ release ({$expectedVersion})");
        }

        // เนื้อหาทุกไฟล์ต้องตรงกับตอน build — ไฟล์เพี้ยนแม้ตัวอักษรเดียวก็ไม่สลับเข้าที่ (release ก่อน v1.0.7 ไม่มี manifest)
        $integrity = ReleaseIntegrity::verify($dir);
        if ($integrity && $integrity['bad']) {
            throw new RuntimeException(sprintf('ไฟล์ที่แตกจาก zip เสีย %d ไฟล์ เช่น %s — ยกเลิก ไม่แตะเวอร์ชันที่ใช้งานอยู่ ลองกดอัปเดตอีกครั้ง',
                count($integrity['bad']), implode(', ', array_slice($integrity['bad'], 0, 3))));
        }
    }

    /** ย้ายของเดิมไปเก็บ แล้วย้ายของใหม่เข้าที่ (rename ภายใน disk เดียวกันจึงเร็วและแทบไม่มีช่วงที่ไฟล์หาย) */
    private function swap(string $from, string $tag): void
    {
        $target = $this->target();
        $backup = storage_path('app/update-backups/'.now()->format('YmdHis').'-from-v'.AppVersion::version($target).'-to-'.$tag);
        File::ensureDirectoryExists($backup);

        foreach (array_diff(scandir($from), ['.', '..']) as $item) {
            if (in_array($item, self::PRESERVE, true)) {
                continue;
            }
            $old = "{$target}/{$item}";
            if (file_exists($old)) {
                $this->move($old, "{$backup}/{$item}");
            }
            $this->move("{$from}/{$item}", $old);
        }

        $this->pruneBackups();
        OpcacheSwitch::flushStaleCode($target);
    }

    private function move(string $from, string $to): void
    {
        if (@rename($from, $to)) {
            return;
        }
        // ต่าง disk กัน → copy แล้วลบ
        is_dir($from) ? File::copyDirectory($from, $to) : File::copy($from, $to);
        is_dir($from) ? File::deleteDirectory($from) : File::delete($from);
    }

    private function pruneBackups(): void
    {
        collect(File::directories(storage_path('app/update-backups')))
            ->sort()->reverse()->slice(self::KEEP_BACKUPS)
            ->each(fn ($dir) => File::deleteDirectory($dir));
    }

    private function target(): string
    {
        return $this->targetPath ?? base_path();
    }

    private function github()
    {
        return Http::withToken((string) config('services.github.token'))
            ->withHeaders(['X-GitHub-Api-Version' => '2022-11-28'])
            ->timeout(20);
    }
}
