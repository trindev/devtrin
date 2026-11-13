import { getJson, sendJson } from '@/lib/http';
import { usePush } from '@/lib/push';
import type { ChatMessage, SharedProps } from '@/types';
import { router, usePage } from '@inertiajs/react';
import clsx from 'clsx';
import { Bell, BellOff, LoaderCircle, LogOut, MessageCircle, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** เรียก fn ทุก ms มิลลิวินาที เฉพาะตอนแท็บนี้แสดงอยู่ (ประหยัดเครื่อง/เซิร์ฟเวอร์) — แบบเดียวกับ staycoolv3 */
export function usePoll(fn: () => void, ms: number, enabled = true) {
    const ref = useRef(fn);
    ref.current = fn;
    useEffect(() => {
        if (!enabled) return;
        const tick = () => document.visibilityState === 'visible' && ref.current();
        const t = setInterval(tick, ms);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearInterval(t);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [ms, enabled]);
}

export const timeLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date().toDateString() === d.toDateString();
    return d.toLocaleString('th-TH', today ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** ปุ่มแชทลอยมุมขวาล่าง — ผู้เข้าชมต้อง login ด้วย Google ก่อนคุยกับทีมงาน */
export default function ChatWidget() {
    const { auth, google, push, site } = usePage<SharedProps>().props;
    const user = auth.user;
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [unread, setUnread] = useState(0);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const list = useRef<HTMLDivElement>(null);
    const lastId = useRef(0);
    const notify = usePush(user ? push : null);

    // เปิดแชทอัตโนมัติเมื่อกลับมาจาก Google login หรือกดแจ้งเตือน (?chat=open)
    useEffect(() => {
        const url = new URL(window.location.href);
        if (url.searchParams.get('chat') === 'open') {
            setOpen(true);
            url.searchParams.delete('chat');
            window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
        }
    }, []);

    const fetchNew = useCallback(
        async (isOpen: boolean) => {
            if (!user || user.is_admin) return;
            try {
                const data = await getJson<{ messages: ChatMessage[]; unread: number }>(`/chat/messages?after=${lastId.current}&open=${isOpen ? 1 : 0}`);
                if (data.messages.length) {
                    lastId.current = data.messages[data.messages.length - 1].id;
                    setMessages((prev) => [...prev, ...data.messages.filter((m) => !prev.some((p) => p.id === m.id))]);
                }
                setUnread(data.unread);
            } catch {
                // เน็ตหลุดชั่วคราว — รอบหน้าลองใหม่
            }
        },
        [user],
    );

    useEffect(() => {
        fetchNew(open);
    }, [open, fetchNew]);
    usePoll(() => fetchNew(open), open ? 3000 : 30000, !!user && !user.is_admin);

    useEffect(() => {
        list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
    }, [messages.length, open]);

    const send = async () => {
        const body = text.trim();
        if (!body || sending) return;
        setSending(true);
        setError(null);
        try {
            const { message } = await sendJson<{ message: ChatMessage }>('/chat/messages', { body });
            lastId.current = Math.max(lastId.current, message.id);
            setMessages((prev) => [...prev, message]);
            setText('');
        } catch (e) {
            setError((e as { status?: number }).status === 429 ? 'ส่งถี่เกินไป รอสักครู่แล้วลองใหม่' : 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง');
        } finally {
            setSending(false);
        }
    };

    // admin ที่เปิดหน้าเว็บ: ปุ่มพาไปกล่องแชทหลังบ้านแทน
    if (user?.is_admin) {
        return (
            <a href="/admin/chat" className="fixed right-4 bottom-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-lime text-dark shadow-xl transition hover:scale-105 md:right-6 md:bottom-6" aria-label="เปิดกล่องแชทหลังบ้าน" title="กล่องแชทหลังบ้าน">
                <MessageCircle className="h-6 w-6" />
            </a>
        );
    }

    const returnTo = typeof window !== 'undefined' ? window.location.pathname + '?chat=open' : '/?chat=open';

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="chat-panel"
                aria-label={open ? 'ปิดแชท' : 'แชทกับเรา'}
                className="fixed right-4 bottom-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-lime text-dark shadow-xl shadow-black/20 transition hover:scale-105 md:right-6 md:bottom-6"
            >
                {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
                {!open && unread > 0 && (
                    <span className="absolute -top-1 -right-1 grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{unread}</span>
                )}
            </button>

            <section
                id="chat-panel"
                aria-label="แชทกับทีมงาน"
                hidden={!open}
                className="fixed inset-x-3 bottom-22 z-40 flex max-h-[min(36rem,calc(100svh-7rem))] flex-col overflow-hidden rounded-3xl border border-paper/10 bg-ink-2 shadow-2xl md:inset-x-auto md:right-6 md:bottom-24 md:w-[24rem]"
            >
                <header className="flex items-center gap-3 border-b border-paper/10 px-4 py-3">
                    <img src="/favicon.svg" alt="" className="h-9 w-9 rounded-xl" />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">{site.site_name}</p>
                        <p className="truncate text-xs text-mute">{user ? `คุยในชื่อ ${user.name}` : 'ปกติตอบกลับภายในวันทำการ'}</p>
                    </div>
                    {user && notify.state !== 'unsupported' && (
                        <button
                            type="button"
                            onClick={notify.toggle}
                            disabled={notify.state === 'busy' || notify.state === 'denied' || notify.state === 'install'}
                            className="grid h-9 w-9 place-items-center rounded-full text-paper/70 hover:bg-paper/10 hover:text-paper disabled:opacity-40"
                            title={
                                notify.state === 'on'
                                    ? 'ปิดแจ้งเตือนเมื่อทีมงานตอบ'
                                    : notify.state === 'denied'
                                      ? 'เบราว์เซอร์บล็อกการแจ้งเตือนไว้ — เปิดในตั้งค่าเว็บไซต์'
                                      : notify.state === 'install'
                                        ? 'iPhone: เพิ่มเว็บนี้ลงหน้าจอโฮมก่อน จึงจะรับแจ้งเตือนได้'
                                        : 'แจ้งเตือนเมื่อทีมงานตอบ'
                            }
                            aria-pressed={notify.state === 'on'}
                            aria-label="แจ้งเตือนเมื่อทีมงานตอบ"
                        >
                            {notify.state === 'busy' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : notify.state === 'on' ? <Bell className="h-4 w-4 fill-current" /> : <BellOff className="h-4 w-4" />}
                        </button>
                    )}
                    {user && (
                        <button
                            type="button"
                            onClick={() => router.post('/logout', {}, { preserveScroll: true })}
                            className="grid h-9 w-9 place-items-center rounded-full text-paper/70 hover:bg-paper/10 hover:text-paper"
                            title="ออกจากระบบ"
                            aria-label="ออกจากระบบ"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    )}
                </header>

                {!user ? (
                    <div className="space-y-5 p-6 text-center">
                        <p className="text-lg font-semibold">สวัสดีครับ 👋</p>
                        <p className="text-sm leading-relaxed text-paper/70">มีคำถามเรื่องโปรเจกต์หรืออยากเริ่มงานด้วยกัน เข้าสู่ระบบด้วย Google แล้วพิมพ์คุยกับทีมงานได้เลย</p>
                        {google ? (
                            <a
                                href={`/auth/google?return=${encodeURIComponent(returnTo)}`}
                                className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full bg-paper font-semibold text-ink transition hover:opacity-90"
                            >
                                <GoogleIcon /> เข้าสู่ระบบด้วย Google
                            </a>
                        ) : (
                            <p className="rounded-2xl bg-paper/5 p-4 text-sm text-mute">ระบบแชทยังไม่เปิดใช้ ติดต่อเราทาง{site.email ? ` ${site.email}` : 'ช่องทางด้านล่างของหน้า'}</p>
                        )}
                        <p className="text-xs text-mute">เราใช้แค่ชื่อและอีเมลจาก Google เพื่อตอบกลับคุณ</p>
                    </div>
                ) : (
                    <>
                        <div ref={list} data-lenis-prevent className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
                            {messages.length === 0 && <p className="py-8 text-center text-sm text-mute">ส่งข้อความแรกได้เลย ทีมงานจะได้รับแจ้งเตือนทันที</p>}
                            {messages.map((m) => (
                                <div key={m.id} className={clsx('flex flex-col', m.from_admin ? 'items-start' : 'items-end')}>
                                    <div
                                        className={clsx(
                                            'max-w-[85%] rounded-2xl px-3.5 py-2 text-[0.95rem] leading-relaxed break-words whitespace-pre-wrap',
                                            m.from_admin ? 'rounded-bl-md bg-paper/10' : 'rounded-br-md bg-lime text-dark',
                                        )}
                                    >
                                        {m.body}
                                    </div>
                                    <span className="mt-0.5 px-1 text-[11px] text-mute">
                                        {m.from_admin && m.sender ? `${m.sender} · ` : ''}
                                        {timeLabel(m.at)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                send();
                            }}
                            className="border-t border-paper/10 p-3"
                        >
                            {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
                            <div className="flex items-end gap-2">
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                            e.preventDefault();
                                            send();
                                        }
                                    }}
                                    rows={1}
                                    maxLength={2000}
                                    placeholder="พิมพ์ข้อความ…"
                                    aria-label="ข้อความ"
                                    className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-paper/15 bg-ink px-3.5 py-2.5 text-[0.95rem] outline-none focus:border-lime"
                                />
                                <button type="submit" disabled={!text.trim() || sending} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime text-dark disabled:opacity-40" aria-label="ส่ง">
                                    {sending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </section>
        </>
    );
}

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8C3.9 20.5 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.7 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2.1C1.4 8.6 1 10.2 1 12s.4 3.4 1.1 4.9l3.6-2.8z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1C17.5 2.1 15 1 12 1 7.7 1 3.9 3.5 2.1 7.1l3.6 2.8C6.6 7.4 9.1 5.4 12 5.4z" />
        </svg>
    );
}
