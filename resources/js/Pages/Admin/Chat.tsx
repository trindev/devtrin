import AdminLayout from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/ui';
import { timeLabel, usePoll } from '@/components/site/ChatWidget';
import { AttachButton, AttachPreview, MessageImage, useChatImage } from '@/components/ChatAttachment';
import { getJson, sendForm } from '@/lib/http';
import type { ChatMessage, SharedProps } from '@/types';
import { router, usePage } from '@inertiajs/react';
import clsx from 'clsx';
import { ArrowLeft, LoaderCircle, MessagesSquare, Send, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Conversation {
    id: number;
    name: string;
    email: string | null;
    avatar: string | null;
    unread: number;
    last: { body: string; from_admin: boolean } | null;
    at: string | null;
}

interface Props extends SharedProps {
    conversations: Conversation[];
    selected: number | null;
}

export default function AdminChat() {
    const props = usePage<Props>().props;
    const [conversations, setConversations] = useState(props.conversations);
    const [selected, setSelected] = useState<number | null>(props.selected ?? null);
    const current = conversations.find((c) => c.id === selected) ?? null;

    const refreshList = useCallback(async () => {
        try {
            const data = await getJson<{ conversations: Conversation[] }>('/admin/chat/list');
            setConversations(data.conversations);
        } catch {
            // ลองใหม่รอบหน้า
        }
    }, []);
    usePoll(refreshList, 5000);

    const pick = (id: number | null) => {
        setSelected(id);
        window.history.replaceState(window.history.state, '', id ? `/admin/chat?c=${id}` : '/admin/chat');
        setConversations((list) => list.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    };

    return (
        <AdminLayout title="แชท" wide>
            <PageHeader title="แชท" description="ผู้เข้าชมที่ login ด้วย Google แล้วส่งข้อความจากหน้าเว็บ · อัปเดตอัตโนมัติ" />
            <div className="grid h-[calc(100svh-13rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:grid-cols-[20rem_1fr] dark:border-zinc-800 dark:bg-zinc-900">
                <aside className={clsx('min-h-0 overflow-y-auto border-zinc-100 lg:border-r dark:border-zinc-800', current && 'hidden lg:block')}>
                    {conversations.length === 0 ? (
                        <div className="grid h-full place-items-center p-8 text-center text-sm text-zinc-500">
                            <div>
                                <MessagesSquare className="mx-auto mb-3 h-8 w-8 opacity-40" />
                                ยังไม่มีแชท — ข้อความจากปุ่มแชทบนหน้าเว็บจะมาที่นี่
                            </div>
                        </div>
                    ) : (
                        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {conversations.map((c) => (
                                <li key={c.id}>
                                    <button
                                        type="button"
                                        onClick={() => pick(c.id)}
                                        className={clsx('flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60', c.id === selected && 'bg-zinc-100 dark:bg-zinc-800')}
                                    >
                                        <Avatar name={c.name} src={c.avatar} />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2">
                                                <span className={clsx('flex-1 truncate text-sm', c.unread ? 'font-semibold' : 'font-medium')}>{c.name}</span>
                                                {c.at && <span className="shrink-0 text-[11px] text-zinc-400">{timeLabel(c.at)}</span>}
                                            </span>
                                            <span className="mt-0.5 flex items-center gap-2">
                                                <span className={clsx('flex-1 truncate text-xs', c.unread ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-500')}>
                                                    {c.last ? `${c.last.from_admin ? 'คุณ: ' : ''}${c.last.body}` : ''}
                                                </span>
                                                {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-violet-600 px-1.5 text-[11px] font-semibold text-white">{c.unread}</span>}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>
                <div className={clsx('min-h-0', !current && 'hidden lg:block')}>
                    {current ? (
                        <Thread key={current.id} conversation={current} onBack={() => pick(null)} onSent={refreshList} />
                    ) : (
                        <div className="grid h-full place-items-center text-sm text-zinc-500">เลือกแชทจากรายการด้านซ้าย</div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

function Thread({ conversation, onBack, onSent }: { conversation: Conversation; onBack: () => void; onSent: () => void }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastId = useRef(0);
    const list = useRef<HTMLDivElement>(null);
    const attach = useChatImage();

    const load = useCallback(async () => {
        try {
            const data = await getJson<{ messages: ChatMessage[] }>(`/admin/chat/${conversation.id}/messages?after=${lastId.current}`);
            if (data.messages.length) {
                lastId.current = data.messages[data.messages.length - 1].id;
                setMessages((prev) => [...prev, ...data.messages.filter((m) => !prev.some((p) => p.id === m.id))]);
            }
        } finally {
            setLoading(false);
        }
    }, [conversation.id]);

    useEffect(() => {
        load();
    }, [load]);
    usePoll(load, 3000);

    useEffect(() => {
        list.current?.scrollTo({ top: list.current.scrollHeight });
    }, [messages.length]);

    const send = async () => {
        const body = text.trim();
        if ((!body && !attach.image) || sending || attach.preparing) return;
        setSending(true);
        setError(null);
        try {
            const { message } = await sendForm<{ message: ChatMessage }>(`/admin/chat/${conversation.id}/messages`, { body, image: attach.image });
            lastId.current = Math.max(lastId.current, message.id);
            setMessages((prev) => [...prev, message]);
            setText('');
            attach.clear();
            onSent();
        } catch (e) {
            setError((e as { status?: number; message?: string }).status === 422 ? (e as Error).message : 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง');
        } finally {
            setSending(false);
        }
    };

    const remove = () => {
        if (confirm(`ลบแชทกับ ${conversation.name} ทั้งหมด? ย้อนกลับไม่ได้`)) router.delete(`/admin/chat/${conversation.id}`);
    };

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <button type="button" onClick={onBack} className="-ml-1 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-800" aria-label="กลับไปรายการ">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar name={conversation.name} src={conversation.avatar} />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{conversation.name}</p>
                    {conversation.email && (
                        <a href={`mailto:${conversation.email}`} className="truncate text-xs text-zinc-500 hover:underline">
                            {conversation.email}
                        </a>
                    )}
                </div>
                <button type="button" onClick={remove} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" title="ลบแชทนี้" aria-label="ลบแชทนี้">
                    <Trash2 className="h-4 w-4" />
                </button>
            </header>
            <div ref={list} className="flex-1 space-y-2 overflow-y-auto bg-zinc-50 px-4 py-4 dark:bg-zinc-950/40" aria-live="polite">
                {loading && <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-zinc-400" />}
                {messages.map((m) => (
                    <div key={m.id} className={clsx('flex flex-col', m.from_admin ? 'items-end' : 'items-start')}>
                        {m.image && (
                            <div className="mb-1 max-w-[80%]">
                                <MessageImage src={m.image} onLoad={() => list.current?.scrollTo({ top: list.current.scrollHeight })} />
                            </div>
                        )}
                        {m.body && (
                            <div
                                className={clsx(
                                    'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap',
                                    m.from_admin ? 'rounded-br-md bg-violet-600 text-white' : 'rounded-bl-md bg-white shadow-sm dark:bg-zinc-800',
                                )}
                            >
                                {m.body}
                            </div>
                        )}
                        <span className="mt-0.5 px-1 text-[11px] text-zinc-400">
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
                className="border-t border-zinc-100 p-3 dark:border-zinc-800"
            >
                {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
                <AttachPreview chat={attach} className="text-zinc-500" />
                <div className="flex items-end gap-2">
                    <AttachButton chat={attach} className="h-10 w-9 text-zinc-500 hover:text-zinc-900 dark:hover:text-white" />
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        onPaste={attach.onPaste}
                        rows={2}
                        maxLength={4000}
                        placeholder="พิมพ์ตอบกลับ… (Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่)"
                        aria-label="ข้อความตอบกลับ"
                        className="max-h-40 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <button type="submit" disabled={(!text.trim() && !attach.image) || sending || attach.preparing} className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white disabled:opacity-40" aria-label="ส่ง">
                        {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
    return src ? (
        <img src={src} alt="" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-full object-cover" />
    ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">{Array.from(name)[0]}</span>
    );
}
