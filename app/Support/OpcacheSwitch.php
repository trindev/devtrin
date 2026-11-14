<?php

namespace App\Support;

/**
 * ปิด/เปิด OPcache เฉพาะเว็บนี้ ด้วย .user.ini (แบบเดียวกับ staycoolv3 ที่ปิดไว้เพราะ OPcache ของ host เก็บ opcode เสีย)
 *
 * วางที่ base_path('.user.ini') — ไม่ใช่ public/ เพราะตัวอัปเดตสลับโฟลเดอร์ public/ ทั้งก้อน (ค่าที่เลือกจะหาย)
 * PHP-FPM อ่าน .user.ini จากโฟลเดอร์ของสคริปต์ไล่ขึ้นไปจนถึง document root (public_html) จึงครอบ devtrin/public ด้วย
 * แต่ไม่ครอบ subdomain อื่น (document root ของแต่ละตัวอยู่ในโฟลเดอร์ตัวเอง)
 * PHP อ่านไฟล์ใหม่ทุก user_ini.cache_ttl (ค่าเริ่มต้น 300 วินาที)
 */
class OpcacheSwitch
{
    private const LINE = 'opcache.enable=0';

    public static function file(): string
    {
        return base_path('.user.ini');
    }

    /** ไฟล์สั่งปิดอยู่ไหม (ค่าที่ตั้งไว้) */
    public static function disabledByFile(): bool
    {
        $raw = @file_get_contents(self::file());

        return $raw !== false && preg_match('/^\s*opcache\.enable\s*=\s*(0|off|false)\s*$/mi', $raw) === 1;
    }

    /** OPcache ทำงานกับ request นี้จริงไหม (ค่าที่ PHP ใช้อยู่ตอนนี้) */
    public static function activeNow(): bool
    {
        // ใช้สถานะจริง ไม่ใช่ ini_get — ค่า ini เป็น 1 ได้ทั้งที่ OPcache ไม่ได้ทำงาน (เช่น CLI, หรือ host ปิดไว้ที่อื่น)
        $status = function_exists('opcache_get_status') ? @opcache_get_status(false) : false;

        return is_array($status) && ($status['opcache_enabled'] ?? false);
    }

    public static function cacheTtl(): int
    {
        return (int) (ini_get('user_ini.cache_ttl') ?: 300);
    }

    public static function disable(): void
    {
        $lines = self::otherLines();
        $lines[] = '; ปิด OPcache เฉพาะเว็บนี้ — ตั้งจากปุ่มใน /_maintenance เมื่อ '.now()->format('Y-m-d H:i');
        $lines[] = '; OPcache ของ host เต็ม/เก็บ opcode เสีย (แบบเดียวกับ staycool) · เปิดกลับด้วยปุ่มเดิม';
        $lines[] = self::LINE;
        file_put_contents(self::file(), implode("\n", $lines)."\n", LOCK_EX);
    }

    public static function enable(): void
    {
        $lines = self::otherLines();
        $lines ? file_put_contents(self::file(), implode("\n", $lines)."\n", LOCK_EX) : @unlink(self::file());
    }

    /** บรรทัดอื่นใน .user.ini ที่ไม่ใช่ของเรา — เก็บไว้ตามเดิม */
    private static function otherLines(): array
    {
        $raw = @file_get_contents(self::file()) ?: '';

        return array_values(array_filter(
            preg_split('/\R/', $raw),
            fn ($l) => trim($l) !== '' && ! preg_match('/^\s*opcache\.enable\s*=/i', $l) && ! str_starts_with(trim($l), '; ปิด OPcache') && ! str_starts_with(trim($l), '; OPcache ของ host'),
        ));
    }

    /**
     * สคริปต์ของเว็บนี้ใน OPcache ร่วมของเครื่อง — ใช้ดูว่าพื้นที่เต็มเพราะเราหรือเพราะเว็บอื่น
     *
     * @return array{scripts: int, bytes: int}|null
     */
    public static function share(): ?array
    {
        $status = function_exists('opcache_get_status') ? @opcache_get_status(true) : false;
        if (! is_array($status) || ! isset($status['scripts'])) {
            return null;
        }
        $roots = array_unique([base_path(), realpath(base_path()) ?: base_path()]);
        $scripts = 0;
        $bytes = 0;
        foreach ($status['scripts'] as $path => $info) {
            foreach ($roots as $root) {
                if (str_starts_with($path, $root.'/')) {
                    $scripts++;
                    $bytes += (int) ($info['memory_consumption'] ?? 0);
                    break;
                }
            }
        }

        return ['scripts' => $scripts, 'bytes' => $bytes];
    }

    /**
     * หลังสลับไฟล์ตอนอัปเดต: ทิ้งโค้ด/แคชของเวอร์ชันเก่าทันที (ยกมาจาก staycoolv3 SelfUpdater::flushStaleCode)
     * - OPcache อาจยังถือ opcode ไฟล์เดิม → request ถัดไปผสมโค้ดเก่า/ใหม่แล้วพัง — ล้างเฉพาะสคริปต์ของเราก่อน แล้วค่อย reset ทั้งหมด
     * - compiled Blade และ bootstrap/cache ของเวอร์ชันเก่า
     */
    public static function flushStaleCode(string $target): void
    {
        foreach (array_merge(glob("{$target}/bootstrap/cache/*.php") ?: [], glob("{$target}/storage/framework/views/*.php") ?: []) as $file) {
            @unlink($file);
        }
        if (! function_exists('opcache_get_status')) {
            return;
        }
        $status = @opcache_get_status(true);
        if (is_array($status) && ! empty($status['scripts']) && function_exists('opcache_invalidate')) {
            $roots = array_unique([$target, realpath($target) ?: $target]); // OPcache เก็บ path จริง (shared host มักมี symlink)
            foreach (array_keys($status['scripts']) as $script) {
                if (array_filter($roots, fn ($r) => str_starts_with($script, $r))) {
                    @opcache_invalidate($script, true);
                }
            }
        }
        if (function_exists('opcache_reset')) {
            @opcache_reset();
        }
    }
}
