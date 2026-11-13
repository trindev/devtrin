<?php

namespace App\Http\Controllers;

use App\Services\WebPush;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** เปิด/ปิดรับแจ้งเตือน (Web Push) บนเครื่องนี้ — ใช้ทั้งผู้เข้าชม (ตอบแชท) และ admin (แชทใหม่) */
class PushController extends Controller
{
    public function subscribe(Request $request, WebPush $push): JsonResponse
    {
        abort_unless($push->configured(), 404);
        $data = $request->validate([
            'endpoint' => ['required', 'url', 'max:1000'],
            'keys.p256dh' => ['required', 'string', 'max:200'],
            'keys.auth' => ['required', 'string', 'max:100'],
            'contentEncoding' => ['nullable', 'in:aesgcm,aes128gcm'],
        ]);
        $push->subscribe($request->user(), $data, $request->userAgent());

        return response()->json(['ok' => true]);
    }

    public function unsubscribe(Request $request, WebPush $push): JsonResponse
    {
        $push->unsubscribe($request->user(), (string) $request->validate(['endpoint' => ['required', 'string', 'max:1000']])['endpoint']);

        return response()->json(['ok' => true]);
    }

    /** ส่งทดสอบไปทุกเครื่องของตัวเอง */
    public function test(Request $request, WebPush $push): JsonResponse
    {
        $sent = $push->send([$request->user()], ['title' => 'ทดสอบแจ้งเตือน', 'body' => 'ถ้าเห็นข้อความนี้ แปลว่าเครื่องนี้รับแจ้งเตือนได้แล้ว', 'url' => $request->user()->is_admin ? '/admin' : '/', 'tag' => 'test']);

        return response()->json(['sent' => $sent]);
    }
}
