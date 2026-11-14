<?php

namespace Tests\Feature;

use App\Support\OpcacheSwitch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpcacheSwitchTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        @unlink(OpcacheSwitch::file());
        parent::tearDown();
    }

    public function test_toggle_writes_and_removes_user_ini(): void
    {
        $this->artisan('devtrin:opcache off')->assertExitCode(0);
        $this->assertTrue(OpcacheSwitch::disabledByFile());
        $this->assertStringContainsString('opcache.enable=0', file_get_contents(OpcacheSwitch::file()));

        // ทำซ้ำไม่เพิ่มบรรทัดซ้ำ
        $this->artisan('devtrin:opcache off')->assertExitCode(0);
        $this->assertSame(1, substr_count(file_get_contents(OpcacheSwitch::file()), 'opcache.enable'));

        $this->artisan('devtrin:opcache on')->assertExitCode(0);
        $this->assertFalse(OpcacheSwitch::disabledByFile());
        $this->assertFileDoesNotExist(OpcacheSwitch::file());
    }

    public function test_enable_keeps_other_settings_in_user_ini(): void
    {
        file_put_contents(OpcacheSwitch::file(), "upload_max_filesize=32M\n");
        OpcacheSwitch::disable();
        OpcacheSwitch::enable();
        $this->assertSame("upload_max_filesize=32M\n", file_get_contents(OpcacheSwitch::file()));
    }

    public function test_doctor_reports_pending_switch(): void
    {
        OpcacheSwitch::disable();
        $check = collect(app(\App\Services\Doctor::class)->run())->firstWhere('name', 'OPcache');
        // CLI ไม่มี OPcache → ถือว่าปิดแล้ว (เขียว) · บนเว็บที่ OPcache ยังทำงาน = รอ PHP อ่านค่า (เหลือง)
        $this->assertContains($check['status'], ['ok', 'warn']);
        $this->assertStringContainsString('.user.ini', $check['detail']);
    }

    public function test_invalid_state_is_rejected(): void
    {
        $this->artisan('devtrin:opcache maybe')->assertExitCode(1);
    }
}
