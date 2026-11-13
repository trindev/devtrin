<?php

namespace App\Console\Commands;

use App\Services\Doctor as DoctorService;
use Illuminate\Console\Command;

class Doctor extends Command
{
    protected $signature = 'devtrin:doctor {--deep : ทดสอบเรียก API ภายนอกด้วย} {--json : แสดงผลเป็น JSON}';

    protected $description = 'ตรวจสุขภาพระบบ (ใช้หลัง deploy — exit code 1 ถ้ามีรายการ fail)';

    public function handle(DoctorService $doctor): int
    {
        $checks = $doctor->run($this->option('deep'));
        $summary = DoctorService::summarize($checks);

        if ($this->option('json')) {
            $this->line(json_encode(['status' => $summary, 'checks' => $checks], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        } else {
            $icon = [DoctorService::OK => '<fg=green>✓</>', DoctorService::WARN => '<fg=yellow>!</>', DoctorService::FAIL => '<fg=red>✗</>'];
            $this->table(['', 'หมวด', 'รายการ', 'รายละเอียด'], array_map(
                fn ($c) => [$icon[$c['status']], $c['group'], $c['name'], $c['detail']],
                $checks,
            ));
            $this->line('สรุป: '.strtoupper($summary));
        }

        return $summary === DoctorService::FAIL ? self::FAILURE : self::SUCCESS;
    }
}
