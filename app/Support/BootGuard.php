<?php

namespace App\Support;

use Throwable;

/**
 * ด่านกู้คืนชั้นนอกสุด — ทำงาน "ก่อน" Laravel บูต
 *
 * OpcacheHeal ทำงานได้ก็ต่อเมื่อ Laravel บูตขึ้นแล้ว แต่ถ้า OPcache ของ host เสียตรงไฟล์ที่โหลดตอนบูต
 * (autoload ของ Composer, bootstrap/app.php, service provider) Laravel ไม่ทันตั้งตัวดัก error — หน้าเว็บพังทุกหน้า,
 * laravel.log ว่าง, ต้องรอคนกด recover.php (พบบน PRD เช้า 2026-11-11)
 *
 * public/index.php require ไฟล์นี้ตรง ๆ ก่อน autoload ของ Composer จึงห้ามใช้คลาสอื่นหรือ helper ของ Laravel ในไฟล์นี้
 * - error ร้ายแรง/exception ที่หลุดออกมาระหว่างบูต → ล้าง OPcache (ไม่เกินครั้งละนาที ใช้ไฟล์บันทึกเดียวกับ OpcacheHeal)
 * - GET → redirect กลับ URL เดิมหนึ่งครั้ง (cookie เดียวกับ OpcacheHeal กันวน) · ลองแล้วยังพังหรือไม่ใช่ GET → ปล่อยให้ PHP/Laravel จัดการตามปกติ
 * - บูตเสร็จแล้ว → ไม่ยุ่ง ให้ตัวดัก error ของ Laravel + OpcacheHeal ทำงานตามเดิม
 */
final class BootGuard
{
    public const COOLDOWN = 60;

    public const COOKIE = 'dt_healed';

    private const FATAL = E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR | E_USER_ERROR | E_RECOVERABLE_ERROR;

    /** @var (callable(): bool)|null แทนที่ opcache_reset ใน test */
    public static $resetter = null;

    private static string $base = '';

    private static ?object $app = null;

    private static bool $handled = false;

    public static function arm(string $base): void
    {
        self::$base = $base;
        self::$app = null;
        self::$handled = false;
        register_shutdown_function([self::class, 'shutdown']);
    }

    /** ส่งต่อ Application ที่ bootstrap/app.php คืนมา — ใช้ดูว่าบูตเสร็จหรือยัง */
    public static function watch(object $app): object
    {
        self::$app = $app;

        return $app;
    }

    public static function booted(): bool
    {
        return self::$app !== null && method_exists(self::$app, 'hasBeenBootstrapped') && self::$app->hasBeenBootstrapped();
    }

    /** exception ที่หลุดออกมาถึง index.php */
    public static function caught(Throwable $e): void
    {
        if (! self::booted() && self::recover($e->getMessage())) {
            exit;
        }

        throw $e;
    }

    /** error ร้ายแรงที่ try/catch จับไม่ได้ เช่น "Failed opening required" */
    public static function shutdown(): void
    {
        $error = error_get_last();
        if (self::$handled || ! $error || ! ($error['type'] & self::FATAL) || self::booted()) {
            return;
        }
        if (self::recover($error['message'])) {
            exit; // ไม่ให้ตัวดักของ Laravel (ถ้าลงทะเบียนไว้แล้ว) เขียนหน้า 500 ทับ redirect
        }
    }

    /** ปลายทาง redirect — path เดิมในเว็บเราเท่านั้น ("//host" จะกลายเป็นลิงก์ออกนอกเว็บ) */
    public static function location(string $uri): string
    {
        return '/'.ltrim($uri, '/\\');
    }

    /** คืน true เมื่อส่ง redirect ไปแล้ว */
    private static function recover(string $message): bool
    {
        self::$handled = true;
        self::reset($message);

        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET' || isset($_COOKIE[self::COOKIE]) || headers_sent()) {
            return false;
        }

        while (ob_get_level() > 0) {
            @ob_end_clean();
        }
        $secure = ($_SERVER['HTTPS'] ?? '') !== '' && strtolower((string) $_SERVER['HTTPS']) !== 'off';
        setcookie(self::COOKIE, '1', ['expires' => time() + self::COOLDOWN, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
        header('Cache-Control: no-store');
        header('Location: '.self::location((string) ($_SERVER['REQUEST_URI'] ?? '/')), true, 302);

        return true;
    }

    private static function reset(string $message): void
    {
        $file = self::$base.'/storage/framework/opcache-heal.json';
        $state = json_decode((string) @file_get_contents($file), true);
        $state = is_array($state) ? $state : [];
        if (($state['at'] ?? 0) > time() - self::COOLDOWN) {
            return;
        }

        $resetter = self::$resetter ?? fn () => function_exists('opcache_reset') && @opcache_reset();
        $ok = (bool) $resetter();
        $message = str_replace("\0", '\0', substr($message, 0, 300));
        @error_log('Devtrin BootGuard: reset OPcache '.($ok ? 'ok' : 'failed').' after: '.$message);

        if (is_dir(dirname($file))) {
            @file_put_contents($file, json_encode([
                'at' => time(),
                'count' => ($state['count'] ?? 0) + 1,
                'ok' => $ok,
                'source' => 'boot',
                'error' => $message,
            ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), LOCK_EX);
        }
    }
}
