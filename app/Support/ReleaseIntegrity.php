<?php

namespace App\Support;

use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * checksum ของทุกไฟล์ใน release (CHECKSUMS.json สร้างตอน build — deploy/build-release.sh)
 *
 * ไฟล์บน shared host เคยเสียแบบตัวอักษรเพี้ยนตัวเดียว ("Illumimate", "Batch.pgp", "pha256") ซึ่งการตรวจว่า
 * "ไฟล์มีอยู่" จับไม่ได้ — ตรวจเนื้อหาด้วย hash ก่อนสลับไฟล์ตอนอัปเดต และให้หน้า doctor ตรวจไฟล์ที่ติดตั้งอยู่
 * ไม่ใช้ Laravel เลย (deploy/build-release.sh เรียกตอนยังไม่มี .env)
 */
final class ReleaseIntegrity
{
    public const FILE = 'CHECKSUMS.json';

    /** hash เร็ว ใช้จับไฟล์เสีย ไม่ได้กันการปลอมแปลง */
    public const ALGO = 'xxh128';

    /** ไม่อยู่ใน manifest: ข้อมูล/แคชที่ server สร้างเอง และไฟล์ที่ไม่ได้มากับ zip */
    private const SKIP = ['storage/', 'bootstrap/cache/', '.env', self::FILE];

    /** @return array{algo: string, files: array<string, string>} */
    public static function generate(string $dir): array
    {
        $files = [];
        foreach (self::walk($dir) as $relative => $path) {
            $files[$relative] = hash_file(self::ALGO, $path);
        }
        ksort($files);

        return ['algo' => self::ALGO, 'files' => $files];
    }

    public static function write(string $dir): int
    {
        $manifest = self::generate($dir);
        file_put_contents("{$dir}/".self::FILE, json_encode($manifest, JSON_UNESCAPED_SLASHES));

        return count($manifest['files']);
    }

    /**
     * เทียบไฟล์ใน $dir กับ CHECKSUMS.json ของ $dir เอง (หรือของ $manifestDir ถ้าให้มา)
     * คืน null ถ้าไม่มี manifest (release เก่ากว่า v1.0.7)
     *
     * @return array{checked: int, bad: list<string>}|null
     */
    public static function verify(string $dir, ?string $manifestDir = null): ?array
    {
        $manifestFile = ($manifestDir ?? $dir).'/'.self::FILE;
        if (! is_file($manifestFile)) {
            return null;
        }
        $manifest = json_decode((string) file_get_contents($manifestFile), true);
        if (! is_array($manifest['files'] ?? null)) {
            return ['checked' => 0, 'bad' => [self::FILE.' อ่านไม่ได้']];
        }

        $bad = [];
        foreach ($manifest['files'] as $relative => $expected) {
            $path = "{$dir}/{$relative}";
            if (! is_file($path)) {
                $bad[] = "{$relative} (หาย)";
            } elseif (hash_file($manifest['algo'] ?? self::ALGO, $path) !== $expected) {
                $bad[] = "{$relative} (เนื้อหาไม่ตรง)";
            }
        }

        return ['checked' => count($manifest['files']), 'bad' => $bad];
    }

    /** @return iterable<string, string> relative path => absolute path */
    private static function walk(string $dir): iterable
    {
        $base = rtrim($dir, '/').'/';
        $items = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
        foreach ($items as $item) {
            if (! $item->isFile()) {
                continue;
            }
            $relative = substr($item->getPathname(), strlen($base));
            foreach (self::SKIP as $skip) {
                if ($relative === $skip || str_starts_with($relative, $skip)) {
                    continue 2;
                }
            }
            yield $relative => $item->getPathname();
        }
    }
}
