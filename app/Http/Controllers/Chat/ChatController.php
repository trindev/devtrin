<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Support\ChatNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * แชทฝั่งผู้เข้าชม (ปุ่มลอยบนหน้าเว็บ) — JSON, ดึงข้อความใหม่แบบ polling (แบบเดียวกับ staycoolv3: shared host ไม่มี websocket)
 */
class ChatController extends Controller
{
    /** ข้อความใหม่หลัง id ที่มีแล้ว — open=1 (หน้าต่างแชทเปิดอยู่) = อ่านแล้ว */
    public function index(Request $request): JsonResponse
    {
        $conversation = $request->user()->conversation;
        $after = max(0, $request->integer('after'));
        $messages = $conversation
            ? $conversation->messages()->with('sender:id,name')->where('id', '>', $after)->orderByDesc('id')->limit(100)->get()->reverse()->values()
            : collect();

        if ($conversation && $request->boolean('open') && $conversation->user_unread > 0) {
            $conversation->update(['user_unread' => 0]);
        }

        return response()->json([
            'messages' => $messages->map->toChat(),
            'unread' => $request->boolean('open') ? 0 : (int) ($conversation?->user_unread ?? 0),
        ])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request): JsonResponse
    {
        $body = trim((string) $request->validate(['body' => ['required', 'string', 'max:2000']])['body']);
        abort_if($body === '', 422);
        $user = $request->user();

        [$conversation, $message] = DB::transaction(function () use ($user, $body) {
            $conversation = Conversation::firstOrCreate(['user_id' => $user->id]);
            $message = $conversation->messages()->create(['user_id' => $user->id, 'from_admin' => false, 'body' => $body]);
            $conversation->forceFill(['last_message_at' => now(), 'admin_unread' => $conversation->admin_unread + 1, 'user_unread' => 0])->save();

            return [$conversation, $message];
        });
        ChatNotifier::toAdmins($conversation->setRelation('user', $user), $message);

        return response()->json(['message' => $message->toChat()], 201);
    }
}
