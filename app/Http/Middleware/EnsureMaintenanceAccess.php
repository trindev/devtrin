<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * /_maintenance เข้าได้ 2 แบบ:
 * - admin ที่ login อยู่ (ดู + สั่งงาน)
 * - MAINTENANCE_TOKEN ผ่าน header X-Maintenance-Token หรือ ?token= (ดูอย่างเดียว สำหรับ uptime monitor)
 * ยังไม่ login → ไปหน้า login แล้วกลับมาที่นี่ / login แล้วแต่ไม่ใช่ admin → 404
 */
class EnsureMaintenanceAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->is_admin) {
            return $next($request);
        }

        $expected = (string) config('services.maintenance.token');
        $given = (string) ($request->header('X-Maintenance-Token') ?? $request->query('token', ''));
        if ($request->isMethod('GET') && $expected !== '' && hash_equals($expected, $given)) {
            return $next($request);
        }

        if (! $request->user() && $request->isMethod('GET') && ! $request->wantsJson()) {
            return redirect()->guest(route('admin.login'));
        }

        abort(404);
    }
}
