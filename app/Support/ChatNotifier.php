<?php

namespace App\Support;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\WebPush;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

use function Illuminate\Support\defer;

/**
 * แจ้งเตือนแชทผ่าน Web Push — ส่งหลังตอบกลับผู้ใช้แล้ว (defer) ผู้ส่งไม่ต้องรอ
 * ห้องละไม่เกิน 1 ครั้งต่อ THROTTLE วินาที และใช้ tag เดียวกัน เครื่องจึงแทนที่ข้อความเดิม ไม่กองหลายอัน
 */
class ChatNotifier
{
    public const THROTTLE = 45;

    public static function toAdmins(Conversation $conversation, Message $message): void
    {
        if (! Cache::add("chat:push:admin:{$conversation->id}", 1, self::THROTTLE)) {
            return;
        }
        $name = $conversation->user?->name ?? 'ผู้เข้าชม';
        defer(fn () => rescue(fn () => app(WebPush::class)->send(
            User::where('is_admin', true)->pluck('id'),
            ['title' => "แชทใหม่จาก {$name}", 'body' => Str::limit($message->preview(), 140), 'url' => "/admin/chat?c={$conversation->id}", 'tag' => "chat-{$conversation->id}"],
        ), 0));
    }

    public static function toVisitor(Conversation $conversation, Message $message): void
    {
        if (! Cache::add("chat:push:user:{$conversation->id}", 1, self::THROTTLE)) {
            return;
        }
        defer(fn () => rescue(fn () => app(WebPush::class)->send(
            [$conversation->user_id],
            ['title' => config('app.name').' ตอบกลับแล้ว', 'body' => Str::limit($message->preview(), 140), 'url' => '/?chat=open', 'tag' => 'chat'],
        ), 0));
    }
}
