import { HtmlMail } from '@/components/admin/html-mail';
import { AdminPage, Code, EmptyState, Field, Notice, PageHeader, SectionTitle, dateTime } from '@/components/admin/kit';
import { MailBody, mailKind, parseMailBody } from '@/components/admin/mail-body';
import { RichEditor, collectInlineImages, escapeHtml, richContent, signatureBlock, textToHtml } from '@/components/admin/rich-editor';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { confirm } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import AdminLayout from '@/components/admin/AdminLayout';
import { cn } from '@/lib/utils';
import { type SharedProps as SharedData } from '@/types';
import { Deferred, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    FileText,
    Folder,
    Forward,
    Inbox,
    type LucideIcon,
    Mail,
    Paperclip,
    PenLine,
    PenSquare,
    RefreshCw,
    Reply,
    Send,
    ShieldAlert,
    Trash2,
    X,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

interface Log {
    id: number;
    to: string;
    subject: string | null;
    mailer: string;
    status: 'sent' | 'failed';
    error: string | null;
    created_at: string;
}

interface MailFolder {
    path: string;
    kind: 'inbox' | 'sent' | 'drafts' | 'junk' | 'trash' | null;
    label: string;
    unread: number;
    total: number;
}

interface ListItem {
    uid: number;
    from: string;
    from_name: string;
    to: string;
    subject: string;
    date: string | null;
    seen: boolean;
}

interface FullMessage extends ListItem {
    folder: string;
    cc: string;
    body: string;
    /** HTML ที่กรองแล้ว — null = อีเมลข้อความล้วน */
    html: string | null;
    message_id: string;
    attachments: { index: number; name: string; size: number; mime: string }[];
}

interface Props {
    status: {
        mailer: string;
        sends: boolean;
        host: string | null;
        port: number | string | null;
        scheme: string | null;
        username_set: boolean;
        from_address: string | null;
        from_name: string | null;
        webmail_url: string | null;
    };
    logs?: { data: Log[]; current_page: number; last_page: number; prev_page_url: string | null; next_page_url: string | null; total: number };
    inbox_configured: boolean;
    folder: string;
    folders?: MailFolder[] | { error: string };
    list?: { messages: ListItem[]; total: number; page: number; last_page: number; error?: string };
    message: FullMessage | { error: string } | null;
    /** ลายเซ็นของผู้ใช้ที่เข้าสู่ระบบ (HTML) */
    signature: string | null;
}

const FOLDER_ICON: Record<string, LucideIcon> = { inbox: Inbox, sent: Send, drafts: FileText, junk: ShieldAlert, trash: Trash2 };

/** html = เนื้อหาเดิมที่ยกมา (ตอบกลับ/ส่งต่อ) — ลายเซ็นและบรรทัดว่างด้านบนใส่ตอนเปิดหน้าเขียน */
type Compose = { mode: 'new' | 'reply' | 'forward'; to: string; cc: string; subject: string; html: string; message_id: string };

const fullDate = (iso: string | null) => (iso ? dateTime(iso) : '');
const shortDate = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);

    return d.toDateString() === new Date().toDateString()
        ? d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};
// รูปแบบเดียวกับที่ mail-body.tsx แยกช่วงได้: "เมื่อ ... เขียนว่า:" + blockquote (ฉบับข้อความล้วนเป็นบรรทัด "> ")
const quote = (m: FullMessage) =>
    `<p data-quote="1">เมื่อ ${escapeHtml(`${fullDate(m.date)} ${m.from_name || m.from} <${m.from}>`)} เขียนว่า:</p><blockquote>${textToHtml(m.body)}</blockquote>`;
const forwarded = (m: FullMessage) =>
    `<p data-quote="1">---------- ข้อความที่ส่งต่อ ----------</p><p>จาก: ${escapeHtml(`${m.from_name || m.from} <${m.from}>`)}<br>วันที่: ${escapeHtml(fullDate(m.date))}<br>เรื่อง: ${escapeHtml(m.subject)}<br>ถึง: ${escapeHtml(m.to)}</p><div>${textToHtml(m.body)}</div>`;

const mailAttachmentUrl = (params: Record<string, string | number>) => '/admin/mail/attachment?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();

export default function MailAdmin(props: Props) {
    const [tab, setTab] = useState<'mailbox' | 'log' | 'settings'>(props.inbox_configured ? 'mailbox' : 'settings');
    const [compose, setCompose] = useState<Compose | null>(null);

    return (
        <AdminLayout title="อีเมล" wide>
            <AdminPage>
                <PageHeader
                    title="อีเมล"
                    description={props.status.from_address ? `${props.status.from_name ?? ''} <${props.status.from_address}>` : 'อีเมลของระบบ'}
                    actions={
                        props.status.sends && (
                            <Button onClick={() => setCompose({ mode: 'new', to: '', cc: '', subject: '', html: '', message_id: '' })}>
                                <PenSquare strokeWidth={1.75} /> เขียนอีเมล
                            </Button>
                        )
                    }
                />

                <div className="bg-secondary inline-flex w-fit rounded-xl p-1 text-sm">
                    {(
                        [
                            ['mailbox', 'กล่องอีเมล'],
                            ['log', 'บันทึกการส่งของระบบ'],
                            ['settings', 'การตั้งค่า'],
                        ] as const
                    )
                        .filter(([key]) => key !== 'mailbox' || props.inbox_configured)
                        .map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setTab(key)}
                                aria-pressed={tab === key}
                                className={cn(
                                    'rounded-lg px-3 py-1.5',
                                    tab === key ? 'bg-card text-foreground shadow-sm' : 'text-text-2 hover:text-foreground',
                                )}
                            >
                                {label}
                            </button>
                        ))}
                </div>

                {tab === 'mailbox' && props.inbox_configured && <Mailbox {...props} onCompose={setCompose} />}
                {tab === 'log' && <SystemLog logs={props.logs} />}
                {tab === 'settings' && <Settings status={props.status} signature={props.signature} />}
            </AdminPage>

            <ComposeModal compose={compose} signature={props.signature} onClose={() => setCompose(null)} />
        </AdminLayout>
    );
}

/* ------------------------------------------------------------------ */
/* กล่องอีเมล: โฟลเดอร์ | รายการ | อ่าน                                 */
/* ------------------------------------------------------------------ */

function Mailbox({ folder, folders, list, message, onCompose }: Props & { onCompose: (c: Compose) => void }) {
    const [selected, setSelected] = useState<number[]>([]);
    const opened = message && 'uid' in message ? message : null;
    const folderList = Array.isArray(folders) ? folders : [];
    const current = folderList.find((f) => f.path === folder);
    const isSent = current?.kind === 'sent' || current?.kind === 'drafts';

    useEffect(() => setSelected([]), [folder, list?.page]);

    // เปิดอ่าน = server ตั้ง Seen ให้แล้ว แต่หน้าเว็บโหลดใหม่แค่ message — ทำเครื่องหมายอ่านแล้วบนจอทันที
    // ไม่ต้องรอดึงรายการ/โฟลเดอร์จาก IMAP ใหม่ (ช้า) · ล้างค่าที่จำไว้เมื่อได้ข้อมูลชุดใหม่จาก server
    const [readUids, setReadUids] = useState<number[]>([]);
    const [readCount, setReadCount] = useState<Record<string, number>>({});
    useEffect(() => setReadUids([]), [list]);
    useEffect(() => setReadCount({}), [folders]);
    const isSeen = (m: ListItem) => m.seen || readUids.includes(m.uid);
    const unreadOf = (f: MailFolder) => Math.max(0, f.unread - (readCount[f.path] ?? 0));

    const go = (params: Record<string, string | number | undefined>) => router.get('/admin/mail', params, { preserveScroll: true });
    const open = (uid: number) => {
        const item = list?.messages.find((m) => m.uid === uid);
        if (item && !isSeen(item)) {
            setReadUids((u) => [...u, uid]);
            setReadCount((c) => ({ ...c, [folder]: (c[folder] ?? 0) + 1 }));
        }
        router.get(
            '/admin/mail',
            { folder, page: list?.page ?? 1, uid },
            { only: ['message'], preserveState: true, preserveScroll: true },
        );
    };
    const close = () =>
        router.get('/admin/mail', { folder, page: list?.page ?? 1 }, { only: ['message'], preserveState: true, preserveScroll: true });
    const remove = async (uids: number[]) => {
        const permanent = current?.kind === 'trash';
        const ok = await confirm({
            title: permanent ? `ลบถาวร ${uids.length} ฉบับ?` : `ย้าย ${uids.length} ฉบับไปถังขยะ?`,
            text: permanent ? 'ลบแล้วกู้คืนไม่ได้' : 'กู้คืนได้จากถังขยะ',
            confirmText: permanent ? 'ลบถาวร' : 'ลบ',
            tone: permanent ? 'danger' : 'warning',
        });
        if (ok) router.post('/admin/mail/delete', { folder, uids }, { preserveScroll: true });
    };

    return (
        <div className="surface grid min-h-[36rem] overflow-hidden lg:grid-cols-[13rem_minmax(18rem,24rem)_1fr]">
            {/* โฟลเดอร์ — จอเล็กเป็นแถวเลื่อนได้ */}
            <nav className="border-border flex gap-1 overflow-x-auto border-b p-2 lg:flex-col lg:border-r lg:border-b-0" aria-label="โฟลเดอร์">
                <Deferred data="folders" fallback={<p className="text-muted-foreground px-3 py-2 text-sm">กำลังโหลด…</p>}>
                    <>
                        {!Array.isArray(folders) && folders && <p className="text-destructive px-3 py-2 text-xs">{folders.error}</p>}
                        {folderList.map((f) => {
                            const Icon = (f.kind && FOLDER_ICON[f.kind]) || Folder;
                            const active = f.path === folder;

                            return (
                                <button
                                    key={f.path}
                                    type="button"
                                    onClick={() => go({ folder: f.path })}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap',
                                        active
                                            ? 'bg-accent-soft text-accent-ink font-medium'
                                            : 'text-text-2 hover:bg-secondary hover:text-foreground',
                                    )}
                                >
                                    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                                    <span className="flex-1">{f.label}</span>
                                    {unreadOf(f) > 0 && <span className="font-mono text-xs tabular-nums">{unreadOf(f)}</span>}
                                </button>
                            );
                        })}
                    </>
                </Deferred>
            </nav>

            {/* รายการอีเมล */}
            <section className={cn('border-border flex min-w-0 flex-col lg:border-r', opened && 'hidden lg:flex')} aria-label="รายการอีเมล">
                <div className="border-border flex items-center gap-2 border-b px-3 py-2">
                    <Checkbox
                        aria-label="เลือกทั้งหมด"
                        checked={!!list && list.messages.length > 0 && selected.length === list.messages.length}
                        onCheckedChange={(v) => setSelected(v === true && list ? list.messages.map((m) => m.uid) : [])}
                    />
                    {selected.length > 0 ? (
                        <Button size="sm" variant="ghost" onClick={() => remove(selected)} className="hover:text-destructive">
                            <Trash2 strokeWidth={1.75} /> ลบ {selected.length}
                        </Button>
                    ) : (
                        <span className="text-sm font-medium">{current?.label ?? folder}</span>
                    )}
                    <span className="flex-1" />
                    {list && list.total > 0 && <span className="text-muted-foreground font-mono text-xs tabular-nums">{list.total}</span>}
                    <Button size="icon" variant="ghost" aria-label="รีเฟรช" onClick={() => go({ folder, page: list?.page })}>
                        <RefreshCw strokeWidth={1.75} />
                    </Button>
                </div>
                <Deferred data="list" fallback={<p className="text-muted-foreground px-4 py-6 text-sm">กำลังโหลดอีเมล…</p>}>
                    <>
                        {list?.error ? (
                            <p className="text-destructive px-4 py-6 text-sm">{list.error}</p>
                        ) : !list || list.messages.length === 0 ? (
                            <p className="text-muted-foreground px-4 py-10 text-center text-sm">ไม่มีอีเมลในโฟลเดอร์นี้</p>
                        ) : (
                            <ul className="divide-border flex-1 divide-y overflow-y-auto">
                                {list.messages.map((m) => {
                                    const active = opened?.uid === m.uid;

                                    return (
                                        <li
                                            key={m.uid}
                                            className={cn(
                                                'flex items-start gap-2 px-3 py-2.5',
                                                active ? 'bg-accent-soft/60' : 'hover:bg-secondary/60',
                                            )}
                                        >
                                            <Checkbox
                                                className="mt-1"
                                                aria-label={`เลือก ${m.subject}`}
                                                checked={selected.includes(m.uid)}
                                                onCheckedChange={(v) =>
                                                    setSelected((s) => (v === true ? [...s, m.uid] : s.filter((x) => x !== m.uid)))
                                                }
                                            />
                                            <button type="button" onClick={() => open(m.uid)} className="min-w-0 flex-1 text-left">
                                                <span className="flex items-baseline gap-2">
                                                    {!isSeen(m) && (
                                                        <span
                                                            className="bg-primary size-2 shrink-0 self-center rounded-full"
                                                            aria-label="ยังไม่อ่าน"
                                                        />
                                                    )}
                                                    <span className={cn('min-w-0 flex-1 truncate text-sm', !isSeen(m) && 'font-medium')}>
                                                        {isSent ? `ถึง ${m.to}` : m.from_name || m.from}
                                                    </span>
                                                    <span className="text-muted-foreground shrink-0 text-xs">{shortDate(m.date)}</span>
                                                </span>
                                                <span
                                                    className={cn(
                                                        'flex min-w-0 items-center gap-1 text-sm',
                                                        isSeen(m) ? 'text-text-2' : 'text-foreground',
                                                    )}
                                                >
                                                    <KindIcon kind={mailKind(m.subject)} />
                                                    <span className="truncate">{m.subject}</span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {list && list.last_page > 1 && (
                            <div className="border-border flex items-center justify-between border-t px-3 py-2">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    disabled={list.page <= 1}
                                    onClick={() => go({ folder, page: list.page - 1 })}
                                    aria-label="หน้าก่อนหน้า"
                                >
                                    <ChevronLeft strokeWidth={1.75} />
                                </Button>
                                <span className="text-text-2 font-mono text-xs tabular-nums">
                                    {list.page}/{list.last_page}
                                </span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    disabled={list.page >= list.last_page}
                                    onClick={() => go({ folder, page: list.page + 1 })}
                                    aria-label="หน้าถัดไป"
                                >
                                    <ChevronRight strokeWidth={1.75} />
                                </Button>
                            </div>
                        )}
                    </>
                </Deferred>
            </section>

            {/* อ่านอีเมล */}
            <section className={cn('min-w-0 flex-col', opened ? 'flex' : 'hidden lg:flex')} aria-label="อ่านอีเมล">
                {message && 'error' in message ? (
                    <p className="text-destructive p-6 text-sm">{message.error}</p>
                ) : opened ? (
                    <Reader
                        message={opened}
                        onBack={close}
                        onDelete={() => remove([opened.uid])}
                        onReply={() =>
                            onCompose({
                                mode: 'reply',
                                to: isSent ? opened.to : opened.from,
                                cc: '',
                                subject: opened.subject.replace(/^re:\s*/i, ''),
                                html: quote(opened),
                                message_id: opened.message_id,
                            })
                        }
                        onForward={() =>
                            onCompose({
                                mode: 'forward',
                                to: '',
                                cc: '',
                                subject: `Fwd: ${opened.subject}`,
                                html: forwarded(opened),
                                message_id: '',
                            })
                        }
                    />
                ) : (
                    <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 p-10 text-sm">
                        <Mail className="size-8" strokeWidth={1.25} />
                        เลือกอีเมลเพื่ออ่าน
                    </div>
                )}
            </section>
        </div>
    );
}

function Reader({
    message,
    onBack,
    onDelete,
    onReply,
    onForward,
}: {
    message: FullMessage;
    onBack: () => void;
    onDelete: () => void;
    onReply: () => void;
    onForward: () => void;
}) {
    const kind = mailKind(message.subject, parseMailBody(message.body));
    const [view, setView] = useState<'html' | 'text'>('html');

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-border flex items-center gap-1 border-b px-3 py-2">
                <Button size="icon" variant="ghost" onClick={onBack} aria-label="กลับไปรายการ" className="lg:hidden">
                    <ArrowLeft strokeWidth={1.75} />
                </Button>
                <Button size="sm" variant="ghost" onClick={onReply}>
                    <Reply strokeWidth={1.75} /> ตอบกลับ
                </Button>
                <Button size="sm" variant="ghost" onClick={onForward}>
                    <Forward strokeWidth={1.75} /> ส่งต่อ
                </Button>
                <span className="flex-1" />
                <Button size="sm" variant="ghost" onClick={onDelete} className="hover:text-destructive">
                    <Trash2 strokeWidth={1.75} /> ลบ
                </Button>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto p-5">
                <div>
                    <h2 className="flex flex-wrap items-center gap-2 text-lg leading-7 font-medium">
                        {message.subject}
                        {kind && (
                            <span className="bg-secondary text-text-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-normal">
                                <KindIcon kind={kind} /> {kind === 'reply' ? 'ตอบกลับ' : 'ส่งต่อ'}
                            </span>
                        )}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                        <span>
                            <span className="font-medium">{message.from_name || message.from}</span>{' '}
                            <span className="text-muted-foreground">&lt;{message.from}&gt;</span>
                        </span>
                        <span className="text-muted-foreground text-xs">{fullDate(message.date)}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                        ถึง {message.to}
                        {message.cc && ` · สำเนา ${message.cc}`}
                    </p>
                </div>
                {message.html && (
                    <div className="bg-secondary flex w-fit gap-1 rounded-lg p-0.5 text-xs" role="radiogroup" aria-label="รูปแบบการแสดง">
                        {(
                            [
                                ['html', 'จัดรูปแบบ'],
                                ['text', 'ข้อความล้วน'],
                            ] as const
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={view === key}
                                onClick={() => setView(key)}
                                className={cn(
                                    'rounded-md px-2.5 py-1',
                                    view === key ? 'bg-card text-foreground shadow-xs' : 'text-text-2 hover:text-foreground',
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}
                {/* จัดรูปแบบ = HTML ของผู้ส่ง (กรองแล้ว แสดงใน iframe sandbox) · ข้อความล้วน = แยกข้อความใหม่ / ข้อความเดิม / ข้อความที่ส่งต่อ */}
                {message.html && view === 'html' ? <HtmlMail key={message.uid} html={message.html} /> : <MailBody body={message.body} />}
                {message.attachments.length > 0 && (
                    <div className="border-border flex flex-col gap-2 border-t pt-3">
                        <p className="text-text-2 flex items-center gap-1.5 text-xs">
                            <Paperclip className="size-3.5" strokeWidth={1.75} /> ไฟล์แนบ {message.attachments.length} ไฟล์
                        </p>
                        <ul className="flex flex-wrap gap-2">
                            {message.attachments.map((a) => {
                                const params = { folder: message.folder, uid: message.uid, index: a.index };
                                const viewable = /^(image\/(png|jpe?g|gif|webp)|application\/pdf)$/i.test(a.mime);

                                return (
                                    <li
                                        key={a.index}
                                        className="border-border bg-card flex items-center gap-2 rounded-xl border py-1.5 pr-1.5 pl-3 text-sm"
                                    >
                                        <FileText className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />
                                        <span className="max-w-[14rem] truncate" title={a.name}>
                                            {a.name}
                                        </span>
                                        <span className="text-muted-foreground font-mono text-xs tabular-nums">{fileSize(a.size)}</span>
                                        {viewable && (
                                            <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                                                <a href={mailAttachmentUrl({ ...params, view: 1 })} target="_blank" rel="noreferrer">
                                                    เปิดดู
                                                </a>
                                            </Button>
                                        )}
                                        <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                                            <a href={mailAttachmentUrl(params)} aria-label={`ดาวน์โหลด ${a.name}`}>
                                                <Download strokeWidth={1.75} />
                                            </a>
                                        </Button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* เขียนอีเมล / ตอบกลับ / ส่งต่อ                                         */
/* ------------------------------------------------------------------ */

const MAX_FILES = 10;
const MAX_TOTAL_MB = 18;
const fileSizeLabel = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

type ComposeForm = { to: string; cc: string; subject: string; html: string; message_id: string; attachments: File[]; inline: File[] };

function ComposeModal({ compose, signature, onClose }: { compose: Compose | null; signature: string | null; onClose: () => void }) {
    const form = useForm<ComposeForm>({ to: '', cc: '', subject: '', html: '', message_id: '', attachments: [], inline: [] });
    const images = useRef(new Map<string, File>());
    const fileRef = useRef<HTMLInputElement>(null);
    const [session, setSession] = useState(0);
    const [localError, setLocalError] = useState<string | null>(null);

    // เนื้อหาเริ่มต้น: บรรทัดว่าง → ลายเซ็น → ข้อความเดิมที่ยกมา
    const initialHtml = useMemo(
        () => (compose ? `<p><br></p>${signature ? signatureBlock(signature) : ''}${compose.html ? `<p><br></p>${compose.html}` : ''}` : ''),
        [compose, signature],
    );

    useEffect(() => {
        if (!compose) return;
        form.clearErrors();
        images.current.forEach((_, url) => URL.revokeObjectURL(url));
        images.current.clear();
        setLocalError(null);
        form.setData({
            to: compose.to,
            cc: compose.cc,
            subject: compose.subject,
            html: initialHtml,
            message_id: compose.message_id,
            attachments: [],
            inline: [],
        });
        setSession((n) => n + 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [compose]);

    const totalBytes = form.data.attachments.reduce((n, f) => n + f.size, 0);

    const addFiles = (files: File[]) => {
        setLocalError(null);
        const next = [...form.data.attachments, ...files];
        if (next.length > MAX_FILES) return setLocalError(`แนบไฟล์ได้สูงสุด ${MAX_FILES} ไฟล์`);
        if (next.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_MB * 1024 * 1024) return setLocalError(`ไฟล์แนบรวมกันต้องไม่เกิน ${MAX_TOTAL_MB}MB`);
        form.setData('attachments', next);
    };

    const send = (e: FormEvent) => {
        e.preventDefault();
        const { html, files } = collectInlineImages(form.data.html, images.current);
        form.transform((data) => ({ ...data, html, inline: files }));
        form.post('/admin/mail/send', { preserveScroll: true, forceFormData: true, onSuccess: onClose });
    };

    const fileErrors = Object.entries(form.errors)
        .filter(([k]) => k.startsWith('attachments') || k.startsWith('inline'))
        .map(([, v]) => v);

    return (
        <Modal
            open={compose !== null}
            onOpenChange={(o) => !o && onClose()}
            size="lg"
            title={compose?.mode === 'reply' ? 'ตอบกลับ' : compose?.mode === 'forward' ? 'ส่งต่อ' : 'เขียนอีเมล'}
            footer={
                <div className="flex w-full flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                        <Paperclip strokeWidth={1.75} /> แนบไฟล์
                    </Button>
                    <span className="text-muted-foreground text-xs">
                        {form.data.attachments.length > 0
                            ? `${form.data.attachments.length} ไฟล์ · ${fileSizeLabel(totalBytes)}`
                            : `สูงสุด ${MAX_FILES} ไฟล์ รวม ${MAX_TOTAL_MB}MB`}
                    </span>
                    <Button type="submit" form="compose-form" loading={form.processing} className="ml-auto">
                        <Send strokeWidth={1.75} /> ส่ง
                    </Button>
                </div>
            }
        >
            <form id="compose-form" onSubmit={send} className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="ถึง" error={form.errors.to} hint="หลายคนคั่นด้วยจุลภาค">
                        <Input value={form.data.to} onChange={(e) => form.setData('to', e.target.value)} autoFocus={compose?.mode !== 'reply'} />
                    </Field>
                    <Field label="สำเนา (ไม่บังคับ)" error={form.errors.cc}>
                        <Input value={form.data.cc} onChange={(e) => form.setData('cc', e.target.value)} />
                    </Field>
                </div>
                <Field label="หัวเรื่อง" error={form.errors.subject}>
                    <Input value={form.data.subject} onChange={(e) => form.setData('subject', e.target.value)} />
                </Field>
                <Field label="ข้อความ" error={form.errors.html} hint="วางรูปหรือลากรูปมาวางในช่องได้ · ข้อความที่วางจากที่อื่นจะเป็นข้อความล้วน">
                    {compose && (
                        <RichEditor
                            key={session}
                            initialHtml={initialHtml}
                            onChange={(html) => form.setData('html', html)}
                            images={images.current}
                            signature={signature}
                            autoFocus={compose.mode === 'reply'}
                            onImageError={setLocalError}
                        />
                    )}
                </Field>

                {form.data.attachments.length > 0 && (
                    <ul className="flex flex-wrap gap-2" aria-label="ไฟล์แนบ">
                        {form.data.attachments.map((f, i) => (
                            <li
                                key={`${f.name}-${i}`}
                                className="border-border bg-secondary/50 flex max-w-full items-center gap-2 rounded-lg border py-1 pr-1 pl-2.5 text-xs"
                            >
                                <Paperclip className="text-muted-foreground size-3.5 shrink-0" strokeWidth={1.75} />
                                <span className="min-w-0 truncate">{f.name}</span>
                                <span className="text-muted-foreground shrink-0 tabular-nums">{fileSizeLabel(f.size)}</span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        form.setData(
                                            'attachments',
                                            form.data.attachments.filter((_, j) => j !== i),
                                        )
                                    }
                                    className="text-muted-foreground hover:bg-card hover:text-foreground grid size-6 place-items-center rounded-md"
                                    aria-label={`เอา ${f.name} ออก`}
                                >
                                    <X className="size-3.5" strokeWidth={1.75} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {(localError || fileErrors.length > 0) && <p className="text-destructive text-sm">{localError ?? fileErrors[0]}</p>}
                {!signature && <p className="text-muted-foreground text-xs">ยังไม่มีลายเซ็น — ตั้งได้ที่แท็บ "ตั้งค่า" ของหน้านี้</p>}
                <p className="text-muted-foreground text-xs">ส่งจากบัญชีของระบบ และเก็บสำเนาไว้ในโฟลเดอร์ "ส่งแล้ว"</p>
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => {
                        addFiles([...(e.target.files ?? [])]);
                        e.target.value = '';
                    }}
                />
            </form>
        </Modal>
    );
}

/** ลายเซ็นท้ายอีเมลของแต่ละคน — ใส่ให้อัตโนมัติตอนเขียน/ตอบกลับ และกดปุ่มปากกาในแถบเครื่องมือเพื่อเอาออกได้ */
function SignatureSettings({ signature }: { signature: string | null }) {
    const { auth } = usePage<SharedData>().props;
    const [html, setHtml] = useState(signature ?? '');
    const [version, setVersion] = useState(0);
    const [saving, setSaving] = useState(false);
    const sample = `<p><b>${escapeHtml(auth.user!.name)}</b><br>ทีมงาน Devtrin<br><a href="${escapeHtml(window.location.origin)}">${escapeHtml(window.location.host)}</a></p>`;

    return (
        <section className="surface flex flex-col gap-3 p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
                <SectionTitle>
                    <span className="inline-flex items-center gap-2">
                        <PenLine className="size-4" strokeWidth={1.75} /> ลายเซ็นของฉัน
                    </span>
                </SectionTitle>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => {
                        setHtml(sample);
                        setVersion((v) => v + 1);
                    }}
                >
                    ใช้แบบตัวอย่าง
                </Button>
            </div>
            <p className="text-text-2 text-sm leading-6">
                ใส่ท้ายอีเมลให้อัตโนมัติทุกครั้งที่เขียนหรือตอบกลับ แต่ละคนในทีมตั้งของตัวเอง — จัดตัวหนา ใส่ลิงก์ได้
            </p>
            <RichEditor key={version} initialHtml={html} onChange={setHtml} minHeight="min-h-28" placeholder="เช่น ชื่อ ตำแหน่ง เบอร์ติดต่อ" />
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    loading={saving}
                    onClick={() =>
                        router.patch(
                            '/admin/mail/signature',
                            { signature: html },
                            { preserveScroll: true, onStart: () => setSaving(true), onFinish: () => setSaving(false) },
                        )
                    }
                >
                    บันทึกลายเซ็น
                </Button>
                {signature && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setHtml('');
                            setVersion((v) => v + 1);
                            router.patch('/admin/mail/signature', { signature: '' }, { preserveScroll: true });
                        }}
                    >
                        ลบลายเซ็น
                    </Button>
                )}
            </div>
            {signature && (
                <div className="border-border rounded-xl border border-dashed p-3">
                    <p className="text-muted-foreground mb-1 text-xs">ที่บันทึกไว้</p>
                    <div className={richContent} dangerouslySetInnerHTML={{ __html: signature }} />
                </div>
            )}
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* บันทึกการส่งของระบบ + การตั้งค่า                                      */
/* ------------------------------------------------------------------ */

function SystemLog({ logs }: { logs: Props['logs'] }) {
    return (
        <section className="flex flex-col gap-3">
            <p className="text-text-2 text-sm">อีเมลที่ระบบส่งอัตโนมัติ เช่นลิงก์ตั้งรหัสผ่าน และอีเมลที่ส่งจากหน้านี้</p>
            <Deferred data="logs" fallback={<p className="text-muted-foreground text-sm">กำลังโหลด…</p>}>
                <>
                    {!logs || logs.data.length === 0 ? (
                        <EmptyState>ยังไม่มีอีเมลที่ส่งออก</EmptyState>
                    ) : (
                        <ul className="surface divide-border divide-y overflow-hidden">
                            {logs.data.map((l) => (
                                <li key={l.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                                    <span
                                        className={cn('mt-1.5 size-2 shrink-0 rounded-full', l.status === 'sent' ? 'bg-success' : 'bg-destructive')}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{l.subject ?? '(ไม่มีหัวเรื่อง)'}</p>
                                        <p className="text-muted-foreground truncate text-xs">
                                            ถึง {l.to} · {l.mailer} · {dateTime(l.created_at)}
                                        </p>
                                        {l.error && <p className="text-destructive mt-1 text-xs break-words">{l.error}</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {logs && logs.last_page > 1 && (
                        <div className="flex items-center justify-center gap-2">
                            <Button asChild variant="outline" size="icon" disabled={!logs.prev_page_url}>
                                <Link href={logs.prev_page_url ?? '#'} preserveScroll aria-label="หน้าก่อนหน้า">
                                    <ChevronLeft strokeWidth={1.75} />
                                </Link>
                            </Button>
                            <span className="text-text-2 font-mono text-sm tabular-nums">
                                {logs.current_page}/{logs.last_page}
                            </span>
                            <Button asChild variant="outline" size="icon" disabled={!logs.next_page_url}>
                                <Link href={logs.next_page_url ?? '#'} preserveScroll aria-label="หน้าถัดไป">
                                    <ChevronRight strokeWidth={1.75} />
                                </Link>
                            </Button>
                        </div>
                    )}
                </>
            </Deferred>
        </section>
    );
}

function Settings({ status, signature }: { status: Props['status']; signature: string | null }) {
    const { auth } = usePage<SharedData>().props;
    const form = useForm({ to: auth.user!.email });

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <SignatureSettings signature={signature} />
            {!status.sends && (
                <Notice className="lg:col-span-2">
                    ตอนนี้ตั้งเป็น <Code>MAIL_MAILER={status.mailer}</Code> — อีเมลถูกเขียนลง log ไม่ได้ส่งจริง ตั้ง SMTP ใน <Code>.env</Code> แล้วกด
                    "Cache config" ใน /_maintenance
                </Notice>
            )}
            <section className="surface grid content-start gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <SectionTitle>การส่ง</SectionTitle>
                </div>
                <Row label="วิธีส่ง" value={status.mailer} ok={status.sends} />
                <Row label="ผู้ส่ง" value={status.from_address ? `${status.from_name ?? ''} <${status.from_address}>` : null} />
                <Row label="SMTP host" value={status.host ? `${status.host}:${status.port ?? ''}` : null} />
                <Row label="การเข้ารหัส" value={status.scheme} />
                <Row label="ชื่อผู้ใช้ SMTP" value={status.username_set ? 'ตั้งแล้ว' : null} />
            </section>
            <div className="flex flex-col gap-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/admin/mail/test', { preserveScroll: true });
                    }}
                    className="surface flex flex-col gap-3 p-5"
                >
                    <SectionTitle>ส่งอีเมลทดสอบ</SectionTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <Field label="ส่งถึง" error={form.errors.to} className="flex-1">
                            <Input type="email" value={form.data.to} onChange={(e) => form.setData('to', e.target.value)} />
                        </Field>
                        <Button type="submit" loading={form.processing}>
                            <Send strokeWidth={1.75} /> ส่งทดสอบ
                        </Button>
                    </div>
                </form>
                <section className="surface flex flex-col gap-3 p-5">
                    <SectionTitle>Webmail</SectionTitle>
                    {status.webmail_url ? (
                        <Button asChild variant="outline" className="w-fit">
                            <a href={status.webmail_url} target="_blank" rel="noreferrer">
                                <Inbox strokeWidth={1.75} /> เปิด webmail (ไฟล์แนบ ตั้งค่ากล่อง) <ExternalLink strokeWidth={1.75} />
                            </a>
                        </Button>
                    ) : (
                        <p className="text-text-2 text-sm leading-6">
                            ใส่ลิงก์ webmail ใน <Code>MAIL_WEBMAIL_URL</Code> เพื่อเปิดไฟล์แนบหรือตั้งค่ากล่องอีเมลจากหน้านี้
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}

function Row({ label, value, ok }: { label: string; value: string | null; ok?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-3 sm:block">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p
                className={cn(
                    'font-mono text-[0.8125rem] break-all',
                    ok === false ? 'text-warning' : value ? 'text-foreground' : 'text-muted-foreground',
                )}
            >
                {value ?? '—'}
            </p>
        </div>
    );
}

function KindIcon({ kind }: { kind: 'reply' | 'forward' | null }) {
    if (!kind) return null;
    const Icon = kind === 'reply' ? Reply : Forward;

    return <Icon className="text-muted-foreground size-3.5 shrink-0" strokeWidth={1.75} aria-label={kind === 'reply' ? 'ตอบกลับ' : 'ส่งต่อ'} />;
}

const fileSize = (bytes: number) =>
    bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} B`;
