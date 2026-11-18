import CoverWall from '@/components/site/home/CoverWall';
import Intro, { shouldPlayIntro } from '@/components/site/home/Intro';
import ShaderBackdrop from '@/components/site/home/ShaderBackdrop';
import Magnetic from '@/components/site/Magnetic';
import Marquee from '@/components/site/Marquee';
import ProjectArt from '@/components/site/ProjectArt';
import SiteLayout, { ContactSection } from '@/components/site/SiteLayout';
import SplitWords from '@/components/site/SplitWords';
import { gsap, revealWords, ScrollTrigger, scrollToTarget, useGSAP } from '@/lib/motion';
import type { Project, SharedProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import clsx from 'clsx';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

interface Props extends SharedProps {
    projects: Project[];
    stats: { projects: number; live: number; tech: number; since: number | null };
}

interface Group {
    name: string;
    items: Project[];
    tech: string[];
    accent: string;
}

export default function Home() {
    const { projects, stats, site } = usePage<Props>().props;
    const root = useRef<HTMLDivElement>(null);
    const [intro] = useState(shouldPlayIntro); // เล่นฉากเปิดเฉพาะครั้งแรกของแท็บ
    const [ready, setReady] = useState(!intro); // hero เริ่มเล่นเมื่อฉากเปิดจบ
    const [filter, setFilter] = useState<string | null>(null);

    const featured = projects.filter((p) => p.is_featured);
    const tech = useMemo(() => [...new Set(projects.flatMap((p) => p.tech_stack ?? []))], [projects]);

    // "ทำอะไรได้บ้าง" สร้างจากหมวดของโปรเจกต์จริง (ไม่ใช่ข้อความขายของที่เขียนเอง)
    const groups = useMemo<Group[]>(() => {
        const map = new Map<string, Project[]>();
        projects.forEach((p) => p.category && map.set(p.category, [...(map.get(p.category) ?? []), p]));
        return [...map.entries()]
            .map(([name, items]) => ({ name, items, tech: [...new Set(items.flatMap((p) => p.tech_stack ?? []))].slice(0, 5), accent: items[0].accent }))
            .sort((a, b) => b.items.length - a.items.length)
            .slice(0, 5);
    }, [projects]);

    // ── hero: เล่นหลังฉากเปิดจบ (หรือทันทีถ้าไม่มีฉากเปิด)
    useGSAP(
        () => {
            if (!ready) return;
            const mm = gsap.matchMedia();
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.timeline({ defaults: { ease: 'expo.out' } })
                    .add(revealWords(document.querySelector('.hero-title'), { rotate: 3, duration: 1.3 })!)
                    .from('.hero-fade', { y: 26, opacity: 0, duration: 1, stagger: 0.08 }, '-=1')
                    .from('.wall-shift', { opacity: 0, yPercent: 8, duration: 2, ease: 'power3.out' }, 0);
            });
            return () => mm.revert();
        },
        { scope: root, dependencies: [ready] },
    );

    // ── แอนิเมชันตามการเลื่อน
    useGSAP(
        () => {
            const mm = gsap.matchMedia();

            mm.add('(prefers-reduced-motion: no-preference)', () => {
                // hero: ข้อความเลื่อนช้ากว่าและจางออก · กำแพงผลงานเลื่อนสวนขึ้น
                gsap.to('.hero-inner', { yPercent: 18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
                gsap.to('.wall', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

                // about: คำค่อย ๆ สว่างขึ้นตามการเลื่อน
                gsap.fromTo(
                    '.about-text .split-word',
                    { opacity: 0.14 },
                    { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.about-text', start: 'top 80%', end: 'bottom 45%', scrub: true } },
                );

                // ตัวเลขนับขึ้น
                gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => {
                    const to = Number(el.dataset.to);
                    const obj = { v: to > 1000 ? to - 12 : 0 };
                    gsap.to(obj, {
                        v: to,
                        duration: 1.6,
                        ease: 'power3.out',
                        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
                        onUpdate: () => (el.textContent = String(Math.round(obj.v))),
                    });
                });

                // หัวข้อของแต่ละส่วน
                gsap.utils.toArray<HTMLElement>('.reveal-heading').forEach((el) => {
                    revealWords(el, { duration: 1.1, stagger: 0.04, scrollTrigger: { trigger: el, start: 'top 85%' } });
                });

                // การ์ด bento โผล่ทีละใบ
                ScrollTrigger.batch('.bento-card', {
                    start: 'top 90%',
                    once: true,
                    onEnter: (cards) => gsap.from(cards, { y: 60, opacity: 0, scale: 0.96, duration: 1.1, ease: 'expo.out', stagger: 0.09, overwrite: true }),
                });

                // ผลงานเด่น: การ์ดใบก่อนหน้าย่อและจางลงเมื่อใบถัดไปเลื่อนขึ้นมาทับ + ภาพปกเลื่อนช้ากว่ากรอบ
                const cards = gsap.utils.toArray<HTMLElement>('.stack-card');
                cards.forEach((card, i) => {
                    const next = cards[i + 1];
                    if (next) {
                        gsap.to(card.querySelector('.stack-inner'), {
                            scale: 0.9,
                            opacity: 0.4,
                            ease: 'none',
                            scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 14%', scrub: true },
                        });
                    }
                    gsap.fromTo(
                        card.querySelector('.stack-img'),
                        { yPercent: 7 },
                        { yPercent: -7, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } },
                    );
                });

                // แถวในรายการผลงาน
                ScrollTrigger.batch('.work-row', {
                    start: 'top 92%',
                    once: true,
                    onEnter: (rows) => gsap.from(rows, { y: 48, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, overwrite: true }),
                });

                // ชื่อเว็บตัวยักษ์ท้ายหน้า เลื่อนขึ้นมาจากใต้ขอบ
                gsap.from('.wordmark-text', { yPercent: 55, ease: 'none', scrollTrigger: { trigger: '.wordmark', start: 'top bottom', end: 'bottom bottom', scrub: true } });
            });

            return () => mm.revert();
        },
        { scope: root, dependencies: [projects.length] },
    );

    const pickGroup = (name: string) => {
        setFilter(name);
        requestAnimationFrame(() => scrollToTarget('#work'));
    };

    return (
        <div ref={root}>
            <Head title={`${site.site_name} — ${site.hero_title}`} />
            {intro && <Intro name={site.site_name} onDone={() => setReady(true)} />}

            {/* ───────────── HERO ───────────── */}
            <section className="hero relative flex min-h-[100svh] items-end overflow-hidden px-4 pt-28 pb-12 md:px-8 md:pb-16">
                {/* ชั้นพื้นหลัง: ก้อนแสง CSS (สำรองเมื่อไม่มี WebGL) → shader → กำแพงผลงาน */}
                <div className="absolute inset-0" aria-hidden="true">
                    <div className="blob absolute -top-[10%] left-[8%] h-[55vmax] w-[55vmax] rounded-full bg-[#7c5cff]/25 blur-[120px]" />
                    <div className="blob absolute -bottom-[25%] left-[30%] h-[40vmax] w-[40vmax] rounded-full bg-[#16a3a3]/20 blur-[120px] [animation-delay:-12s]" />
                    <ShaderBackdrop className="absolute inset-0" />
                    <div className="grid-lines absolute inset-0 opacity-70" />
                </div>
                <CoverWall projects={projects} />

                <div className="hero-inner relative mx-auto w-full max-w-[1400px]">
                    {site.hero_eyebrow && (
                        <p className="hero-fade mb-6 flex items-center gap-3 font-mono text-xs tracking-[0.25em] text-paper/70 uppercase md:mb-8">
                            <span className="h-px w-10 bg-lime" aria-hidden="true" />
                            {site.hero_eyebrow}
                        </p>
                    )}
                    <SplitWords
                        as="h1"
                        text={site.hero_title}
                        className="hero-title font-display text-[clamp(2.9rem,9vw,8.75rem)] leading-[1.06] font-bold tracking-[-0.035em] text-balance md:max-w-[64vw]"
                    />
                    <div className="mt-9 flex flex-col gap-8 md:mt-12 md:flex-row md:items-end md:justify-between">
                        <p className="hero-fade max-w-xl text-lg leading-relaxed text-paper/75 md:text-xl">{site.hero_subtitle}</p>
                        <div className="hero-fade flex flex-wrap items-center gap-3">
                            <Magnetic>
                                <a
                                    href="#work"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToTarget('#work');
                                    }}
                                    className="group inline-flex h-14 items-center gap-3 rounded-full bg-lime px-7 font-semibold text-dark transition hover:scale-[1.03]"
                                >
                                    ดูผลงาน
                                    <ArrowDown className="h-5 w-5 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
                                </a>
                            </Magnetic>
                            <a
                                href="#contact"
                                onClick={(e) => {
                                    e.preventDefault();
                                    scrollToTarget('#contact');
                                }}
                                className="inline-flex h-14 items-center rounded-full border border-paper/25 bg-ink/30 px-7 font-medium text-paper backdrop-blur transition hover:border-paper"
                            >
                                ติดต่อ
                            </a>
                        </div>
                    </div>

                    {/* แถบล่างของ hero: ตัวเลขสั้น ๆ + เส้นบอกให้เลื่อน */}
                    <div className="hero-fade mt-12 flex items-end justify-between gap-6 border-t border-paper/10 pt-6 md:mt-16">
                        <dl className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-paper/60">
                            <div className="flex items-baseline gap-2">
                                <dd className="font-display text-2xl font-bold text-paper">{stats.projects}</dd>
                                <dt>โปรเจกต์</dt>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <dd className="font-display text-2xl font-bold text-paper">{stats.live}</dd>
                                <dt>ออนไลน์อยู่</dt>
                            </div>
                            <div className="hidden items-baseline gap-2 sm:flex">
                                <dd className="font-display text-2xl font-bold text-paper">{stats.tech}</dd>
                                <dt>เทคโนโลยี</dt>
                            </div>
                        </dl>
                        <span className="hidden items-center gap-3 font-mono text-xs tracking-[0.2em] text-paper/50 uppercase md:flex" aria-hidden="true">
                            Scroll
                            <span className="relative block h-10 w-px bg-paper/15">
                                <span className="scroll-hint absolute inset-0 bg-lime" />
                            </span>
                        </span>
                    </div>
                </div>
            </section>

            {/* ───────────── TECH MARQUEE ───────────── */}
            {tech.length > 0 && (
                <div className="border-y border-paper/10 py-6 font-display text-3xl font-semibold tracking-tight text-paper/90 md:py-8 md:text-5xl">
                    <Marquee items={tech} />
                </div>
            )}

            {/* ───────────── ABOUT ───────────── */}
            <section id="about" className="px-4 py-28 md:px-8 md:py-44">
                <div className="mx-auto grid max-w-[1400px] gap-16 md:grid-cols-12">
                    <p className="font-mono text-xs tracking-[0.25em] text-mute uppercase md:col-span-3">About</p>
                    <div className="md:col-span-9">
                        <SplitWords
                            as="p"
                            variant="plain"
                            text={site.about}
                            className="about-text font-display text-[clamp(1.6rem,3.6vw,3.25rem)] leading-[1.25] font-medium tracking-tight"
                        />
                        <dl className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-paper/10 bg-paper/10 md:grid-cols-4">
                            <Stat label="โปรเจกต์" value={stats.projects} />
                            <Stat label="ออนไลน์อยู่" value={stats.live} />
                            <Stat label="เทคโนโลยี" value={stats.tech} />
                            {stats.since ? <Stat label="เริ่มตั้งแต่" value={stats.since} /> : <Stat label="ดูแลเอง" value={100} suffix="%" />}
                        </dl>
                    </div>
                </div>
            </section>

            {/* ───────────── CAPABILITIES (bento จากหมวดจริง) ───────────── */}
            {groups.length > 0 && (
                <section className="px-4 pb-28 md:px-8 md:pb-40" aria-labelledby="cap-heading">
                    <div className="mx-auto max-w-[1400px]">
                        <div className="mb-12 flex flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="mb-4 font-mono text-xs tracking-[0.25em] text-mute uppercase">Capabilities</p>
                                <SplitWords as="h2" text="ทำอะไรได้บ้าง" className="reveal-heading font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.1] font-bold tracking-tight" />
                                <span id="cap-heading" className="sr-only">
                                    ทำอะไรได้บ้าง
                                </span>
                            </div>
                            <p className="max-w-sm text-paper/60">แบ่งตามประเภทงานที่ส่งมอบจริง กดการ์ดเพื่อดูผลงานในหมวดนั้น</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-6 md:gap-5">
                            {groups.map((g, i) => (
                                <BentoCard key={g.name} group={g} index={i} span={bentoSpan(i, groups.length)} onPick={() => pickGroup(g.name)} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ───────────── FEATURED (การ์ดซ้อนทับ) ───────────── */}
            {featured.length > 0 && (
                <section className="px-4 pb-10 md:px-8" aria-label="ผลงานเด่น">
                    <div className="mx-auto max-w-[1400px]">
                        <div className="mb-10 flex items-end justify-between md:mb-14">
                            <div>
                                <p className="mb-4 font-mono text-xs tracking-[0.25em] text-mute uppercase">Selected work</p>
                                <SplitWords as="h2" text="ผลงานเด่น" className="reveal-heading font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.1] font-bold tracking-tight" />
                            </div>
                            <p className="hidden font-mono text-xs tracking-[0.2em] text-mute uppercase md:block">
                                {String(featured.length).padStart(2, '0')} โปรเจกต์
                            </p>
                        </div>
                        {featured.map((p, i) => (
                            <FeaturedCard key={p.id} project={p} index={i} total={featured.length} />
                        ))}
                    </div>
                </section>
            )}

            {/* ───────────── ALL WORK ───────────── */}
            <WorkIndex projects={projects} filter={filter} onFilter={setFilter} />

            <Marquee items={[site.site_name, 'Design', 'Develop', 'Deploy', 'Maintain']} reverse className="border-y border-paper/10 py-5 font-display text-2xl text-paper/40 md:text-4xl" />

            <ContactSection />

            {/* ชื่อเว็บตัวยักษ์ปิดท้าย */}
            <div className="wordmark overflow-hidden px-4 md:px-8" aria-hidden="true">
                <p className="wordmark-text text-center font-display text-[24vw] leading-[0.78] font-extrabold tracking-[-0.06em] whitespace-nowrap text-paper/[0.08] select-none">
                    {site.site_name.toLowerCase()}
                    <span className="text-lime">.</span>
                </p>
            </div>
        </div>
    );
}

Home.layout = (page: React.ReactNode) => <SiteLayout>{page}</SiteLayout>;

function Stat({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
    return (
        <div className="bg-ink p-6 md:p-8">
            <dt className="text-sm text-mute">{label}</dt>
            <dd className="mt-2 font-display text-5xl font-bold tracking-tight md:text-6xl">
                <span className="stat-num" data-to={value}>
                    {value}
                </span>
                {suffix}
            </dd>
        </div>
    );
}

/** ความกว้างของการ์ด bento (จาก 6 คอลัมน์) ให้เรียงเต็มแถวพอดีตามจำนวนหมวด */
function bentoSpan(i: number, n: number): string {
    const layouts: Record<number, number[]> = { 1: [6], 2: [3, 3], 3: [4, 2, 6], 4: [4, 2, 2, 4], 5: [4, 2, 2, 2, 2] };
    const span = (layouts[n] ?? layouts[5])[i] ?? 2;
    return { 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4', 6: 'md:col-span-6' }[span]!;
}

function BentoCard({ group, index, span, onPick }: { group: Group; index: number; span: string; onPick: () => void }) {
    const covers = group.items.slice(0, 3);
    const wide = span === 'md:col-span-4' || span === 'md:col-span-6';
    return (
        <button
            type="button"
            onClick={onPick}
            onPointerMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
            }}
            data-cursor="ดูผลงาน"
            style={{ ['--spot' as string]: group.accent }}
            className={clsx(
                'bento-card spot group flex min-h-[21rem] flex-col overflow-hidden rounded-[1.75rem] border border-paper/10 bg-ink-2 p-6 text-left transition-colors duration-500 hover:border-paper/25 md:p-8',
                wide && 'md:flex-row md:gap-6',
                span,
            )}
        >
            <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-mute">{String(index + 1).padStart(2, '0')}</span>
                    <span className="rounded-full border border-paper/15 px-3 py-1 text-xs text-paper/70">{group.items.length} โปรเจกต์</span>
                </div>
                <h3 className="mt-8 font-display text-4xl font-bold tracking-tight md:text-5xl">{group.name}</h3>
                {group.tech.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                        {group.tech.map((t) => (
                            <li key={t} className="rounded-full bg-paper/[0.07] px-2.5 py-1 text-xs text-paper/70">
                                {t}
                            </li>
                        ))}
                    </ul>
                )}
                <span className="mt-auto inline-flex items-center gap-3 pt-8 text-sm font-medium text-paper/80">
                    <span className="grid h-11 w-11 place-items-center rounded-full border border-paper/15 transition-all duration-500 ease-out-expo group-hover:rotate-45 group-hover:border-transparent group-hover:bg-[var(--spot)] group-hover:text-dark">
                        <ArrowUpRight className="h-5 w-5" />
                    </span>
                    <span className={wide ? '' : 'sr-only'}>ดูผลงานหมวดนี้</span>
                </span>
            </div>

            {/* ภาพปกซ้อนแบบพัด — กางออกเมื่อชี้ · การ์ดกว้าง: อยู่ฝั่งขวาและใหญ่ขึ้น */}
            <div
                className={clsx('relative mt-8 h-28 shrink-0 [--spread:1] group-hover:[--spread:1.2]', wide ? 'md:mt-0 md:h-52 md:w-[54%] md:self-end' : 'md:h-32')}
                aria-hidden="true"
            >
                {covers.map((p, i) => (
                    <div
                        key={p.id}
                        className="absolute bottom-0 left-0 h-full transition-transform duration-700 ease-out-expo"
                        style={{ transform: `translateX(calc(${i * 30}% * var(--spread))) rotate(${(i - (covers.length - 1) / 2) * 5}deg)`, zIndex: i }}
                    >
                        <ProjectArt project={p} className="aspect-[16/10] h-full rounded-xl border border-paper/10 shadow-xl" imgClassName="!text-4xl" />
                    </div>
                ))}
            </div>
        </button>
    );
}

function FeaturedCard({ project: p, index, total }: { project: Project; index: number; total: number }) {
    return (
        <article className="stack-card sticky mb-[9svh] last:mb-0" style={{ top: `calc(5.25rem + ${index * 0.9}rem)` }}>
            <Link
                href={`/projects/${p.slug}`}
                data-cursor="ดู"
                className="stack-inner group grid origin-top overflow-hidden rounded-[2rem] border border-paper/10 bg-ink-2 shadow-2xl shadow-black/30 will-change-transform md:min-h-[76svh] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
            >
                <div className="order-2 flex flex-col justify-between gap-8 p-6 md:order-1 md:p-12">
                    <p className="flex items-center gap-3 font-mono text-xs text-mute">
                        <span className="h-2 w-2 rounded-full" style={{ background: p.accent }} />
                        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                        {p.category && ` · ${p.category}`}
                    </p>
                    <div>
                        <h3 className="font-display text-[clamp(2.25rem,5vw,4.75rem)] leading-[1.05] font-bold tracking-tight">{p.title}</h3>
                        {p.tagline && <p className="mt-4 max-w-md text-lg leading-relaxed text-paper/70">{p.tagline}</p>}
                        {(p.tech_stack ?? []).length > 0 && (
                            <ul className="mt-6 flex flex-wrap gap-2">
                                {(p.tech_stack ?? []).slice(0, 5).map((t) => (
                                    <li key={t} className="rounded-full border border-paper/15 px-3 py-1 text-xs text-paper/75">
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <span className="inline-flex items-center gap-3 font-medium">
                        <span className="grid h-12 w-12 place-items-center rounded-full text-dark transition-transform duration-500 ease-out-expo group-hover:rotate-45" style={{ backgroundColor: p.accent }}>
                            <ArrowUpRight className="h-5 w-5" />
                        </span>
                        ดูรายละเอียด
                    </span>
                </div>
                <div
                    className="relative order-1 flex items-center overflow-hidden p-4 md:order-2 md:p-10"
                    style={{ background: `radial-gradient(110% 90% at 85% 10%, ${p.accent}66, transparent 62%), radial-gradient(90% 80% at 0% 100%, ${p.accent}33, transparent 60%)` }}
                >
                    <div className="grid-lines absolute inset-0 opacity-50" aria-hidden="true" />
                    {/* ภาพปกทั้งใบ (ไม่ครอป) — เลื่อนช้ากว่ากรอบเล็กน้อย และขยายนิดเดียวเมื่อชี้ */}
                    <div className="stack-img relative w-full">
                        <ProjectArt
                            project={p}
                            eager
                            className="aspect-[16/10] w-full rounded-xl shadow-2xl shadow-black/50 transition-transform duration-1000 ease-out-expo group-hover:scale-[1.03] md:rounded-2xl"
                        />
                    </div>
                </div>
            </Link>
        </article>
    );
}

/** รายการผลงานทั้งหมด + ตัวกรองหมวด + รูปตัวอย่างลอยตามเมาส์ */
function WorkIndex({ projects, filter, onFilter }: { projects: Project[]; filter: string | null; onFilter: (c: string | null) => void }) {
    const categories = useMemo(() => [...new Set(projects.map((p) => p.category).filter(Boolean))] as string[], [projects]);
    const [hover, setHover] = useState<Project | null>(null);
    const list = filter ? projects.filter((p) => p.category === filter) : projects;
    const preview = useRef<HTMLDivElement>(null);
    const section = useRef<HTMLElement>(null);

    useGSAP(
        () => {
            if (!window.matchMedia('(pointer: fine)').matches || !preview.current) return;
            const x = gsap.quickTo(preview.current, 'x', { duration: 0.6, ease: 'power3' });
            const y = gsap.quickTo(preview.current, 'y', { duration: 0.6, ease: 'power3' });
            const move = (e: PointerEvent) => {
                x(e.clientX);
                y(e.clientY);
            };
            window.addEventListener('pointermove', move);
            return () => window.removeEventListener('pointermove', move);
        },
        { scope: section },
    );

    useGSAP(
        () => {
            if (!preview.current) return;
            gsap.to(preview.current.firstElementChild, { scale: hover ? 1 : 0, opacity: hover ? 1 : 0, duration: 0.5, ease: 'expo.out' });
        },
        { dependencies: [hover] },
    );

    // เปลี่ยนตัวกรอง (จากปุ่มที่นี่หรือจากการ์ด bento) → คำนวณตำแหน่งเลื่อนใหม่ และให้แถวโผล่อีกรอบ
    const first = useRef(true);
    useGSAP(
        () => {
            if (first.current) {
                first.current = false;
                return;
            }
            ScrollTrigger.refresh();
            gsap.fromTo('.work-row', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.04, overwrite: true });
        },
        { scope: section, dependencies: [filter] },
    );

    return (
        <section id="work" ref={section} className="relative px-4 py-28 md:px-8 md:py-40">
            <div className="mx-auto max-w-[1400px]">
                <div className="mb-12 flex flex-col gap-8 md:mb-16 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="mb-4 font-mono text-xs tracking-[0.25em] text-mute uppercase">
                            Index · {list.length}
                            {filter && ` / ${projects.length}`}
                        </p>
                        <SplitWords as="h2" text="ผลงานทั้งหมด" className="reveal-heading font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.1] font-bold tracking-tight" />
                    </div>
                    {categories.length > 1 && (
                        <div className="flex flex-wrap gap-2" role="group" aria-label="กรองตามหมวด">
                            {[null, ...categories].map((c) => (
                                <button
                                    key={c ?? 'all'}
                                    type="button"
                                    aria-pressed={filter === c}
                                    onClick={() => onFilter(c)}
                                    className="rounded-full border border-paper/15 px-4 py-2 text-sm text-paper/70 transition hover:border-paper hover:text-paper aria-pressed:border-lime aria-pressed:bg-lime aria-pressed:text-dark"
                                >
                                    {c ?? 'ทั้งหมด'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <ul className="border-t border-paper/10" onPointerLeave={() => setHover(null)}>
                    {list.map((p) => (
                        <li key={p.id} className="work-row border-b border-paper/10">
                            <Link
                                href={`/projects/${p.slug}`}
                                onPointerEnter={() => setHover(p)}
                                onFocus={() => setHover(p)}
                                onBlur={() => setHover(null)}
                                className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-6 md:grid-cols-[5rem_1fr_14rem_14rem_auto] md:gap-8 md:py-8"
                            >
                                <span className="font-mono text-xs text-mute">{String(p.sort_order).padStart(2, '0')}</span>
                                <span className="min-w-0">
                                    <span className="block truncate font-display text-2xl font-semibold tracking-tight transition-transform duration-500 ease-out-expo group-hover:translate-x-3 md:text-5xl">
                                        {p.title}
                                    </span>
                                    {p.tagline && <span className="mt-1 block truncate text-sm text-mute md:hidden">{p.tagline}</span>}
                                </span>
                                <span className="hidden truncate text-sm text-mute md:block">{p.category}</span>
                                <span className="hidden truncate font-mono text-xs text-mute md:block">{p.host}</span>
                                <span
                                    className="grid h-10 w-10 place-items-center rounded-full border border-paper/15 transition-all duration-500 ease-out-expo group-hover:rotate-45 group-hover:border-transparent group-hover:text-dark md:h-12 md:w-12"
                                    style={{ ['--a' as string]: p.accent }}
                                    aria-hidden="true"
                                >
                                    <ArrowUpRight className="h-5 w-5" />
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            {/* รูปตัวอย่างลอยตามเมาส์ (เฉพาะจอที่มีเมาส์) */}
            <div ref={preview} className="pointer-events-none fixed top-0 left-0 z-30 hidden [@media(pointer:fine)]:block" aria-hidden="true">
                <div className="-translate-x-1/2 -translate-y-1/2" style={{ transform: 'scale(0)', opacity: 0 }}>
                    {hover && <ProjectArt project={hover} className="aspect-[4/3] w-[22rem] rotate-[-4deg] rounded-2xl shadow-2xl" />}
                </div>
            </div>

            <style>{`.work-row a:hover span[style*="--a"]{background:var(--a)}`}</style>
        </section>
    );
}
