<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\MediaController;
use App\Support\AppVersion;
use Illuminate\Support\Facades\Route;

// ── หน้าบ้าน ──────────────────────────────────────────────
Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/projects/{project}', [HomeController::class, 'show'])->name('projects.show');
Route::get('/media/{path}', MediaController::class)->where('path', '.*')->name('media');
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
