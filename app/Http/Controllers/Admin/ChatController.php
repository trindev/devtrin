<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Support\ChatNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** กล่องแชทของทีมงาน — รายการห้อง + ข้อความดึงแบบ polling จากหน้า React */
class ChatController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Chat', [
            'conversations' => $this->conversations(),
            'selected' => $request->integer('c') ?: null,
        ]);
    }

    /** รายการห้อง (polling) */
    public function list(): JsonResponse
    {
        return response()->json(['conversations' => $this->conversations()])->header('Cache-Control', 'no-store');
    }

    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        $after = max(0, $request->integer('after'));
        $messages = $conversation->messages()->with('sender:id,name')->where('id', '>', $after)->orderByDesc('id')->limit(200)->get()->reverse()->values();
        if ($conversation->admin_unread > 0) {
            $conversation->update(['admin_unread' => 0]);
        }

        return response()->json(['messages' => $messages->map->toChat()])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $body = trim((string) $request->validate(['body' => ['required', 'string', 'max:4000']])['body']);
        abort_if($body === '', 422);

        $message = DB::transaction(function () use ($request, $conversation, $body) {
            $message = $conversation->messages()->create(['user_id' => $request->user()->id, 'from_admin' => true, 'body' => $body]);
            $conversation->forceFill(['last_message_at' => now(), 'admin_unread' => 0, 'user_unread' => $conversation->user_unread + 1])->save();

            return $message;
        });
        ChatNotifier::toVisitor($conversation, $message);

        return response()->json(['message' => $message->setRelation('sender', $request->user())->toChat()], 201);
    }

    public function destroy(Conversation $conversation): RedirectResponse
    {
        $conversation->delete();

        return redirect()->route('admin.chat.index')->with('success', 'ลบห้องแชทแล้ว');
    }

    private function conversations(): array
    {
        return Conversation::with(['user:id,name,email,avatar', 'latestMessage'])
            ->whereNotNull('last_message_at')->orderByDesc('last_message_at')->limit(200)->get()
            ->map(fn (Conversation $c) => [
                'id' => $c->id,
                'name' => $c->user?->name ?? 'ผู้ใช้ที่ถูกลบ',
                'email' => $c->user?->email,
                'avatar' => $c->user?->avatar,
                'unread' => $c->admin_unread,
                'last' => $c->latestMessage ? ['body' => $c->latestMessage->body, 'from_admin' => $c->latestMessage->from_admin] : null,
                'at' => $c->last_message_at?->toIso8601String(),
            ])->all();
    }
}
