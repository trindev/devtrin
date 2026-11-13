<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Auth\GoogleAuthController;
use App\Models\Conversation;
use App\Models\Setting;
use App\Services\WebPush;
use App\Support\AppVersion;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    /**
     * JSON ของ Inertia (ตอนเปลี่ยนหน้าแบบไม่รีโหลด) ห้ามให้เบราว์เซอร์/host เก็บ cache — ไม่งั้นกด back แล้ว
     * เบราว์เซอร์หยิบ JSON มาแสดงแทนหน้าเว็บ (host ที่บีบอัด gzip มักเขียนทับ Vary: X-Inertia) — แก้แบบเดียวกับ staycoolv3
     */
    public function handle(Request $request, \Closure $next)
    {
        $response = parent::handle($request, $next);
        $response->headers->set('Vary', 'X-Inertia, Accept-Encoding');
        if ($request->header('X-Inertia')) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, private');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');
        }

        return $response;
    }

    /** เวอร์ชัน asset = hash ของ manifest — deploy ใหม่แล้วหน้าเก่าที่เปิดค้างจะรีโหลดเอง */
    public function version(Request $request): ?string
    {
        $manifest = public_path('build/manifest.json');

        return is_file($manifest) ? md5_file($manifest) : null;
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'avatar' => $user->avatar, 'is_admin' => $user->is_admin] : null,
            ],
            'google' => GoogleAuthController::enabled(),
            // คีย์สาธารณะสำหรับสมัครรับ push — เฉพาะคนที่ login (ผู้เข้าชมแชท / admin)
            'push' => fn () => $user ? app(WebPush::class)->publicKey() : null,
            'adminBadges' => fn () => $user?->is_admin ? ['chat' => (int) Conversation::sum('admin_unread')] : null,
            'site' => fn () => Setting::values(),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'app' => ['version' => AppVersion::version()],
        ];
    }
}
