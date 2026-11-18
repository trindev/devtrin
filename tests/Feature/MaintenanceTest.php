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

    public function test_maintenance_page_preview_renders_for_admin(): void
    {
        $admin = User::factory()->create();
        $admin->is_admin = true;
        $admin->save();

        $this->actingAs($admin)->get('/_maintenance/preview')->assertOk()->assertSee('Maintenance')->assertSee('คาดว่ากลับมา');
    }

    public function test_admin_login_stays_reachable_and_grants_bypass_while_site_is_down(): void
    {
        $admin = User::factory()->create(['password' => 'secret-password-1']);
        $admin->is_admin = true;
        $admin->save();

        \App\Support\MaintenanceSwitch::down('bypass-secret', 600);
        try {
            $this->get('/')->assertStatus(503);                 // ผู้เข้าชม: หน้า home ปิด
            $this->get('/projects/anything')->assertStatus(503);
            $this->get('/admin/login')->assertOk();              // admin ยัง login ได้
            $this->post('/admin/login', ['email' => $admin->email, 'password' => 'secret-password-1'])->assertRedirect('/bypass-secret');
            $this->assertStringContainsString('ดีกว่าเดิม', app()->maintenanceMode()->data()['template']);
        } finally {
            \App\Support\MaintenanceSwitch::up();
        }
        $this->get('/')->assertOk();
    }
}
