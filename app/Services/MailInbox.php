<?php

namespace App\Services;

use App\Support\MailHtml;
use Illuminate\Support\Str;
use Webklex\PHPIMAP\Client;
use Webklex\PHPIMAP\ClientManager;
use Webklex\PHPIMAP\Folder;
use Webklex\PHPIMAP\Message;

/**
 * กล่องอีเมลของระบบผ่าน IMAP (บัญชีเดียวกับที่ใช้ส่ง) สำหรับหน้า /admin/mail — กล่องเข้า ส่งแล้ว ฉบับร่าง ขยะ ถังขยะ
 * อีเมล HTML แสดงหลังกรองด้วย App\Support\MailHtml ใน iframe แบบ sandbox (ไม่มีสคริปต์) — รูปจากเว็บรอผู้ใช้กดแสดง (กันรูปติดตาม)
 */
class MailInbox
{
    /** ชื่อมาตรฐาน → ชื่อโฟลเดอร์ที่พบบ่อยบน Dovecot/Roundcube/Gmail */
    private const SPECIAL = [
        'inbox' => ['INBOX'],
        'sent' => ['Sent', 'INBOX.Sent', 'Sent Messages', 'Sent Items', '[Gmail]/Sent Mail'],
        'drafts' => ['Drafts', 'INBOX.Drafts', '[Gmail]/Drafts'],
        'junk' => ['Junk', 'INBOX.Junk', 'Spam', 'INBOX.spam', '[Gmail]/Spam'],
        'trash' => ['Trash', 'INBOX.Trash', 'Deleted Messages', 'Deleted Items', '[Gmail]/Trash'],
    ];

    public const LABELS = ['inbox' => 'กล่องเข้า', 'sent' => 'ส่งแล้ว', 'drafts' => 'ฉบับร่าง', 'junk' => 'อีเมลขยะ', 'trash' => 'ถังขยะ'];

    public const PER_PAGE = 25;

    public function configured(): bool
    {
        $c = config('mail.imap');

        return filled($c['host']) && filled($c['username']) && filled($c['password']) && ! in_array(config('mail.default'), ['log', 'array'], true);
    }

    private function client(): Client
    {
        $c = config('mail.imap');
        $client = (new ClientManager(['options' => ['fetch_order' => 'desc']]))->make([
            'host' => $c['host'], 'port' => $c['port'], 'encryption' => $c['encryption'] ?: false,
            'validate_cert' => true, 'username' => $c['username'], 'password' => $c['password'],
            'protocol' => 'imap', 'timeout' => 15,
        ]);
        $client->connect();

        return $client;
    }

    /** @template T @param callable(Client): T $fn @return T */
    private function with(callable $fn): mixed
    {
        $client = $this->client();
        try {
            return $fn($client);
        } finally {
            $client->disconnect();
        }
    }

    /** จำนวนที่ยังไม่อ่านในกล่องเข้า — null ถ้าเชื่อมต่อไม่ได้ */
    public function inboxUnread(): ?int
    {
        return rescue(fn () => $this->with(function (Client $client) {
            $status = $client->getFolderByPath('INBOX')?->status() ?? [];

            return (int) ($status['unseen'] ?? 0);
        }), null, false);
    }

    /** โฟลเดอร์ทั้งหมด เรียงกล่องเข้า → ส่งแล้ว → ร่าง → ขยะ → ถังขยะ → อื่นๆ พร้อมจำนวนที่ยังไม่อ่าน */
    public function folders(): array
    {
        return $this->with(function (Client $client) {
            $order = array_keys(self::LABELS);

            return collect($client->getFolders(false))->map(function (Folder $f) use ($order) {
                $kind = $this->kindOf($f->path);
                $status = rescue(fn () => $f->status(), [], false);

                return [
                    'path' => $f->path,
                    'kind' => $kind,
                    'label' => self::LABELS[$kind] ?? $f->name,
                    'unread' => (int) ($status['unseen'] ?? 0),
                    'total' => (int) ($status['messages'] ?? 0),
                    'order' => $kind ? array_search($kind, $order, true) : 99,
                ];
            })->sortBy(['order', 'label'])->values()->map(fn ($f) => collect($f)->except('order')->all())->all();
        });
    }

    /** @return array{messages: list<array>, total: int, page: int, last_page: int} */
    public function list(string $folder = 'INBOX', int $page = 1): array
    {
        return $this->with(function (Client $client) use ($folder, $page) {
            $box = $client->getFolderByPath($folder);
            if (! $box) {
                return ['messages' => [], 'total' => 0, 'page' => 1, 'last_page' => 1];
            }
            $total = (int) ($box->examine()['exists'] ?? 0);
            $messages = $total === 0 ? collect() : $box->messages()->all()->setFetchBody(false)->limit(self::PER_PAGE, max(1, $page))->get();

            return [
                'messages' => $messages->map(fn (Message $m) => $this->summary($m))->values()->all(),
                'total' => $total,
                'page' => max(1, $page),
                'last_page' => max(1, (int) ceil($total / self::PER_PAGE)),
            ];
        });
    }

    public function show(string $folder, int $uid): ?array
    {
        return $this->with(function (Client $client) use ($folder, $uid) {
            $message = $client->getFolderByPath($folder)?->query()->getMessageByUid($uid);
            if (! $message) {
                return null;
            }
            $message->setFlag('Seen');

            return [
                ...$this->summary($message),
                'folder' => $folder,
                'to' => $this->addresses($message->getTo()),
                'cc' => $this->addresses($message->getCc()),
                'body' => $this->text($message),
                'html' => $this->html($message, $folder, $uid),
                'message_id' => (string) $message->getMessageId(),
                'attachments' => $message->getAttachments()->values()->map(fn ($a, $i) => [
                    'index' => $i, 'name' => $this->decode((string) ($a->getName() ?: 'ไฟล์แนบ '.($i + 1))),
                    'size' => (int) $a->size, 'mime' => (string) ($a->getMimeType() ?: 'application/octet-stream'),
                ])->all(),
            ];
        });
    }

    /** @return array{name: string, mime: string, content: string}|null */
    public function attachment(string $folder, int $uid, int $index): ?array
    {
        return $this->with(function (Client $client) use ($folder, $uid, $index) {
            $message = $client->getFolderByPath($folder)?->query()->getMessageByUid($uid);
            $a = $message?->getAttachments()->values()->get($index);
            if (! $a) {
                return null;
            }

            return ['name' => $this->decode((string) ($a->getName() ?: 'attachment')), 'mime' => (string) ($a->getMimeType() ?: 'application/octet-stream'), 'content' => (string) $a->getContent()];
        });
    }

    /** ลบ: ย้ายไปถังขยะ — ถ้าอยู่ในถังขยะอยู่แล้ว ลบถาวร */
    public function delete(string $folder, array $uids): int
    {
        return $this->with(function (Client $client) use ($folder, $uids) {
            $box = $client->getFolderByPath($folder);
            if (! $box) {
                return 0;
            }
            $trash = $this->kindOf($folder) === 'trash' ? null : $this->find($client, 'trash');
            $done = 0;
            foreach ($uids as $uid) {
                $message = $box->query()->getMessageByUid((int) $uid);
                if (! $message) {
                    continue;
                }
                $trash ? $message->move($trash) : $message->delete(false);
                $done++;
            }
            if ($done) {
                $client->expunge();
            }

            return $done;
        });
    }

    /** เก็บสำเนาอีเมลที่ส่งจากหน้า admin ไว้ในโฟลเดอร์ส่งแล้ว (เหมือนโปรแกรมอีเมลทั่วไป) */
    public function saveSent(string $raw): void
    {
        $this->with(function (Client $client) use ($raw) {
            $path = $this->find($client, 'sent');
            if ($path) {
                $client->getFolderByPath($path)?->appendMessage($raw, ['\\Seen']);
            }
        });
    }

    private function find(Client $client, string $kind): ?string
    {
        $paths = collect($client->getFolders(false))->pluck('path');
        foreach (self::SPECIAL[$kind] as $name) {
            if ($found = $paths->first(fn ($p) => strcasecmp($p, $name) === 0)) {
                return $found;
            }
        }

        return null;
    }

    private function kindOf(string $path): ?string
    {
        foreach (self::SPECIAL as $kind => $names) {
            foreach ($names as $name) {
                if (strcasecmp($path, $name) === 0) {
                    return $kind;
                }
            }
        }

        return null;
    }

    private function summary(Message $m): array
    {
        $from = $m->getFrom()->first();

        return [
            'uid' => (int) $m->getUid(),
            'from' => (string) ($from->mail ?? ''),
            'from_name' => trim($this->decode((string) ($from->personal ?? $from->mail ?? '')), '"\' '),
            'to' => $this->addresses($m->getTo()),
            'subject' => $this->decode((string) $m->getSubject()) ?: '(ไม่มีหัวเรื่อง)',
            'date' => $m->getDate()?->first()?->toIso8601String(),
            'seen' => $m->getFlags()->has('seen'),
        ];
    }

    /** หัวเรื่อง/ชื่อที่ยังเป็น =?UTF-8?B?...?= → ข้อความ */
    private function decode(string $value): string
    {
        if (! str_contains($value, '=?')) {
            return $value;
        }
        $decoded = iconv_mime_decode($value, ICONV_MIME_DECODE_CONTINUE_ON_ERROR, 'UTF-8');

        return $decoded !== false ? $decoded : mb_decode_mimeheader($value);
    }

    private function addresses($attribute): string
    {
        return collect($attribute?->all() ?? [])->map(fn ($a) => $a->mail)->filter()->implode(', ');
    }

    /** เนื้อหาแบบข้อความ: ใช้ text/plain ถ้ามี ไม่งั้นแปลง HTML เป็นข้อความ */
    /**
     * เนื้อหา HTML ที่กรองแล้ว (null = อีเมลข้อความล้วน) — รูปที่ฝังมากับอีเมลชี้ไปที่ไฟล์แนบ, รูปจากเว็บรอผู้ใช้กดแสดง
     */
    private function html(Message $m, string $folder, int $uid): ?string
    {
        if (! $m->hasHTMLBody()) {
            return null;
        }
        $raw = (string) $m->getHTMLBody();
        if (strlen($raw) > 600_000) {
            return null; // ใหญ่เกินไป แสดงแบบข้อความแทน
        }
        $cid = [];
        foreach ($m->getAttachments()->values() as $i => $a) {
            if ($a->id && str_starts_with((string) $a->getMimeType(), 'image/')) {
                $cid[(string) $a->id] = route('admin.mail.attachment', ['folder' => $folder, 'uid' => $uid, 'index' => $i, 'view' => 1], false);
            }
        }
        $html = MailHtml::sanitize($raw, ['remote' => 'defer', 'cid' => $cid]);

        return MailHtml::isBlank($html) ? null : $html;
    }

    private function text(Message $m): string
    {
        $text = $m->hasTextBody() ? $m->getTextBody() : '';
        if (trim($text) === '' && $m->hasHTMLBody()) {
            $html = preg_replace(['#<(script|style)[^>]*>.*?</\1>#si', '#<br\s*/?>#i', '#</(p|div|tr|li|h\d)>#i'], ['', "\n", "\n"], $m->getHTMLBody());
            $text = html_entity_decode(strip_tags((string) $html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        return Str::limit(trim(preg_replace("/\n{3,}/", "\n\n", str_replace("\r", '', $text))), 20000);
    }
}
