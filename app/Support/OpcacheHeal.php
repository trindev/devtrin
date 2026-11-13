<?php

namespace App\Support;

use BadMethodCallException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * กู้คืนอัตโนมัติเมื่อ OPcache ของ host เสีย
 *
 * อาการบน shared host: ข้อความในหน่วยความจำเพี้ยนไปทีละตัวอักษร ทั้งที่ไฟล์บนดิสก์ถูกต้อง เช่น
 * "compileLimi" (ควรเป็น compileLimit), "Repository.mhp", path ที่มี null byte — ทุก request พังจนต้องกด recover.php
 * ตัวนี้จับ error ลักษณะนั้น ล้าง OPcache (ไม่เกินครั้งละนาที) แล้วให้ request ลองใหม่หนึ่งครั้ง
 *
 * ตั้งใจไม่พึ่ง view/cache/DB/session เพราะตอนนั้นส่วนเหล่านั้นอาจพังอยู่ด้วย — ใช้ไฟล์ธรรมดาใน storage
 */
class OpcacheHeal
{
    /** ล้างได้ไม่เกินครั้งละเท่านี้วินาที กันวนล้างทุก request ถ้าต้นเหตุไม่ใช่ OPcache */
    public const COOLDOWN = 60;

    /** cookie กันการ redirect วน — ถ้าลองใหม่แล้วยังพัง ให้แสดงหน้าแจ้งแทน (ใช้ร่วมกับ BootGuard ที่ทำงานก่อนบูต) */
    public const COOKIE = BootGuard::COOKIE;

    /** @var (callable(): bool)|null แทนที่ opcache_reset ใน test */
    public static $resetter = null;

    public static function file(): string
    {
        return storage_path('framework/opcache-heal.json');
    }

    public static function looksCorrupted(Throwable $e): bool
    {
        for ($x = $e; $x; $x = $x->getPrevious()) {
            if (self::matches($x)) {
                return true;
            }
        }

        return false;
    }

    private static function matches(Throwable $e): bool
    {
        $msg = $e->getMessage();

        if (str_contains($msg, 'must not contain any null bytes')) {
            return true;
        }

        // SQL ที่ framework สร้างผิดไวยากรณ์ เช่น "expiration := ?" (ควรเป็น <=) — โค้ดเราผ่าน test แล้ว จึงมาจากหน่วยความจำเพี้ยน
        if (str_contains($msg, '1064') && str_contains($msg, 'error in your SQL syntax')) {
            return true;
        }

        // เมธอดที่ไม่มีอยู่ แต่ต่างจากเมธอดจริงของคลาสเดียวกันแค่ตัวอักษรเดียว → ชื่อในหน่วยความจำเพี้ยน
        if ($e instanceof BadMethodCallException
            && preg_match('/^(?:Call to undefined method |Method )([\w\\\\]+)::(\w+)(?:\(\))? does not exist/', $msg, $m)
            && class_exists($m[1])) {
            // รวมเมธอด protected/private ด้วย (compileLimit เป็น protected) — get_class_methods เห็นแค่ public
            foreach ((new \ReflectionClass($m[1]))->getMethods() as $method) {
                $real = $method->getName();
                if ($real !== $m[2] && levenshtein(strtolower($real), strtolower($m[2])) === 1) {
                    return true;
                }
            }
        }

        // include ไฟล์ไม่ได้ แต่ไฟล์นั้นมีอยู่จริง หรือนามสกุลเพี้ยนจาก .php ไปตัวเดียว
        if (preg_match("~Failed opening '([^']+)'|(?:include|require)(?:_once)?\\((/[^)]+)\\)~", $msg, $m)) {
            $path = ($m[2] ?? '') ?: $m[1];
            if (is_file($path)) {
                return true;
            }
            if (! str_ends_with($path, '.php') && is_file(substr($path, 0, -4).'.php')) {
                return true;
            }
            // ไฟล์จริงแต่มีขยะต่อท้ายชื่อ เช่น "Console/Command.php\xEF\xBF\xBD..." (พบบน PRD 2026-11-11 ตอน cron เรียก queue:work)
            if (preg_match('~^(.+?\.php)(.+)$~s', $path, $p) && is_file($p[1]) && ! preg_match('~^[\w./-]+$~', $p[2])) {
                return true;
            }
        }

        return false;
    }

    /** ล้าง OPcache ถ้าพ้นช่วงพักแล้ว — คืน true เมื่อล้างจริงในครั้งนี้ */
    public static function reset(Throwable $e): bool
    {
        $state = self::state();
        if (($state['at'] ?? 0) > time() - self::COOLDOWN) {
            return false;
        }

        $resetter = self::$resetter ?? fn () => function_exists('opcache_reset') && @opcache_reset();
        $ok = (bool) $resetter();

        $dir = dirname(self::file());
        if (is_dir($dir)) {
            @file_put_contents(self::file(), json_encode([
                'at' => time(),
                'count' => ($state['count'] ?? 0) + 1,
                'ok' => $ok,
                'error' => mb_substr(str_replace("\0", '\0', $e->getMessage()), 0, 200),
            ]), LOCK_EX);
        }

        return $ok;
    }

    /** @return array{at?: int, count?: int, ok?: bool, source?: string, error?: string} */
    public static function state(): array
    {
        $raw = @file_get_contents(self::file());

        return $raw ? (json_decode($raw, true) ?: []) : [];
    }

    /**
     * คำตอบแทนหน้า 500 เมื่อเป็นอาการ OPcache เสีย
     * GET → ล้างแล้ว redirect กลับ URL เดิมหนึ่งครั้ง, อย่างอื่น (POST/JSON) → 503 ให้ผู้ใช้กดส่งใหม่
     */
    public static function response(Throwable $e, Request $request): ?Response
    {
        if (! self::looksCorrupted($e)) {
            return null;
        }
        self::reset($e);
        $retried = $request->cookies->has(self::COOKIE);

        if (! $retried && $request->isMethod('GET') && ! $request->expectsJson()) {
            $response = new Response('', 302, ['Location' => $request->fullUrl(), 'Cache-Control' => 'no-store']);
            $response->headers->setCookie(new Cookie(self::COOKIE, '1', time() + self::COOLDOWN, '/', null, $request->isSecure(), true, false, 'lax'));

            return $response;
        }

        $message = $retried
            ? 'ระบบยังขัดข้องอยู่ ผู้ดูแลกำลังตรวจสอบ ลองใหม่อีกครั้งในอีกสักครู่'
            : 'ระบบเพิ่งกู้คืนตัวเอง กรุณากดส่งอีกครั้ง';
        $headers = ['Retry-After' => '5', 'Cache-Control' => 'no-store'];

        if ($request->expectsJson()) {
            return new Response(json_encode(['message' => $message], JSON_UNESCAPED_UNICODE), 503, $headers + ['Content-Type' => 'application/json']);
        }

        $html = '<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            .'<title>ลองใหม่อีกครั้ง - Devtrin</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;'
            .'font:15px/1.6 system-ui,sans-serif;background:#f5f6f8;color:#15171c}@media(prefers-color-scheme:dark){body{background:#0e0f12;color:#eceef2}}'
            .'main{max-width:400px;text-align:center}button{margin-top:20px;height:40px;padding:0 18px;border-radius:10px;border:1px solid #2546c8;background:#2546c8;color:#fff;font:inherit;cursor:pointer}</style></head>'
            .'<body><main><h1 style="font-size:20px;font-weight:600">'.$message.'</h1>'
            .'<button type="button" onclick="history.length>1?history.back():location.reload()">ย้อนกลับไปลองใหม่</button></main></body></html>';

        return new Response($html, 503, $headers + ['Content-Type' => 'text/html; charset=utf-8']);
    }
}
