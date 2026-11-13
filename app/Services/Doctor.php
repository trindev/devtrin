<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Setting;
use App\Models\User;
use App\Support\Media;
use App\Support\OpcacheHeal;
use App\Support\ReleaseIntegrity;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * ตรวจสุขภาพระบบ — ใช้ทั้งหน้า /_maintenance และ php artisan devtrin:doctor (ดัดแปลงจาก lawquest-web)
 * deep = เทียบ hash ทุกไฟล์กับ release + เปิดเว็บของทุกโปรเจกต์ดูว่ายังออนไลน์
 */
class Doctor
{
    public const OK = 'ok';

    public const WARN = 'warn';

    public const FAIL = 'fail';

    /** @return array<int, array{group: string, name: string, status: string, detail: string}> */
    public function run(bool $deep = false): array
    {
        $checks = [];
        $add = function (string $group, string $name, callable $check) use (&$checks) {
            try {
                [$status, $detail] = $check();
            } catch (\Throwable $e) {
                [$status, $detail] = [self::FAIL, $e->getMessage()];
            }
            $checks[] = ['group' => $group, 'name' => $name, 'status' => $status, 'detail' => $detail];
        };
        $production = app()->isProduction();

        // ── แอป ───────────────────────────────────────────────
        $add('แอป', 'APP_ENV', fn () => [$production ? self::OK : self::WARN, app()->environment()]);
        $add('แอป', 'APP_DEBUG', fn () => config('app.debug')
            ? [$production ? self::FAIL : self::WARN, 'เปิดอยู่ — production ต้องปิด (แสดง stack trace และค่า env ให้คนนอกเห็น)']
            : [self::OK, 'ปิด']);
        $add('แอป', 'APP_KEY', fn () => filled(config('app.key')) ? [self::OK, 'ตั้งแล้ว'] : [self::FAIL, 'ยังไม่ได้ตั้ง — php artisan key:generate']);
        $add('แอป', 'APP_URL', fn () => str_starts_with((string) config('app.url'), 'https://')
            ? [self::OK, config('app.url')]
            : [$production ? self::WARN : self::OK, config('app.url').' (production ควรเป็น https)']);
        $add('แอป', 'Maintenance mode', fn () => app()->isDownForMaintenance() ? [self::WARN, 'เปิดอยู่ — ผู้เข้าชมเห็นหน้าปิดปรับปรุง'] : [self::OK, 'ปิด (เว็บเปิดให้ใช้งาน)']);
        $add('แอป', 'เวอร์ชัน', fn () => [self::OK, 'PHP '.PHP_VERSION.' · framework '.app()->version()]);
        $add('แอป', 'Timezone', fn () => config('app.timezone') === 'Asia/Bangkok'
            ? [self::OK, 'Asia/Bangkok · ตอนนี้ '.now()->format('d/m/Y H:i')]
            : [self::WARN, config('app.timezone').' — ตั้ง APP_TIMEZONE=Asia/Bangkok ใน .env แล้วล้าง cache']);
        $add('แอป', 'Frontend build', fn () => file_exists(public_path('build/manifest.json'))
            ? [self::OK, 'public/build/manifest.json อายุ '.now()->diffForHumans(date('c', filemtime(public_path('build/manifest.json'))), true)]
            : [self::FAIL, 'ไม่มี public/build/manifest.json — รัน npm run build']);
        $add('แอป', 'ไฟล์ vendor', function () {
            // ทุกไฟล์ใน classmap ของ composer ต้องมีอยู่จริง — จับกรณีแตก zip แล้วไฟล์เสียหรือหาย
            $classMap = require base_path('vendor/composer/autoload_classmap.php');
            $missing = array_keys(array_filter($classMap, fn ($file) => ! is_file($file)));

            return $missing
                ? [self::FAIL, 'ไฟล์หาย '.count($missing).' รายการ เช่น '.$missing[0].' — กดติดตั้งเวอร์ชันปัจจุบันซ้ำ หรืออัปโหลด zip ใหม่']
                : [self::OK, number_format(count($classMap)).' คลาสครบ'];
        });
        $add('แอป', 'ไฟล์ตรงกับ release', function () use ($deep) {
            if (! is_file(base_path(ReleaseIntegrity::FILE))) {
                return [app()->isProduction() ? self::WARN : self::OK, 'ไม่มี CHECKSUMS.json (ไม่ได้ติดตั้งจาก release zip) — ตรวจเนื้อหาไฟล์ไม่ได้'];
            }
            $opcache = function_exists('opcache_get_status') && (@opcache_get_status(false)['opcache_enabled'] ?? false) ? 'เปิด' : 'ปิด';
            if (! $deep) {
                return [self::OK, "กด \"ตรวจละเอียด\" เพื่อเทียบ hash ทุกไฟล์ · OPcache {$opcache}"];
            }
            $result = ReleaseIntegrity::verify(base_path());

            return $result['bad']
                ? [self::FAIL, sprintf('ไฟล์บน server เสีย %d ไฟล์ เช่น %s — ติดตั้งเวอร์ชันปัจจุบันซ้ำ หรือใช้ recover.php',
                    count($result['bad']), implode(', ', array_slice($result['bad'], 0, 3)))]
                : [self::OK, number_format($result['checked'])." ไฟล์ตรงทุกไฟล์ · OPcache {$opcache}"];
        });
        $add('แอป', 'กู้คืน OPcache อัตโนมัติ', function () {
            $state = OpcacheHeal::state();
            if (! isset($state['at'])) {
                return [self::OK, 'ยังไม่เคยต้องกู้คืน'];
            }
            $when = Carbon::createFromTimestamp($state['at'])->timezone(config('app.timezone'));
            $detail = sprintf('กู้คืนแล้ว %d ครั้ง · ล่าสุด %s (%s) จาก "%s"', $state['count'] ?? 1, $when->format('j M H:i'), $when->diffForHumans(),
                mb_strimwidth(str_replace(base_path().'/', '', (string) ($state['error'] ?? '-')), 0, 140, '…'));

            return ($state['ok'] ?? true)
                ? [self::OK, $detail]
                : [$when->gt(now()->subHour()) ? self::FAIL : self::WARN, $detail.' — ล้างไม่สำเร็จ ใช้ปุ่ม "ล้าง OPcache" หรือ recover.php'];
        });
        $add('แอป', 'Config/route cache', fn () => app()->configurationIsCached() && app()->routesAreCached()
            ? [self::OK, 'cache แล้ว']
            : [$production ? self::WARN : self::OK, 'ยังไม่ cache — production ควรกด "Cache config/route/view"']);
        $add('แอป', 'Document root', function () {
            $docroot = realpath((string) request()->server('DOCUMENT_ROOT'));
            if (! $docroot || app()->runningInConsole()) {
                return [self::OK, 'ตรวจได้เฉพาะจากหน้าเว็บ'];
            }
            if ($docroot === realpath(public_path())) {
                return [self::OK, 'ชี้ที่ /public'];
            }
            // โดเมนหลักบน DirectAdmin: document root ล็อกที่ public_html → .htaccess ใน public_html ส่งต่อเข้า <แอป>/public
            $forward = @file_get_contents($docroot.'/.htaccess') ?: '';
            if (str_contains($forward, basename(base_path()).'/public')) {
                return [self::OK, "{$docroot}/.htaccess ส่งต่อเข้า ".basename(base_path()).'/public'];
            }

            return file_exists(base_path('.htaccess'))
                ? [self::WARN, "ชี้ที่ {$docroot} — ใช้ .htaccess ของแอปส่งต่อไป /public อยู่"]
                : [self::FAIL, "ชี้ที่ {$docroot} และไม่มี .htaccess ส่งต่อ — ไฟล์ .env อาจถูกเปิดอ่านได้"];
        });

        // ── ระบบ ───────────────────────────────────────────────
        $add('ระบบ', 'ฐานข้อมูล', function () {
            $start = microtime(true);
            DB::select('select 1');
            $ms = round((microtime(true) - $start) * 1000, 1);

            return [$ms < 200 ? self::OK : self::WARN, config('database.default').' · '.DB::connection()->getDatabaseName()." · {$ms} ms"];
        });
        $add('ระบบ', 'Migration', function () {
            $ran = DB::table('migrations')->pluck('migration')->all();
            $pending = collect(glob(database_path('migrations/*.php')))->map(fn ($f) => basename($f, '.php'))->diff($ran)->values();

            return $pending->isEmpty()
                ? [self::OK, 'ครบ '.count($ran).' ไฟล์']
                : [self::FAIL, 'ยังไม่รัน: '.$pending->implode(', ').' — กด "รัน migration"'];
        });
        $add('ระบบ', 'Cache', function () {
            $key = 'doctor:'.uniqid();
            Cache::put($key, 'ok', 10);
            $ok = Cache::pull($key) === 'ok';

            return [$ok ? self::OK : self::FAIL, config('cache.default').($ok ? ' อ่าน/เขียนได้' : ' อ่านค่ากลับไม่ได้')];
        });
        $add('ระบบ', 'Session', fn () => config('session.driver') === 'array'
            ? [self::FAIL, 'array — login จะหลุดทุก request']
            : [($production && ! config('session.secure')) ? self::WARN : self::OK, config('session.driver').(config('session.secure') ? ' · secure cookie' : ' · ยังไม่ตั้ง SESSION_SECURE_COOKIE=true')]);
        $add('ระบบ', 'สิทธิ์เขียนไฟล์', function () {
            $dirs = [storage_path('logs'), storage_path('framework/sessions'), storage_path('framework/cache'), base_path('bootstrap/cache'), storage_path('app/public')];
            $bad = array_filter($dirs, fn ($d) => ! is_dir($d) || ! is_writable($d));

            return $bad ? [self::FAIL, 'เขียนไม่ได้: '.implode(', ', $bad)] : [self::OK, 'storage และ bootstrap/cache เขียนได้'];
        });
        $add('ระบบ', 'รูปที่อัปโหลด', function () {
            $paths = Project::whereNotNull('cover_path')->pluck('cover_path')
                ->merge(DB::table('project_images')->pluck('path'));
            $missing = $paths->reject(fn ($p) => is_file(Media::absolute($p)))->values();

            return $missing->isEmpty()
                ? [self::OK, $paths->count().' ไฟล์ใน storage/app/public ครบ']
                : [self::FAIL, 'ไฟล์หาย '.$missing->count().' รูป เช่น '.$missing->first().' — อัปโหลดใหม่ในหน้าแก้ไขโปรเจกต์'];
        });
        $add('ระบบ', 'พื้นที่ดิสก์', function () {
            $free = @disk_free_space(storage_path());
            $gb = $free === false ? null : round($free / 1024 ** 3, 1);

            return $gb === null ? [self::WARN, 'อ่านค่าไม่ได้'] : [$gb > 1 ? self::OK : self::WARN, "ว่าง {$gb} GB"];
        });
        $add('ระบบ', 'อัปเดตจาก GitHub', fn () => app(SelfUpdater::class)->configured()
            ? [self::OK, 'repo '.config('services.github.repo')]
            : [self::WARN, 'ยังไม่ได้ตั้ง GITHUB_TOKEN — ปุ่มอัปเดตใช้ไม่ได้ ต้องอัปโหลด zip เอง']);

        // ── เนื้อหา ────────────────────────────────────────────
        $add('เนื้อหา', 'Admin', fn () => ($n = User::where('is_admin', true)->count()) > 0
            ? [self::OK, "{$n} คน"]
            : [self::FAIL, 'ยังไม่มี admin — php artisan devtrin:make-admin email']);
        $add('เนื้อหา', 'โปรเจกต์ที่แสดง', function () {
            $published = Project::published()->count();
            $noCover = Project::published()->whereNull('cover_path')->pluck('title');
            if ($published === 0) {
                return [self::WARN, 'ยังไม่มีโปรเจกต์ที่เผยแพร่ — หน้าแรกจะว่าง'];
            }

            return $noCover->isEmpty()
                ? [self::OK, "{$published} โปรเจกต์ · มีรูปปกครบ"]
                : [self::WARN, "{$published} โปรเจกต์ · ยังไม่มีรูปปก: ".$noCover->take(5)->implode(', ').($noCover->count() > 5 ? ' …' : '')];
        });
        $add('เนื้อหา', 'ช่องทางติดต่อ', fn () => collect(['email', 'line_url', 'phone', 'facebook_url'])->contains(fn ($k) => filled(Setting::get($k)))
            ? [self::OK, 'ตั้งแล้ว']
            : [self::WARN, 'ยังไม่มีช่องทางติดต่อ — ตั้งที่ /admin/settings']);

        // ── โปรเจกต์ออนไลน์ (deep) ─────────────────────────────
        $projects = Project::published()->whereNotNull('url')->ordered()->get(['title', 'url']);
        if (! $deep) {
            $add('โปรเจกต์ออนไลน์', 'เว็บของแต่ละโปรเจกต์', fn () => [self::OK, 'กด "ตรวจละเอียด" เพื่อเปิดเว็บ '.$projects->count().' โปรเจกต์ดูว่ายังออนไลน์']);
        } else {
            $responses = Http::pool(fn (Pool $pool) => $projects->map(
                fn ($p) => $pool->as((string) $p->url)->timeout(8)->withoutRedirecting()->withHeaders(['User-Agent' => 'devtrin-doctor'])->get($p->url)
            )->all());
            foreach ($projects as $p) {
                $add('โปรเจกต์ออนไลน์', $p->title, function () use ($responses, $p) {
                    $r = $responses[$p->url] ?? null;
                    if (! $r instanceof \Illuminate\Http\Client\Response) {
                        return [self::FAIL, "{$p->url} — เชื่อมต่อไม่ได้".($r instanceof \Throwable ? ': '.mb_strimwidth($r->getMessage(), 0, 120, '…') : '')];
                    }
                    $code = $r->status();

                    return [$code < 400 ? self::OK : ($code >= 500 ? self::FAIL : self::WARN), "{$p->url} — HTTP {$code}"];
                });
            }
        }

        return $checks;
    }

    /** ตรวจแบบเบาสำหรับแถบเตือนในหน้า admin (เรียกทุกครั้งที่เปิด dashboard จึงห้ามช้า) */
    public static function adminAlerts(): array
    {
        $alerts = [];
        if (app()->isProduction() && config('app.debug')) {
            $alerts[] = 'APP_DEBUG เปิดอยู่บน production — ตั้ง APP_DEBUG=false';
        }
        if (app()->isDownForMaintenance()) {
            $alerts[] = 'เว็บกำลังปิดปรับปรุง (maintenance mode) — ผู้เข้าชมเข้าไม่ได้';
        }

        return $alerts;
    }

    public static function summarize(array $checks): string
    {
        $statuses = array_column($checks, 'status');

        return in_array(self::FAIL, $statuses, true) ? self::FAIL : (in_array(self::WARN, $statuses, true) ? self::WARN : self::OK);
    }
}
