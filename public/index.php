<?php

use App\Support\BootGuard;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// ด่านกู้คืน OPcache ก่อน Laravel บูต — ต้องมาก่อน autoload ของ Composer (ดูคำอธิบายในไฟล์)
// ไม่มีไฟล์ (เช่น ติดตั้งค้างครึ่งทาง) → ทำงานแบบเดิม ไม่ให้ตัวกันเองกลายเป็นต้นเหตุเว็บล่ม
$guarded = is_file($guard = __DIR__.'/../app/Support/BootGuard.php') && (require_once $guard);
if ($guarded) {
    BootGuard::arm(dirname(__DIR__));
}

// Determine if the application is in maintenance mode...
// หน้า /_maintenance (รวมขั้นจบการอัปเดต), /app-version และ /admin/login ข้ามหน้า 503 สำเร็จรูป ให้ Laravel ตัดสินเอง
// (ไฟล์ down ที่เวอร์ชันเก่าเขียนไว้อาจไม่มี except — ดู App\Support\MaintenanceSwitch::EXCEPT)
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$bypass = $path === '/_maintenance' || str_starts_with($path, '/_maintenance/') || $path === '/app-version' || $path === '/admin/login';
if (! $bypass && file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

try {
    // Register the Composer autoloader...
    require __DIR__.'/../vendor/autoload.php';

    // Bootstrap Laravel and handle the request...
    $app = require_once __DIR__.'/../bootstrap/app.php';
    if ($guarded) {
        BootGuard::watch($app);
    }
    $app->handleRequest(Request::capture());
} catch (Throwable $e) {
    $guarded ? BootGuard::caught($e) : throw $e;
}
