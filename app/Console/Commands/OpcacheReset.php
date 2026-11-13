<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * ล้างโค้ด PHP ที่ compile ค้างไว้ในหน่วยความจำ (OPcache)
 * ต้องเรียกผ่านปุ่มใน /_maintenance (Artisan::call ใน web request) จึงจะล้าง OPcache ของเว็บ — รันจาก CLI จะล้างแค่ของ CLI
 * ใช้เมื่อไฟล์บนดิสก์ตรงกับ release แต่ยังเจอ error ชื่อเพี้ยน (หน่วยความจำ OPcache เสีย) และหลังสลับไฟล์ตอนอัปเดต
 */
class OpcacheReset extends Command
{
    protected $signature = 'devtrin:opcache-reset';

    protected $description = 'Reset PHP OPcache of the current SAPI';

    public function handle(): int
    {
        if (! function_exists('opcache_reset') || ! (opcache_get_status(false)['opcache_enabled'] ?? false)) {
            $this->info('OPcache ไม่ได้เปิดใช้ — ไม่ต้องล้าง');

            return self::SUCCESS;
        }

        if (! opcache_reset()) {
            $this->error('host ไม่อนุญาตให้ล้าง OPcache (opcache.restrict_api) — ให้ host restart PHP แทน');

            return self::FAILURE;
        }
        $this->info('ล้าง OPcache แล้ว — โค้ดจะ compile ใหม่จากไฟล์บนดิสก์');

        return self::SUCCESS;
    }
}
