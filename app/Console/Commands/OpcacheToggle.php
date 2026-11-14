<?php

namespace App\Console\Commands;

use App\Support\OpcacheSwitch;
use Illuminate\Console\Command;

/** ปิด/เปิด OPcache เฉพาะเว็บนี้ (.user.ini) — เรียกจากปุ่มใน /_maintenance */
class OpcacheToggle extends Command
{
    protected $signature = 'devtrin:opcache {state : off = ปิดเฉพาะเว็บนี้, on = กลับไปใช้ OPcache ของ host}';

    protected $description = 'Disable or re-enable OPcache for this site only via .user.ini';

    public function handle(): int
    {
        $state = strtolower((string) $this->argument('state'));
        if (! in_array($state, ['on', 'off'], true)) {
            $this->error('ใช้ on หรือ off');

            return self::FAILURE;
        }
        try {
            $state === 'off' ? OpcacheSwitch::disable() : OpcacheSwitch::enable();
        } catch (\Throwable $e) {
            $this->error('เขียน .user.ini ไม่ได้: '.$e->getMessage());

            return self::FAILURE;
        }
        $ttl = OpcacheSwitch::cacheTtl();
        $this->info(($state === 'off' ? 'ปิด OPcache เฉพาะเว็บนี้แล้ว' : 'เปิดใช้ OPcache ของ host อีกครั้งแล้ว')." — PHP จะอ่านค่าใหม่ภายใน {$ttl} วินาที");

        return self::SUCCESS;
    }
}
