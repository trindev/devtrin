<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\VAPID;
use Minishlink\WebPush\WebPush as Sender;

/**
 * Web Push (VAPID) — ส่งแจ้งเตือนถึงเครื่องที่ผู้ใช้กดเปิดรับไว้ (ดัดแปลงจาก lawquest-web)
 * คีย์: ใช้ VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ใน .env ถ้ามี ไม่งั้นสร้างเองครั้งแรกแล้วเก็บเข้ารหัสด้วย APP_KEY ในตาราง settings
 */
class WebPush
{
    private const SETTING = '_vapid_keys';

    private ?array $keys = null;

    /** @return array{publicKey: string, privateKey: string}|null */
    public function keys(bool $create = false): ?array
    {
        if ($this->keys) {
            return $this->keys;
        }
        if (filled(config('services.webpush.public_key')) && filled(config('services.webpush.private_key'))) {
            return $this->keys = ['publicKey' => config('services.webpush.public_key'), 'privateKey' => config('services.webpush.private_key')];
        }
        $stored = Setting::find(self::SETTING)?->value;
        if ($stored) {
            $keys = rescue(fn () => json_decode(Crypt::decryptString($stored), true), null, false);
            if (is_array($keys)) {
                return $this->keys = $keys;
            }
        }
        if (! $create) {
            return null;
        }
        $keys = VAPID::createVapidKeys();
        Setting::updateOrCreate(['key' => self::SETTING], ['value' => Crypt::encryptString(json_encode($keys))]);

        return $this->keys = $keys;
    }

    public function configured(): bool
    {
        return $this->keys() !== null;
    }

    /** คีย์สาธารณะที่เบราว์เซอร์ใช้สมัครรับ — สร้างคีย์ให้ถ้ายังไม่มี (null ถ้า server สร้างไม่ได้) */
    public function publicKey(): ?string
    {
        return rescue(fn () => $this->keys(create: true)['publicKey'] ?? null, null);
    }

    public function subscribe(User $user, array $sub, ?string $userAgent): PushSubscription
    {
        return PushSubscription::updateOrCreate(
            ['endpoint_hash' => hash('sha256', $sub['endpoint'])],
            [
                'user_id' => $user->id, 'endpoint' => $sub['endpoint'],
                'public_key' => $sub['keys']['p256dh'], 'auth_token' => $sub['keys']['auth'],
                'content_encoding' => $sub['contentEncoding'] ?? 'aes128gcm',
                'user_agent' => $userAgent ? mb_substr($userAgent, 0, 255) : null,
            ],
        );
    }

    public function unsubscribe(User $user, string $endpoint): void
    {
        PushSubscription::where('user_id', $user->id)->where('endpoint_hash', hash('sha256', $endpoint))->delete();
    }

    /**
     * ส่งถึงทุกเครื่องของผู้ใช้ — เครื่องที่ยกเลิกไปแล้ว (404/410) ลบทิ้ง
     *
     * @param  iterable<User|int>  $users
     * @param  array{title: string, body: string, url: string, tag?: string}  $payload
     * @return int จำนวนที่ส่งสำเร็จ
     */
    public function send(iterable $users, array $payload): int
    {
        $keys = $this->keys();
        if (! $keys) {
            return 0;
        }
        $ids = collect($users)->map(fn ($u) => $u instanceof User ? $u->id : (int) $u)->all();
        $subs = PushSubscription::whereIn('user_id', $ids)->get();
        if ($subs->isEmpty()) {
            return 0;
        }

        $sender = new Sender(['VAPID' => [
            'subject' => config('services.webpush.subject') ?: config('app.url'),
            'publicKey' => $keys['publicKey'],
            'privateKey' => $keys['privateKey'],
        ]], ['TTL' => 86400, 'urgency' => 'high'], 20);

        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        foreach ($subs as $s) {
            $sender->queueNotification(Subscription::create([
                'endpoint' => $s->endpoint, 'publicKey' => $s->public_key, 'authToken' => $s->auth_token, 'contentEncoding' => $s->content_encoding,
            ]), $json);
        }

        $sent = 0;
        foreach ($sender->flush() as $report) {
            if ($report->isSuccess()) {
                $sent++;
            } elseif ($report->isSubscriptionExpired()) {
                PushSubscription::where('endpoint_hash', hash('sha256', $report->getEndpoint()))->delete();
            }
        }

        return $sent;
    }
}
