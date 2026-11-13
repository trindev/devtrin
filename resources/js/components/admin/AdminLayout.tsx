import type { SharedProps } from '@/types';
import DisplayControls from '@/components/DisplayControls';
import { ConfirmHost } from '@/components/ui/confirm-dialog';
import { Head, Link, usePage } from '@inertiajs/react';
import clsx from 'clsx';
import { usePush } from '@/lib/push';
import { Bell, BellOff, CircleCheck, ExternalLink, FolderKanban, LayoutDashboard, LoaderCircle, LogOut, Mail, MessagesSquare, Settings, Stethoscope, TriangleAlert, UserRound, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

const nav = [
    { href: '/admin', label: 'ภาพรวม', icon: LayoutDashboard, match: (u: string) => u === '/admin' },
    { href: '/admin/projects', label: 'โปรเจกต์', icon: FolderKanban, match: (u: string) => u.startsWith('/admin/projects') },
    { href: '/admin/chat', label: 'แชท', icon: MessagesSquare, match: (u: string) => u.startsWith('/admin/chat') },
    { href: '/admin/mail', label: 'อีเมล', icon: Mail, match: (u: string) => u.startsWith('/admin/mail') },
    { href: '/admin/settings', label: 'ตั้งค่าเว็บ', icon: Settings, match: (u: string) => u.startsWith('/admin/settings') },
    { href: '/admin/account', label: 'บัญชีของฉัน', icon: UserRound, match: (u: string) => u.startsWith('/admin/account') },
];

export default function AdminLayout({ title, children, wide = false }: { title: string; children: ReactNode; wide?: boolean }) {
    const { url, props } = usePage<SharedProps>();
    const { flash, auth, app, site, adminBadges, push } = props;
    const notify = usePush(push);
    const badge = (href: string) => (href === '/admin/chat' ? (adminBadges?.chat ?? 0) : 0);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (flash.success) setToast({ type: 'success', text: flash.success });
        else if (flash.error) setToast({ type: 'error', text: flash.error });
    }, [flash.success, flash.error]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    const path = url.split('?')[0];
    const linkClass = (active: boolean) =>
        clsx(
            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
            active ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
        );

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
            <Head title={`${title} · หลังบ้าน ${site.site_name}`} />
            <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-zinc-200 bg-white p-4 lg:flex dark:border-zinc-800 dark:bg-zinc-900">
                <Link href="/admin" className="mb-8 flex items-center gap-2 px-3 pt-2 font-display text-xl font-bold">
                    <img src="/favicon.svg" alt="" className="mr-0.5 h-8 w-8 rounded-lg" />
                    <span>
                        {site.site_name.toLowerCase()}
                        <span className="text-violet-600">.</span>
                    </span>
                    <span className="ml-1 rounded-md bg-zinc-100 px-1.5 py-0.5 font-sans text-[11px] font-medium text-zinc-500 dark:bg-zinc-800">admin</span>
                </Link>
                <nav className="flex flex-1 flex-col gap-1" aria-label="เมนูหลังบ้าน">
                    {nav.map((item) => (
                        <Link key={item.href} href={item.href} className={linkClass(item.match(path))}>
                            <item.icon className="h-4 w-4" aria-hidden="true" />
                            <span className="flex-1">{item.label}</span>
                            {badge(item.href) > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-violet-600 px-1.5 text-[11px] font-semibold text-white">{badge(item.href)}</span>}
                        </Link>
                    ))}
                    <a href="/_maintenance" className={linkClass(false)}>
                        <Stethoscope className="h-4 w-4" aria-hidden="true" />
                        ศูนย์ดูแลระบบ
                    </a>
                    <span className="flex-1" />
                    {notify.state !== 'unsupported' && (
                        <button
                            type="button"
                            onClick={notify.toggle}
                            disabled={notify.state === 'busy' || notify.state === 'denied' || notify.state === 'install'}
                            aria-pressed={notify.state === 'on'}
                            className={clsx(linkClass(false), 'w-full disabled:opacity-50')}
                            title={notify.state === 'denied' ? 'เบราว์เซอร์บล็อกการแจ้งเตือน — เปิดในตั้งค่าเว็บไซต์' : notify.state === 'install' ? 'iPhone: เพิ่มเว็บลงหน้าจอโฮมก่อน' : undefined}
                        >
                            {notify.state === 'busy' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : notify.state === 'on' ? <Bell className="h-4 w-4 fill-current" /> : <BellOff className="h-4 w-4" />}
                            {notify.state === 'on' ? 'แจ้งเตือนแชท: เปิด' : notify.state === 'denied' ? 'แจ้งเตือนถูกบล็อก' : 'เปิดแจ้งเตือนแชท'}
                        </button>
                    )}
                    <DisplayControls tone="admin" className="my-3 px-3" />
                    <a href="/" target="_blank" rel="noopener" className={linkClass(false)}>
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        ดูหน้าเว็บ
                    </a>
                    <Link href="/admin/logout" method="post" as="button" className={clsx(linkClass(false), 'w-full')}>
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        ออกจากระบบ
                    </Link>
                </nav>
                <p className="mt-4 px-3 text-xs text-zinc-400">
                    {auth.user?.email}
                    <br />v{app.version}
                </p>
            </aside>

            {/* มือถือ: เมนูเป็นแถบเลื่อนด้านบน */}
            <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-900/90">
                <div className="flex h-14 items-center gap-2 px-4">
                    <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-bold">
                        <img src="/favicon.svg" alt="" className="h-7 w-7 rounded-lg" />
                        <span>
                            {site.site_name.toLowerCase()}
                            <span className="text-violet-600">.</span>
                        </span>
                    </Link>
                    <span className="flex-1" />
                    <a href="/" target="_blank" rel="noopener" className="rounded-lg p-2 text-zinc-500" aria-label="ดูหน้าเว็บ">
                        <ExternalLink className="h-4 w-4" />
                    </a>
                    <Link href="/admin/logout" method="post" as="button" className="rounded-lg p-2 text-zinc-500" aria-label="ออกจากระบบ">
                        <LogOut className="h-4 w-4" />
                    </Link>
                </div>
                <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="เมนูหลังบ้าน">
                    {nav.map((item) => (
                        <Link key={item.href} href={item.href} className={clsx(linkClass(item.match(path)), 'shrink-0 py-1.5')}>
                            {item.label}
                            {badge(item.href) > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-violet-600 px-1.5 text-[11px] font-semibold text-white">{badge(item.href)}</span>}
                        </Link>
                    ))}
                    <a href="/_maintenance" className={clsx(linkClass(false), 'shrink-0 py-1.5')}>
                        ดูแลระบบ
                    </a>
                </nav>
                <DisplayControls tone="admin" className="px-4 pb-3" />
            </header>

            <main className="px-4 py-6 lg:ml-64 lg:px-10 lg:py-10">
                <div className={clsx('mx-auto', wide ? 'max-w-[90rem]' : 'max-w-5xl')}>{children}</div>
            </main>

            <ConfirmHost />
            {toast && (
                <div
                    role="status"
                    className={clsx(
                        'fixed right-4 bottom-4 left-4 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-lg sm:left-auto sm:max-w-sm',
                        toast.type === 'success' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-red-600 text-white',
                    )}
                >
                    {toast.type === 'success' ? <CircleCheck className="h-5 w-5 shrink-0 text-emerald-400 dark:text-emerald-600" /> : <TriangleAlert className="h-5 w-5 shrink-0" />}
                    <span className="flex-1">{toast.text}</span>
                    <button type="button" onClick={() => setToast(null)} className="rounded p-1 opacity-70 hover:opacity-100" aria-label="ปิด">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
