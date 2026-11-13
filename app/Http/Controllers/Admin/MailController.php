<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MailLog;
use App\Services\MailInbox;
use App\Support\MailHtml;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/** กล่องอีเมล (IMAP) + เขียน/ตอบ/ส่งต่อ + ส่งทดสอบ + ประวัติอีเมลที่ระบบส่งออก (ยกมาจาก lawquest-web) */
class MailController extends Controller
{
    public function index(Request $request, MailInbox $inbox): Response
    {
        $mailer = (string) config('mail.default');
        $conf = config("mail.mailers.{$mailer}", []);
        $folder = (string) $request->query('folder', 'INBOX');
        $page = max(1, $request->integer('page', 1));

        return Inertia::render('Admin/Mail', [
            'status' => [
                'mailer' => $mailer,
                'sends' => ! in_array($mailer, ['log', 'array'], true),
                'host' => $conf['host'] ?? null,
                'port' => $conf['port'] ?? null,
                'scheme' => $conf['scheme'] ?? $conf['encryption'] ?? null,
                'username_set' => filled($conf['username'] ?? null),
                'from_address' => config('mail.from.address'),
                'from_name' => config('mail.from.name'),
                'webmail_url' => config('mail.webmail_url'),
            ],
            'logs' => Inertia::defer(fn () => MailLog::latest('id')->paginate(30, pageName: 'log_page')->withQueryString(), 'log'),
            'inbox_configured' => $inbox->configured(),
            'folder' => $folder,
            // เชื่อม IMAP ใช้เวลา — โหลดหลังหน้าแสดงแล้ว
            'folders' => Inertia::defer(fn () => $this->safe(fn () => $inbox->folders(), []), 'mailbox'),
            'list' => Inertia::defer(fn () => $this->safe(fn () => $inbox->list($folder, $page), ['messages' => [], 'total' => 0, 'page' => 1, 'last_page' => 1]), 'mailbox'),
            'signature' => $request->user()->mail_signature,
            'message' => fn () => $request->integer('uid') ? $this->safe(fn () => $inbox->show($folder, $request->integer('uid')), null) : null,
        ]);
    }

    public function test(Request $request): RedirectResponse
    {
        $to = $request->validate(['to' => ['required', 'email', 'max:255']])['to'];
        $subject = 'ทดสอบการส่งอีเมลจาก Devtrin';

        try {
            Mail::raw("อีเมลทดสอบจากหน้า /admin/mail\nส่งเมื่อ ".now()->format('j M Y H:i')."\nถ้าได้รับอีเมลนี้ แปลว่าการตั้งค่าอีเมลใช้งานได้", function ($message) use ($to, $subject) {
                $message->to($to)->subject($subject);
            });
        } catch (\Throwable $e) {
            MailLog::record($to, $subject, 'failed', $e->getMessage());

            return back()->with('error', 'ส่งไม่สำเร็จ: '.mb_substr($e->getMessage(), 0, 200));
        }

        return back()->with('success', in_array(config('mail.default'), ['log', 'array'], true)
            ? "ระบบตั้งไว้เป็น {$this->mailerName()} — อีเมลถูกเขียนลง log ไม่ได้ส่งจริง"
            : "ส่งอีเมลทดสอบไปที่ {$to} แล้ว (ถ้าไม่เห็น ลองดูในกล่องสแปม)");
    }

    /** จำกัดไฟล์แนบรวมต่ออีเมล (MB) — ผู้ให้บริการอีเมลส่วนใหญ่รับได้ราว 25MB หลังเข้ารหัส base64 */
    public const MAX_TOTAL_MB = 18;

    /**
     * เขียนใหม่ / ตอบกลับ / ส่งต่อ — ส่งจากบัญชีของระบบ แล้วเก็บสำเนาไว้ในโฟลเดอร์ส่งแล้ว
     * เนื้อหาเป็น HTML (จัดรูปแบบได้) + ฉบับข้อความล้วน, รูปในเนื้อหาแนบแบบ inline (cid), ไฟล์แนบทั่วไปแนบท้าย
     */
    public function send(Request $request, MailInbox $inbox): RedirectResponse
    {
        $data = $request->validate([
            'to' => ['required', 'string', 'max:1000'],
            'cc' => ['nullable', 'string', 'max:1000'],
            'subject' => ['required', 'string', 'max:255'],
            'html' => ['nullable', 'string', 'max:300000'],
            'body' => ['nullable', 'string', 'max:20000'], // แบบเดิม: ข้อความล้วน
            'message_id' => ['nullable', 'string', 'max:500'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => ['file', 'max:10240'],
            'inline' => ['nullable', 'array', 'max:10'],
            'inline.*' => ['file', 'mimes:jpg,jpeg,png,gif,webp', 'max:5120'],
        ], [
            'to.required' => 'ใส่อีเมลผู้รับ',
            'subject.required' => 'ใส่หัวเรื่อง',
            'attachments.max' => 'แนบไฟล์ได้สูงสุด 10 ไฟล์',
            'attachments.*.max' => 'ไฟล์แนบแต่ละไฟล์ต้องไม่เกิน 10MB',
            'inline.*.mimes' => 'รูปในเนื้อหาต้องเป็น JPG PNG GIF หรือ WEBP',
            'inline.*.max' => 'รูปในเนื้อหาแต่ละรูปต้องไม่เกิน 5MB',
        ]);
        $split = fn (?string $list) => collect(preg_split('/[,;\s]+/', (string) $list))->filter()->values();
        $to = $split($data['to']);
        $cc = $split($data['cc'] ?? '');
        $bad = $to->merge($cc)->reject(fn ($e) => filter_var($e, FILTER_VALIDATE_EMAIL));
        if ($to->isEmpty() || $bad->isNotEmpty()) {
            return back()->withErrors(['to' => 'อีเมลไม่ถูกต้อง: '.$bad->implode(', ')]);
        }

        $html = filled($data['html'] ?? null)
            ? MailHtml::sanitize($data['html'])
            : nl2br(e((string) ($data['body'] ?? '')), false);
        if (MailHtml::isBlank($html)) {
            return back()->withErrors(['html' => 'ยังไม่ได้เขียนข้อความ']);
        }
        /** @var list<UploadedFile> $files */
        $files = array_values($request->file('attachments', []));
        /** @var list<UploadedFile> $images */
        $images = array_values($request->file('inline', []));
        $total = collect([...$files, ...$images])->sum(fn (UploadedFile $f) => $f->getSize());
        if ($total > self::MAX_TOTAL_MB * 1024 * 1024) {
            return back()->withErrors(['attachments' => 'ไฟล์แนบรวมกันต้องไม่เกิน '.self::MAX_TOTAL_MB.'MB']);
        }
        $subject = filled($data['message_id'] ?? null) && ! str_starts_with(mb_strtolower($data['subject']), 're:') ? 'Re: '.$data['subject'] : $data['subject'];

        try {
            $sent = Mail::send([], [], function ($message) use ($to, $cc, $data, $subject, $html, $files, $images) {
                $message->to($to->all())->subject($subject);
                if ($cc->isNotEmpty()) {
                    $message->cc($cc->all());
                }
                if (filled($data['message_id'] ?? null)) {
                    $id = '<'.trim($data['message_id'], '<> ').'>';
                    $message->getHeaders()->addTextHeader('In-Reply-To', $id);
                    $message->getHeaders()->addTextHeader('References', $id);
                }
                // รูปในเนื้อหา: cid:inline-N จากหน้าเขียน → content id จริงของไฟล์ที่แนบ (รูปที่ไม่ได้ใช้ในเนื้อหาไม่แนบ)
                $cids = [];
                $body = preg_replace_callback('/cid:inline-(\d+)/', function ($m) use ($message, $images, &$cids) {
                    $file = $images[(int) $m[1]] ?? null;

                    return $file ? ($cids[$m[1]] ??= $message->embedData($file->get(), $this->filename($file), $file->getMimeType())) : 'cid:missing';
                }, $html);
                foreach ($files as $file) {
                    $message->attachData($file->get(), $this->filename($file), ['mime' => $file->getMimeType() ?: 'application/octet-stream']);
                }
                $message->html(MailHtml::document($body))->text(MailHtml::toText($html));
            });
        } catch (\Throwable $e) {
            MailLog::record($to->implode(', '), $subject, 'failed', $e->getMessage());

            return back()->with('error', 'ส่งไม่สำเร็จ: '.mb_substr($e->getMessage(), 0, 200));
        }

        if ($sent && $inbox->configured()) {
            rescue(fn () => $inbox->saveSent($sent->getSymfonySentMessage()->toString()), report: false);
        }
        $count = count($files);

        return back()->with('success', 'ส่งถึง '.$to->implode(', ').' แล้ว'.($count ? " พร้อมไฟล์แนบ {$count} ไฟล์" : ''));
    }

    /** ลายเซ็นท้ายอีเมลของตัวเอง — ใส่ให้อัตโนมัติตอนเขียนอีเมล (ลบออกได้ก่อนส่ง) */
    public function signature(Request $request): RedirectResponse
    {
        $data = $request->validate(['signature' => ['nullable', 'string', 'max:20000']]);
        $html = MailHtml::sanitize((string) ($data['signature'] ?? ''));
        $request->user()->forceFill(['mail_signature' => MailHtml::isBlank($html) ? null : $html])->save();

        return back()->with('success', MailHtml::isBlank($html) ? 'ลบลายเซ็นแล้ว' : 'บันทึกลายเซ็นแล้ว');
    }

    private function filename(UploadedFile $file): string
    {
        $name = str_replace(['"', '/', '\\', "\r", "\n"], '', $file->getClientOriginalName());

        return $name !== '' ? mb_substr($name, 0, 150) : 'file.'.($file->guessExtension() ?: 'bin');
    }

    /**
     * ดาวน์โหลดไฟล์แนบ — ส่งเป็นไฟล์ดาวน์โหลดเสมอ (ไม่เปิดในหน้าเว็บ) กันไฟล์ HTML/SVG จากภายนอกรันสคริปต์ในโดเมนเรา
     * รูปและ PDF เปิดดูในแท็บใหม่ได้ (ชนิดที่ปลอดภัย)
     */
    public function attachment(Request $request, MailInbox $inbox): SymfonyResponse
    {
        $data = $request->validate(['folder' => ['required', 'string', 'max:200'], 'uid' => ['required', 'integer'], 'index' => ['required', 'integer', 'min:0']]);
        $file = $inbox->attachment($data['folder'], (int) $data['uid'], (int) $data['index']);
        abort_unless($file, 404);
        $inline = $request->boolean('view') && preg_match('#^(image/(png|jpe?g|gif|webp)|application/pdf)$#i', $file['mime']);
        $name = str_replace(['"', "\r", "\n"], '', $file['name']);

        return response($file['content'], 200, [
            'Content-Type' => $inline ? $file['mime'] : 'application/octet-stream',
            'Content-Disposition' => ($inline ? 'inline' : 'attachment').'; filename="'.Str::ascii($name).'"; filename*=UTF-8\'\''.rawurlencode($name),
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** ลบ: ย้ายไปถังขยะ (อยู่ในถังขยะแล้ว = ลบถาวร) */
    public function delete(Request $request, MailInbox $inbox): RedirectResponse
    {
        $data = $request->validate(['folder' => ['required', 'string', 'max:200'], 'uids' => ['required', 'array', 'max:100'], 'uids.*' => ['integer']]);
        try {
            $count = $inbox->delete($data['folder'], $data['uids']);
        } catch (\Throwable $e) {
            return back()->with('error', 'ลบไม่สำเร็จ: '.mb_substr($e->getMessage(), 0, 200));
        }

        return redirect()->route('admin.mail.index', ['folder' => $data['folder']])
            ->with('success', $count ? "ลบ {$count} ฉบับแล้ว" : 'ไม่พบอีเมลที่จะลบ');
    }

    /** @template T @param callable(): T $fn @return T|array{error: string} */
    private function safe(callable $fn, mixed $fallback): mixed
    {
        try {
            return $fn();
        } catch (\Throwable $e) {
            return is_array($fallback) ? [...$fallback, 'error' => 'เชื่อมต่อกล่องอีเมลไม่ได้: '.mb_substr($e->getMessage(), 0, 200)] : ['error' => 'เปิดอีเมลไม่ได้: '.mb_substr($e->getMessage(), 0, 200)];
        }
    }

    private function mailerName(): string
    {
        return (string) config('mail.default');
    }
}
