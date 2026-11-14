<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Support\ChatImage;
use App\Support\ChatNotifier;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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
        [$body, $image] = self::validated($request, 2000);
        $user = $request->user();

        [$conversation, $message] = DB::transaction(function () use ($user, $body, $image) {
            $conversation = Conversation::firstOrCreate(['user_id' => $user->id]);
            $message = $conversation->messages()->create(['user_id' => $user->id, 'from_admin' => false, 'body' => $body, 'image_path' => $image]);
            $conversation->forceFill(['last_message_at' => now(), 'admin_unread' => $conversation->admin_unread + 1, 'user_unread' => 0])->save();

            return [$conversation, $message];
        });
        ChatNotifier::toAdmins($conversation->setRelation('user', $user), $message);

        return response()->json(['message' => $message->toChat()], 201);
    }

    /** รูปแนบ — เปิดได้เฉพาะเจ้าของห้องและ admin */
    public function image(Request $request, Message $message): BinaryFileResponse
    {
        $user = $request->user();
        abort_unless($message->image_path && ($user->is_admin || $message->conversation->user_id === $user->id), 404);
        $file = ChatImage::absolute($message->image_path);
        abort_unless(is_file($file), 404);

        return response()->file($file, ['Cache-Control' => 'private, max-age=31536000, immutable', 'X-Content-Type-Options' => 'nosniff']);
    }

    /**
     * ข้อความ + รูป (อย่างน้อยหนึ่งอย่าง) — ใช้ร่วมกับฝั่ง admin
     *
     * @return array{0: string, 1: ?string} [ข้อความ, path ของรูป]
     */
    public static function validated(Request $request, int $max): array
    {
        $data = $request->validate([
            'body' => ['nullable', 'string', "max:{$max}", 'required_without:image'],
            'image' => ['nullable', ...Media::IMAGE_RULE],
        ], ['body.required_without' => 'พิมพ์ข้อความหรือแนบรูป'], ['image' => 'รูป']);
        $body = trim((string) ($data['body'] ?? ''));
        if ($body === '' && ! $request->hasFile('image')) {
            throw ValidationException::withMessages(['body' => 'พิมพ์ข้อความหรือแนบรูป']);
        }

        return [$body, $request->hasFile('image') ? ChatImage::store($request->file('image')) : null];
    }
}
