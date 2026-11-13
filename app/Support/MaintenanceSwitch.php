<?php

namespace App\Support;

use Illuminate\Foundation\Events\MaintenanceModeDisabled;
use Illuminate\Foundation\Events\MaintenanceModeEnabled;
use Illuminate\Foundation\Exceptions\RegisterErrorViewPaths;

/**
 * เปิด/ปิด maintenance mode โดยไม่ผ่าน Artisan (ทำแบบเดียวกับ php artisan down/up)
 * ถ้า vendor บน server เสีย Artisan จะบูตไม่ได้ แต่ปุ่มปิดเว็บและปุ่มอัปเดต (ซึ่งเป็นทางซ่อม vendor) ต้องยังใช้ได้
 */
class MaintenanceSwitch
{
    /**
     * path ที่ต้องเข้าได้แม้ปิดเว็บอยู่ (หน้า doctor, ขั้นจบการอัปเดต, เช็กเวอร์ชัน)
     * ต้องใส่ในไฟล์ down ด้วย — storage/framework/maintenance.php ส่งหน้า 503 ก่อน Laravel บูต
     * โดยดูแค่ except ในไฟล์นี้ ไม่ได้ดู except ของ middleware
     */
    public const EXCEPT = ['_maintenance', '_maintenance/*', 'app-version'];

    public static function down(?string $secret = null, ?int $retry = null): void
    {
        (new RegisterErrorViewPaths)();

        app()->maintenanceMode()->activate([
            'except' => self::EXCEPT,
            'redirect' => null,
            'retry' => $retry,
            'refresh' => null,
            'secret' => $secret,
            'status' => 503,
            'template' => view('errors::503', ['retryAfter' => $retry])->render(),
        ]);

        file_put_contents(
            storage_path('framework/maintenance.php'),
            file_get_contents(base_path('vendor/laravel/framework/src/Illuminate/Foundation/Console/stubs/maintenance-mode.stub')),
        );

        event(new MaintenanceModeEnabled);
    }

    public static function up(): void
    {
        app()->maintenanceMode()->deactivate();

        if (is_file(storage_path('framework/maintenance.php'))) {
            unlink(storage_path('framework/maintenance.php'));
        }

        event(new MaintenanceModeDisabled);
    }
}
