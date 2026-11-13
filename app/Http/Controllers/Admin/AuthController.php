<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()?->is_admin) {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('Admin/Login');
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // กันเดารหัสผ่าน: 5 ครั้งต่อนาทีต่ออีเมล+IP
        $key = Str::lower($credentials['email']).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['email' => 'ลองหลายครั้งเกินไป รออีก '.RateLimiter::availableIn($key).' วินาที']);
        }

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            RateLimiter::hit($key);
            throw ValidationException::withMessages(['email' => 'อีเมลหรือรหัสผ่านไม่ถูกต้อง']);
        }
        RateLimiter::clear($key);

        if (! $request->user()->is_admin) {
            Auth::logout();
            throw ValidationException::withMessages(['email' => 'บัญชีนี้ไม่มีสิทธิ์เข้าหลังบ้าน']);
        }
        $request->session()->regenerate();

        return redirect()->intended(route('admin.dashboard'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
