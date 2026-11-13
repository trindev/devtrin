<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MaintenanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_doctor_page_requires_admin_or_token(): void
    {
        $this->get('/_maintenance')->assertRedirect('/admin/login');
        $this->actingAs(User::factory()->create())->get('/_maintenance')->assertNotFound();

        config(['services.maintenance.token' => 'secret-token']);
        $this->getJson('/_maintenance?token=secret-token&format=json')->assertJsonStructure(['status', 'checks']);
        $this->getJson('/_maintenance?token=wrong&format=json')->assertNotFound();
    }

    public function test_admin_sees_doctor_page(): void
    {
        $admin = User::factory()->create();
        $admin->is_admin = true;
        $admin->save();

        $this->actingAs($admin)->get('/_maintenance')->assertOk()->assertSee('ศูนย์ดูแลระบบ');
    }

    public function test_deep_check_reports_offline_projects(): void
    {
        Http::fake(['https://up.test' => Http::response('ok'), 'https://down.test' => Http::response('', 502)]);
        \App\Models\Project::create(['title' => 'Up', 'url' => 'https://up.test']);
        \App\Models\Project::create(['title' => 'Down', 'url' => 'https://down.test']);

        $checks = collect(app(\App\Services\Doctor::class)->run(deep: true))->where('group', 'โปรเจกต์ออนไลน์')->keyBy('name');

        $this->assertSame('ok', $checks['Up']['status']);
        $this->assertSame('fail', $checks['Down']['status']);
    }

    public function test_doctor_command_runs(): void
    {
        // ไม่มี admin = รายการ fail → exit code 1 (ใช้ใน script หลัง deploy)
        $this->artisan('devtrin:doctor')->expectsOutputToContain('สรุป: FAIL')->assertExitCode(1);
    }
}
