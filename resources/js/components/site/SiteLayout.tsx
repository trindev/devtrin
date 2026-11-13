import { gsap, reducedMotion, ScrollTrigger, scrollToTarget, startSmoothScroll, stopSmoothScroll } from '@/lib/motion';
import type { SharedProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import ChatWidget from './ChatWidget';
import Magnetic from './Magnetic';
import DisplayControls from '@/components/DisplayControls';

export default function SiteLayout({ children }: { children: ReactNode }) {
    const { site, auth, flash } = usePage<SharedProps>().props;
    const nav = useRef<HTMLElement>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        startSmoothScroll();
        scrollToTarget(0, true);
        // ฟอนต์โหลดเสร็จ = ความสูงของหัวข้อเปลี่ยน → คำนวณตำแหน่ง ScrollTrigger ใหม่
        document.fonts?.ready.then(() => ScrollTrigger.refresh());

        // ซ่อน nav เมื่อเลื่อนลง แสดงเมื่อเลื่อนขึ้น
        const st = ScrollTrigger.create({
            start: 0,
            end: 'max',
            onUpdate: (self) => {
                if (!nav.current) return;
                const hide = self.direction === 1 && self.scroll() > 160;
                gsap.to(nav.current, { yPercent: hide ? -110 : 0, duration: 0.45, ease: 'power3.out', overwrite: true });
                nav.current.dataset.scrolled = String(self.scroll() > 40);
            },
        });
        return () => {
            st.kill();
            stopSmoothScroll();
        };
    }, []);

    const go = (hash: string) => (e: React.MouseEvent) => {
        if (window.location.pathname !== '/') return; // อยู่หน้าอื่น → ให้ลิงก์พากลับหน้าแรกตามปกติ
        e.preventDefault();
        setOpen(false);
        scrollToTarget(hash);
    };

    const links = [
        ['#work', 'ผลงาน'],
        ['#about', 'เกี่ยวกับ'],
        ['#contact', 'ติดต่อ'],
    ] as const;

    return (
        <div className="site min-h-screen">
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-lime focus:px-4 focus:py-2 focus:text-dark">
                ข้ามไปเนื้อหา
            </a>
            <header
                ref={nav}
                className="group fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter] duration-300 data-[scrolled=true]:bg-ink/70 data-[scrolled=true]:backdrop-blur-xl"
            >
                <nav className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 md:h-20 md:px-8" aria-label="เมนูหลัก">
                    <Link href="/" className="font-display text-xl font-bold tracking-tight" aria-label={`${site.site_name} หน้าแรก`}>
                        {site.site_name.toLowerCase()}
                        <span className="text-lime">.</span>
                    </Link>
                    <span className="flex-1" />
                    <ul className="hidden items-center gap-8 text-sm text-paper/70 md:flex">
                        {links.map(([hash, label]) => (
                            <li key={hash}>
                                <a href={`/${hash}`} onClick={go(hash)} className="transition hover:text-paper">
                                    {label}
                                </a>
                            </li>
                        ))}
                    </ul>
                    <DisplayControls tone="site" className="hidden md:flex" />
                    {site.availability && (
                        <span className="hidden items-center gap-2 rounded-full border border-paper/10 px-3 py-1.5 text-xs text-paper/80 sm:inline-flex">
                            <span className="relative flex h-2 w-2">
                                <span className="ping-soft absolute inline-flex h-full w-full rounded-full bg-lime" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
                            </span>
                            {site.availability}
                        </span>
                    )}
                    <button
                        type="button"
                        className="relative z-50 -mr-2 grid h-10 w-10 place-items-center md:hidden"
                        aria-expanded={open}
                        aria-controls="mobile-menu"
                        aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
                        onClick={() => setOpen((v) => !v)}
                    >
                        <span className={`absolute h-px w-6 bg-paper transition ${open ? 'rotate-45' : '-translate-y-1'}`} />
                        <span className={`absolute h-px w-6 bg-paper transition ${open ? '-rotate-45' : 'translate-y-1'}`} />
                    </button>
                </nav>
                <div
                    id="mobile-menu"
                    className={`fixed inset-0 z-40 flex flex-col justify-end bg-ink px-4 pb-12 transition-[clip-path] duration-700 ease-out-expo md:hidden ${open ? '[clip-path:inset(0_0_0_0)]' : 'pointer-events-none [clip-path:inset(0_0_100%_0)]'}`}
                    aria-hidden={!open}
                >
                    {links.map(([hash, label]) => (
                        <a key={hash} href={`/${hash}`} onClick={go(hash)} tabIndex={open ? 0 : -1} className="border-b border-paper/10 py-4 font-display text-5xl font-semibold">
                            {label}
                        </a>
                    ))}
                    {open && <DisplayControls tone="site" className="mt-8" />}
                </div>
            </header>

            <main id="main">{children}</main>

            <ChatWidget />
            <SiteFlash text={flash.error || flash.success} />

            <footer className="border-t border-paper/10">
                <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-8 text-sm text-mute md:flex-row md:items-center md:px-8">
                    <span>
                        © {new Date().getFullYear()} {site.site_name}
                        {site.location && ` · ${site.location}`}
                    </span>
                    <span className="flex-1" />
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {site.github_url && <FooterLink href={site.github_url}>GitHub</FooterLink>}
                        {site.facebook_url && <FooterLink href={site.facebook_url}>Facebook</FooterLink>}
                        {site.line_url && <FooterLink href={site.line_url}>LINE</FooterLink>}
                        <Link href={auth.user?.is_admin ? '/admin' : '/admin/login'} className="hover:text-paper">
                            {auth.user?.is_admin ? 'หลังบ้าน' : 'Admin'}
                        </Link>
                    </div>
                    <button
                        type="button"
                        onClick={() => scrollToTarget(0)}
                        className="self-start rounded-full border border-paper/10 px-4 py-2 text-paper/80 transition hover:border-lime hover:text-lime md:self-auto"
                    >
                        กลับขึ้นบน ↑
                    </button>
                </div>
            </footer>
        </div>
    );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-paper">
            {children}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
    );
}

/** ส่วนท้ายสำหรับติดต่อ — ใช้ทั้งหน้าแรกและหน้ารายละเอียด */
export function ContactSection() {
    const { site } = usePage<SharedProps>().props;
    const root = useRef<HTMLElement>(null);

    useEffect(() => {
        if (reducedMotion() || !root.current) return;
        const ctx = gsap.context(() => {
            gsap.from('.contact-title', {
                scale: 0.82,
                opacity: 0.2,
                ease: 'none',
                scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 25%', scrub: true },
            });
        }, root);
        return () => ctx.revert();
    }, []);

    const primary = site.email ? `mailto:${site.email}` : site.line_url || site.facebook_url || null;
    const channels = [
        site.email && { label: site.email, href: `mailto:${site.email}` },
        site.phone && { label: site.phone, href: `tel:${site.phone.replace(/[^\d+]/g, '')}` },
        site.line_url && { label: 'LINE', href: site.line_url },
        site.facebook_url && { label: 'Facebook', href: site.facebook_url },
        site.github_url && { label: 'GitHub', href: site.github_url },
    ].filter(Boolean) as { label: string; href: string }[];

    return (
        <section id="contact" ref={root} className="relative overflow-hidden px-4 py-28 md:px-8 md:py-44">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-[radial-gradient(60%_80%_at_50%_100%,rgb(200_255_61/0.16),transparent)]" />
            <div className="relative mx-auto max-w-[1400px] text-center">
                <p className="mb-6 font-mono text-xs tracking-[0.25em] text-mute uppercase">Contact</p>
                <h2 className="contact-title mx-auto max-w-5xl font-display text-[clamp(2.5rem,8vw,7.5rem)] leading-[1.02] font-bold tracking-tight text-balance">
                    {site.contact_title}
                </h2>
                {primary && (
                    <div className="mt-12">
                        <Magnetic>
                            <a
                                href={primary}
                                target={primary.startsWith('http') ? '_blank' : undefined}
                                rel="noopener noreferrer"
                                className="group inline-flex h-16 items-center gap-3 rounded-full bg-lime px-8 text-lg font-semibold text-dark transition-transform hover:scale-[1.03] md:h-20 md:px-12 md:text-xl"
                            >
                                คุยกันเลย
                                <ArrowUpRight className="h-6 w-6 transition-transform duration-500 ease-out-expo group-hover:rotate-45" aria-hidden="true" />
                            </a>
                        </Magnetic>
                    </div>
                )}
                {channels.length > 0 && (
                    <ul className="mt-10 flex flex-wrap justify-center gap-3">
                        {channels.map((c) => (
                            <li key={c.href}>
                                <a
                                    href={c.href}
                                    target={c.href.startsWith('http') ? '_blank' : undefined}
                                    rel="noopener noreferrer"
                                    className="inline-flex rounded-full border border-paper/15 px-5 py-2.5 text-sm text-paper/80 transition hover:border-paper hover:text-paper"
                                >
                                    {c.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

/** ข้อความแจ้งสั้น ๆ (เช่น login Google ไม่สำเร็จ) — หายเองใน 5 วินาที */
function SiteFlash({ text }: { text: string | null }) {
    const [shown, setShown] = useState(text);
    useEffect(() => {
        setShown(text);
        if (!text) return;
        const t = setTimeout(() => setShown(null), 5000);
        return () => clearTimeout(t);
    }, [text]);
    if (!shown) return null;
    return (
        <p role="status" className="fixed top-20 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-full bg-paper px-5 py-2.5 text-center text-sm font-medium text-ink shadow-xl">
            {shown}
        </p>
    );
}
