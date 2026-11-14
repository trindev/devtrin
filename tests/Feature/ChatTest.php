<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $u = User::factory()->create();
        $u->is_admin = true;
        $u->save();

        return $u;
    }

    public function test_guest_cannot_chat(): void
    {
        $this->getJson('/chat/messages')->assertUnauthorized();
        $this->postJson('/chat/messages', ['body' => 'hi'])->assertUnauthorized();
    }

    public function test_visitor_and_admin_exchange_messages(): void
    {
        $visitor = User::factory()->create();
        $admin = $this->admin();

        $this->actingAs($visitor)->postJson('/chat/messages', ['body' => 'สนใจทำเว็บครับ'])->assertCreated()->assertJsonPath('message.from_admin', false);
        $conversation = Conversation::firstWhere('user_id', $visitor->id);
        $this->assertSame(1, $conversation->admin_unread);

        $this->actingAs($admin)->getJson('/admin/chat/list')->assertJsonPath('conversations.0.unread', 1);
        $this->actingAs($admin)->getJson("/admin/chat/{$conversation->id}/messages")->assertJsonCount(1, 'messages');
        $this->assertSame(0, $conversation->fresh()->admin_unread);

        $reply = $this->actingAs($admin)->postJson("/admin/chat/{$conversation->id}/messages", ['body' => 'ยินดีครับ'])->assertCreated()->json('message');
        $this->assertTrue($reply['from_admin']);

        // ผู้เข้าชม: หน้าต่างปิด = เห็นจำนวนยังไม่อ่าน, เปิด = อ่านแล้ว, after = เฉพาะข้อความใหม่
        $this->actingAs($visitor)->getJson('/chat/messages')->assertJsonPath('unread', 1)->assertJsonCount(2, 'messages');
        $this->actingAs($visitor)->getJson('/chat/messages?open=1&after='.$reply['id'])->assertJsonCount(0, 'messages');
        $this->assertSame(0, $conversation->fresh()->user_unread);
    }

    public function test_visitor_cannot_use_admin_chat(): void
    {
        $visitor = User::factory()->create();
        $other = Conversation::create(['user_id' => User::factory()->create()->id, 'last_message_at' => now()]);

        $this->actingAs($visitor)->getJson("/admin/chat/{$other->id}/messages")->assertForbidden();
        $this->actingAs($visitor)->get('/admin/chat')->assertForbidden();
    }

    public function test_message_validation(): void
    {
        $this->actingAs(User::factory()->create())->postJson('/chat/messages', ['body' => str_repeat('a', 2001)])->assertUnprocessable();
    }

    public function test_push_subscribe_and_vapid_keys_are_generated(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get('/')->assertInertia(fn ($page) => $page->where('push', fn ($key) => is_string($key) && strlen($key) > 40));

        $this->actingAs($user)->postJson('/push/subscribe', [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc',
            'keys' => ['p256dh' => str_repeat('k', 87), 'auth' => str_repeat('a', 22)],
        ])->assertOk();
        $this->assertDatabaseCount('push_subscriptions', 1);

        $this->actingAs($user)->postJson('/push/unsubscribe', ['endpoint' => 'https://fcm.googleapis.com/fcm/send/abc'])->assertOk();
        $this->assertDatabaseCount('push_subscriptions', 0);
    }

    public function test_vapid_private_key_is_never_shared(): void
    {
        $this->actingAs(User::factory()->create())->get('/');
        $this->get('/')->assertDontSee('privateKey')->assertDontSee('_vapid_keys');
    }

    public function test_google_login_redirects_home_when_not_configured(): void
    {
        config(['services.google.client_id' => null]);
        $this->get('/auth/google?return=/projects/x')->assertRedirect('/');
    }

    public function test_google_redirect_rejects_external_return_url(): void
    {
        config(['services.google.client_id' => 'id', 'services.google.client_secret' => 'secret']);
        $this->get('/auth/google?return=//evil.example')->assertRedirect();
        $this->assertSame(url('/'), session('url.intended'));
    }

    public function test_inertia_json_responses_are_never_cached(): void
    {
        $response = $this->get('/', ['X-Inertia' => 'true', 'X-Inertia-Version' => (new \App\Http\Middleware\HandleInertiaRequests)->version(request())]);
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('X-Inertia', $response->headers->get('Vary'));
    }

    public function test_service_worker_is_served(): void
    {
        $this->get('/sw.js')->assertOk()->assertHeader('Content-Type', 'application/javascript; charset=utf-8')->assertSee("addEventListener('push'", false);
    }

    public function test_mail_page_renders_without_imap(): void
    {
        $this->actingAs($this->admin())->get('/admin/mail')->assertOk()->assertInertia(fn ($page) => $page->component('Admin/Mail')->where('inbox_configured', false));
    }

    public function test_image_attachments_are_private_to_the_conversation(): void
    {
        Storage::fake('local');
        $visitor = User::factory()->create();
        $stranger = User::factory()->create();
        $admin = $this->admin();

        // รูปอย่างเดียว ไม่มีข้อความ ก็ส่งได้
        $message = $this->actingAs($visitor)->post('/chat/messages', ['image' => UploadedFile::fake()->image('shot.png', 800, 600)], ['Accept' => 'application/json'])
            ->assertCreated()->json('message');
        $this->assertSame('', $message['body']);
        $this->assertStringStartsWith('/chat/image/', $message['image']);

        $this->actingAs($visitor)->get($message['image'])->assertOk();
        $this->actingAs($admin)->get($message['image'])->assertOk();
        $this->actingAs($stranger)->get($message['image'])->assertNotFound();
        auth()->forgetGuards();
        $this->getJson($message['image'])->assertUnauthorized(); // ยังไม่ login

        // admin ตอบพร้อมรูป + รายการห้องแสดงตัวอย่างเป็น "รูปภาพ"
        $conversation = Conversation::firstWhere('user_id', $visitor->id);
        $this->actingAs($admin)->getJson('/admin/chat/list')->assertJsonPath('conversations.0.last.body', '📷 รูปภาพ');
        $this->actingAs($admin)->post("/admin/chat/{$conversation->id}/messages", ['body' => 'ดูรูปนี้', 'image' => UploadedFile::fake()->image('r.jpg')], ['Accept' => 'application/json'])->assertCreated();

        // ลบห้อง = ลบไฟล์รูปด้วย
        $paths = $conversation->messages()->pluck('image_path')->filter()->values();
        $this->assertCount(2, $paths);
        $this->actingAs($admin)->delete("/admin/chat/{$conversation->id}");
        $paths->each(fn ($p) => Storage::disk('local')->assertMissing($p));
    }

    public function test_message_needs_text_or_image_and_rejects_non_images(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/chat/messages', ['body' => '   '])->assertUnprocessable();
        $this->actingAs($user)->post('/chat/messages', ['image' => UploadedFile::fake()->create('x.php', 5, 'application/x-php')], ['Accept' => 'application/json'])->assertUnprocessable();
    }
}
