<?php

use App\Http\Middleware\EnsureMaintenanceAccess;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\HandleInertiaRequests;
use App\Support\MaintenanceSwitch;
use App\Support\OpcacheHeal;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // cookie กันวนของการกู้คืน OPcache — อ่านได้แม้ระบบเข้ารหัสพังอยู่
        $middleware->encryptCookies(except: [OpcacheHeal::COOKIE]);

        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
            'maintenance.access' => EnsureMaintenanceAccess::class,
        ]);

        // shared host / Cloudflare ส่ง request ผ่าน proxy — ต้องเชื่อ X-Forwarded-* ถึงจะรู้ว่าเป็น https
        $middleware->trustProxies(at: '*');
        $middleware->redirectUsersTo(fn () => route('admin.dashboard'));

        // หน้า doctor ต้องเข้าได้แม้เปิด maintenance mode อยู่
        $middleware->preventRequestsDuringMaintenance(except: MaintenanceSwitch::EXCEPT);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // OPcache ของ host เสีย (ชื่อเมธอด/ไฟล์เพี้ยน, null byte) → ล้างเองแล้วลองใหม่ ไม่ต้องรอกด recover.php
        $exceptions->report(function (Throwable $e) {
            if (OpcacheHeal::looksCorrupted($e)) {
                OpcacheHeal::reset($e);
            }
        });
        $exceptions->render(fn (Throwable $e, Request $request) => OpcacheHeal::response($e, $request));
    })->create();
