<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirect;

/** ผู้เข้าชมเข้าสู่ระบบด้วย Google เพื่อแชทกับทีมงาน (ดัดแปลงจาก lawquest-web) */
class GoogleAuthController extends Controller
{
    public static function enabled(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    public function redirect(Request $request): RedirectResponse|SymfonyRedirect
    {
        // กลับมาหน้าเดิมแล้วเปิดแชทให้ — รับเฉพาะ path ในเว็บเรา
        $return = (string) $request->query('return', '/');
        $request->session()->put('url.intended', url(str_starts_with($return, '/') && ! str_starts_with($return, '//') ? $return : '/'));
        if (! self::enabled()) {
            return redirect('/')->with('error', 'ยังไม่ได้เปิดใช้การเข้าสู่ระบบด้วย Google');
        }

        return Socialite::driver('google')->redirect();
    }

    /** ผู้ใช้ใหม่ → สร้างบัญชี · อีเมลตรงกับบัญชีเดิม (รวม admin) → ผูก Google เข้ากับบัญชีนั้น */
    public function callback(): RedirectResponse
    {
        try {
            $google = Socialite::driver('google')->user();
        } catch (\Throwable $e) {
            Log::warning('Google login failed', ['error' => $e->getMessage()]);

            return redirect('/')->with('error', 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่');
        }

        if (blank($google->getEmail()) || ! data_get($google->user, 'email_verified', false)) {
            return redirect('/')->with('error', 'บัญชี Google นี้ยังไม่ได้ยืนยันอีเมล');
        }

        $email = Str::lower($google->getEmail());
        $user = User::where('google_id', $google->getId())->first() ?? User::where('email', $email)->first();

        if ($user) {
            $user->forceFill(['google_id' => $google->getId(), 'avatar' => $google->getAvatar(), 'email_verified_at' => $user->email_verified_at ?? now()])->save();
        } else {
            $user = User::forceCreate([
                'name' => $google->getName() ?: Str::before($email, '@'),
                'email' => $email,
                'google_id' => $google->getId(),
                'avatar' => $google->getAvatar(),
                'email_verified_at' => now(),
                'password' => Str::password(40), // ไม่มีรหัสผ่าน — เข้าได้ทาง Google เท่านั้น
            ]);
        }

        Auth::login($user, remember: true);
        request()->session()->regenerate();

        return redirect()->intended('/');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return back();
    }
}
