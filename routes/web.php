<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Chat\ChatController;
use App\Http\Controllers\PushController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\MediaController;
use App\Support\AppVersion;
use Illuminate\Support\Facades\Route;

// ── หน้าบ้าน ──────────────────────────────────────────────
Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/projects/{project}', [HomeController::class, 'show'])->name('projects.show');
Route::get('/media/{path}', MediaController::class)->where('path', '.*')->name('media');
// PWA service worker — เสิร์ฟจาก root (scope /) เนื้อหาเปลี่ยนตามเวอร์ชันเพื่อให้เบราว์เซอร์อัปเดต
Route::get('/sw.js', fn () => response()->view('sw', AppVersion::toArray())
    ->header('Content-Type', 'application/javascript; charset=utf-8')
    ->header('Cache-Control', 'no-cache'))->name('sw');

// ── ผู้เข้าชม: Google login + แชท + push ───────────────────
Route::get('/auth/google', [GoogleAuthController::class, 'redirect'])->middleware('throttle:20,1')->name('auth.google');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->middleware('throttle:20,1')->name('auth.google.callback');
Route::middleware('auth')->group(function () {
    Route::post('/logout', [GoogleAuthController::class, 'logout'])->name('logout');
    Route::get('/chat/messages', [ChatController::class, 'index'])->middleware('throttle:120,1')->name('chat.index');
    Route::post('/chat/messages', [ChatController::class, 'store'])->middleware('throttle:20,1')->name('chat.store');
    Route::get('/chat/image/{message}', [ChatController::class, 'image'])->name('chat.image');
    Route::post('/push/subscribe', [PushController::class, 'subscribe'])->middleware('throttle:20,1')->name('push.subscribe');
    Route::post('/push/unsubscribe', [PushController::class, 'unsubscribe'])->middleware('throttle:20,1')->name('push.unsubscribe');
    Route::post('/push/test', [PushController::class, 'test'])->middleware('throttle:5,1')->name('push.test');
});

Route::get('/app-version', fn () => response()->json(AppVersion::toArray()))->name('app-version');

// ── หลังบ้าน ──────────────────────────────────────────────
Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/login', [Admin\AuthController::class, 'create'])->name('login');
    Route::post('/login', [Admin\AuthController::class, 'store'])->middleware('throttle:20,1')->name('login.store');

    Route::middleware('admin')->group(function () {
        Route::post('/logout', [Admin\AuthController::class, 'destroy'])->name('logout');
        Route::get('/', Admin\DashboardController::class)->name('dashboard');

        Route::post('/projects/covers', [Admin\ProjectController::class, 'covers'])->name('projects.covers');
        Route::post('/projects/reorder', [Admin\ProjectController::class, 'reorder'])->name('projects.reorder');
        Route::patch('/projects/{project}/toggle', [Admin\ProjectController::class, 'toggle'])->name('projects.toggle');
        Route::resource('projects', Admin\ProjectController::class)->except('show');

        Route::get('/chat', [Admin\ChatController::class, 'index'])->name('chat.index');
        Route::get('/chat/list', [Admin\ChatController::class, 'list'])->name('chat.list');
        Route::get('/chat/{conversation}/messages', [Admin\ChatController::class, 'messages'])->name('chat.messages');
        Route::post('/chat/{conversation}/messages', [Admin\ChatController::class, 'store'])->middleware('throttle:60,1')->name('chat.store');
        Route::delete('/chat/{conversation}', [Admin\ChatController::class, 'destroy'])->name('chat.destroy');

        Route::get('/mail', [Admin\MailController::class, 'index'])->name('mail.index');
        Route::post('/mail/test', [Admin\MailController::class, 'test'])->middleware('throttle:5,1')->name('mail.test');
        Route::post('/mail/send', [Admin\MailController::class, 'send'])->middleware('throttle:20,1')->name('mail.send');
        Route::patch('/mail/signature', [Admin\MailController::class, 'signature'])->name('mail.signature');
        Route::post('/mail/delete', [Admin\MailController::class, 'delete'])->middleware('throttle:60,1')->name('mail.delete');
        Route::get('/mail/attachment', [Admin\MailController::class, 'attachment'])->middleware('throttle:60,1')->name('mail.attachment');

        Route::get('/settings', [Admin\SettingController::class, 'edit'])->name('settings.edit');
        Route::put('/settings', [Admin\SettingController::class, 'update'])->name('settings.update');
        Route::get('/account', [Admin\AccountController::class, 'edit'])->name('account.edit');
        Route::put('/account', [Admin\AccountController::class, 'update'])->name('account.update');
    });
});
// ชื่อ route "login" ที่ Laravel ใช้ส่งคนที่ยังไม่ login ไป (รวม /_maintenance)
Route::redirect('/login', '/admin/login')->name('login');

// ── ศูนย์ดูแลระบบ (doctor) — Blade ล้วน เปิดได้แม้ frontend build เสีย ───
Route::middleware('maintenance.access')->prefix('_maintenance')->group(function () {
    Route::get('/', [MaintenanceController::class, 'show'])->name('maintenance.show');
    Route::post('/down', [MaintenanceController::class, 'down'])->name('maintenance.down');
    Route::post('/up', [MaintenanceController::class, 'up'])->name('maintenance.up');
    Route::post('/actions/{action}', [MaintenanceController::class, 'action'])->name('maintenance.action');
    Route::post('/update', [MaintenanceController::class, 'installUpdate'])->name('maintenance.update');
    Route::get('/update/finish', [MaintenanceController::class, 'finishUpdate'])->name('maintenance.update.finish');
});
