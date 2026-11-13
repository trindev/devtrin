import Magnetic from '@/components/site/Magnetic';
import Marquee from '@/components/site/Marquee';
import ProjectArt from '@/components/site/ProjectArt';
import SiteLayout, { ContactSection } from '@/components/site/SiteLayout';
import SplitWords from '@/components/site/SplitWords';
import { gsap, revealWords, ScrollTrigger, scrollToTarget, useGSAP } from '@/lib/motion';
import type { Project, SharedProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

interface Props extends SharedProps {
    projects: Project[];
    stats: { projects: number; live: number; tech: number; since: number | null };
}

export default function Home() {
    const { projects, stats, site } = usePage<Props>().props;
    const root = useRef<HTMLDivElement>(null);

    const featured = projects.filter((p) => p.is_featured);
    const tech = useMemo(() => {
        const all = projects.flatMap((p) => p.tech_stack ?? []);
        return [...new Set(all)];
    }, [projects]);

    useGSAP(
        () => {
            const mm = gsap.matchMedia();

            mm.add('(prefers-reduced-motion: no-preference)', () => {
                // ── hero: คำโผล่จากใต้เส้นตอนเปิดหน้า แล้วจางออก/เลื่อนช้ากว่าตอนเลื่อนลง (parallax)
                const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
                intro
                    .add(revealWords(document.querySelector('.hero-title'), { rotate: 4, duration: 1.4 })!)
                    .from('.hero-fade', { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, '-=1.05')
                    .from('.hero-blob', { scale: 0.4, opacity: 0, duration: 2.2, stagger: 0.15 }, 0);

                gsap.to('.hero-inner', {
                    yPercent: 28,
                    opacity: 0,
                    ease: 'none',
                    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
                });
                gsap.to('.hero-bg', {
                    yPercent: 18,
                    scale: 1.1,
                    ease: 'none',
                    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
                });

                // ── about: คำค่อย ๆ สว่างขึ้นตามการเลื่อน
                gsap.fromTo(
                    '.about-text .split-word',
                    { opacity: 0.14 },
                    { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.about-text', start: 'top 80%', end: 'bottom 45%', scrub: true } },
                );

                // ── ตัวเลขนับขึ้น
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

                // ── หัวข้อของแต่ละส่วน
                gsap.utils.toArray<HTMLElement>('.reveal-heading').forEach((el) => {
                    revealWords(el, { duration: 1.1, stagger: 0.04, scrollTrigger: { trigger: el, start: 'top 85%' } });
                });

                // ── แถวในรายการผลงาน
                ScrollTrigger.batch('.work-row', {
                    start: 'top 92%',
                    onEnter: (rows) => gsap.from(rows, { y: 48, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, overwrite: true }),
                    once: true,
                });
            });

            // ── ผลงานเด่น: ตรึงส่วนนี้ไว้แล้วเลื่อนการ์ดไปทางขวา (เฉพาะจอกว้าง)
            mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
                const track = document.querySelector<HTMLElement>('.featured-track');
                if (!track) return;
                const distance = () => track.scrollWidth - window.innerWidth;
                const tween = gsap.to(track, {
                    x: () => -distance(),
                    ease: 'none',
                    scrollTrigger: {
                        trigger: '.featured',
                        start: 'top top',
                        end: () => `+=${distance()}`,
                        pin: true,
                        scrub: 1,
                        invalidateOnRefresh: true,
                        anticipatePin: 1,
                    },
                });
                // การ์ดแต่ละใบขยาย/ภาพเลื่อนช้ากว่ากรอบระหว่างวิ่งผ่านจอ
                gsap.utils.toArray<HTMLElement>('.featured-card').forEach((card) => {
                    gsap.fromTo(
                        card.querySelector('.featured-img'),
                        { xPercent: -12, scale: 1.15 },
                        {
                            xPercent: 12,
                            scale: 1.15,
                            ease: 'none',
                            scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
                        },
                    );
                });
                gsap.to('.featured-progress', {
                    scaleX: 1,
                    ease: 'none',
                    scrollTrigger: { trigger: '.featured', start: 'top top', end: () => `+=${distance()}`, scrub: true },
                });
            });

            return () => mm.revert();
        },
        { scope: root, dependencies: [projects.length] },
    );

    return (
        <div ref={root}>
            <Head title={`${site.site_name} — ${site.hero_title}`} />

            {/* ───────────── HERO ───────────── */}
            <section className="hero relative flex min-h-[100svh] items-end overflow-hidden px-4 pt-28 pb-14 md:px-8 md:pb-20">
                <div className="hero-bg noise absolute inset-0" aria-hidden="true">
                    <div className="grid-lines absolute inset-0" />
                    <div className="hero-blob blob absolute -top-[10%] left-[8%] h-[55vmax] w-[55vmax] rounded-full bg-[#7c5cff]/30 blur-[120px]" />
                    <div className="hero-blob blob absolute top-[20%] -right-[10%] h-[45vmax] w-[45vmax] rounded-full bg-lime/20 blur-[120px] [animation-delay:-6s]" />
                    <div className="hero-blob blob absolute -bottom-[25%] left-[30%] h-[40vmax] w-[40vmax] rounded-full bg-[#16a3a3]/25 blur-[120px] [animation-delay:-12s]" />
                </div>

                <div className="hero-inner relative mx-auto w-full max-w-[1400px]">
                    {site.hero_eyebrow && (
                        <p className="hero-fade mb-6 font-mono text-xs tracking-[0.25em] text-paper/60 uppercase md:mb-8">{site.hero_eyebrow}</p>
                    )}
                    <SplitWords
                        as="h1"
                        text={site.hero_title}
                        className="hero-title max-w-[14ch] font-display text-[clamp(3rem,10.5vw,10rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance"
                    />
                    <div className="mt-10 flex flex-col gap-8 md:mt-14 md:flex-row md:items-end md:justify-between">
                        <p className="hero-fade max-w-xl text-lg leading-relaxed text-paper/70 md:text-xl">{site.hero_subtitle}</p>
                        <div className="hero-fade flex flex-wrap items-center gap-3">
                            <Magnetic>
                                <a
                                    href="#work"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToTarget('#work');
                                    }}
                                    className="group inline-flex h-14 items-center gap-3 rounded-full bg-paper px-7 font-semibold text-ink transition hover:bg-lime"
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
                                className="inline-flex h-14 items-center rounded-full border border-white/20 px-7 font-medium text-paper transition hover:border-paper"
                            >
                                ติดต่อ
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ───────────── TECH MARQUEE ───────────── */}
            {tech.length > 0 && (
                <div className="border-y border-white/10 py-6 font-display text-3xl font-semibold tracking-tight text-paper/90 md:py-8 md:text-5xl">
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
                        <dl className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-4">
                            <Stat label="โปรเจกต์" value={stats.projects} />
                            <Stat label="ออนไลน์อยู่" value={stats.live} />
                            <Stat label="เทคโนโลยี" value={stats.tech} />
                            {stats.since ? <Stat label="เริ่มตั้งแต่" value={stats.since} /> : <Stat label="ดูแลเอง" value={100} suffix="%" />}
                        </dl>
                    </div>
                </div>
            </section>

            {/* ───────────── FEATURED (pinned horizontal) ───────────── */}
            {featured.length > 0 && (
                <section className="featured relative overflow-hidden md:h-screen">
                    <div className="flex h-full flex-col justify-center py-16 md:py-0">
                        <div className="mx-auto mb-10 flex w-full max-w-[1400px] items-end justify-between px-4 md:mb-12 md:px-8">
                            <SplitWords
                                as="h2"
                                text="ผลงานเด่น"
                                className="reveal-heading font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-none font-bold tracking-tight"
                            />
                            <p className="hidden font-mono text-xs tracking-[0.2em] text-mute uppercase md:block">เลื่อนลงเพื่อดูต่อ →</p>
                        </div>
                        <div className="featured-track flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:gap-8 md:overflow-visible md:px-8 md:pb-0">
                            {featured.map((p, i) => (
                                <Link
                                    key={p.id}
                                    href={`/projects/${p.slug}`}
                                    className="featured-card group relative w-[85vw] shrink-0 snap-center md:w-[62vw] lg:w-[52vw]"
                                >
                                    <div className="relative aspect-[16/10] overflow-hidden rounded-3xl">
                                        <ProjectArt project={p} eager className="featured-img absolute inset-0 h-full w-full" imgClassName="transition-transform duration-700 ease-out-expo group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
                                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 md:p-10">
                                            <div>
                                                <p className="font-mono text-xs text-paper/60">
                                                    {String(i + 1).padStart(2, '0')} / {String(featured.length).padStart(2, '0')}
                                                    {p.category && ` · ${p.category}`}
                                                </p>
                                                <h3 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-5xl">{p.title}</h3>
                                                {p.tagline && <p className="mt-2 max-w-lg text-sm text-paper/75 md:text-base">{p.tagline}</p>}
                                            </div>
                                            <span
                                                className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink transition-transform duration-500 ease-out-expo group-hover:rotate-45 md:h-16 md:w-16"
                                                style={{ backgroundColor: p.accent }}
                                                aria-hidden="true"
                                            >
                                                <ArrowUpRight className="h-6 w-6" />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            <div className="hidden w-[8vw] shrink-0 md:block" aria-hidden="true" />
                        </div>
                        <div className="mx-auto mt-10 hidden w-full max-w-[1400px] px-8 md:block" aria-hidden="true">
                            <div className="h-px w-full bg-white/10">
                                <div className="featured-progress h-px origin-left scale-x-0 bg-lime" />
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ───────────── ALL WORK ───────────── */}
            <WorkIndex projects={projects} />

            <Marquee items={[site.site_name, 'Design', 'Develop', 'Deploy', 'Maintain']} reverse className="border-y border-white/10 py-5 font-display text-2xl text-paper/40 md:text-4xl" />

            <ContactSection />
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

/** รายการผลงานทั้งหมด + ตัวกรองหมวด + รูปตัวอย่างลอยตามเมาส์ */
function WorkIndex({ projects }: { projects: Project[] }) {
    const categories = useMemo(() => [...new Set(projects.map((p) => p.category).filter(Boolean))] as string[], [projects]);
    const [filter, setFilter] = useState<string | null>(null);
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

    const pick = (c: string | null) => {
        setFilter(c);
        requestAnimationFrame(() => {
            ScrollTrigger.refresh();
            gsap.fromTo('.work-row', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.04 });
        });
    };

    return (
        <section id="work" ref={section} className="relative px-4 py-28 md:px-8 md:py-40">
            <div className="mx-auto max-w-[1400px]">
                <div className="mb-12 flex flex-col gap-8 md:mb-16 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="mb-4 font-mono text-xs tracking-[0.25em] text-mute uppercase">Index · {projects.length}</p>
                        <SplitWords as="h2" text="ผลงานทั้งหมด" className="reveal-heading font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-none font-bold tracking-tight" />
                    </div>
                    {categories.length > 1 && (
                        <div className="flex flex-wrap gap-2" role="group" aria-label="กรองตามหมวด">
                            {[null, ...categories].map((c) => (
                                <button
                                    key={c ?? 'all'}
                                    type="button"
                                    aria-pressed={filter === c}
                                    onClick={() => pick(c)}
                                    className="rounded-full border border-white/15 px-4 py-2 text-sm text-paper/70 transition hover:border-paper hover:text-paper aria-pressed:border-lime aria-pressed:bg-lime aria-pressed:text-ink"
                                >
                                    {c ?? 'ทั้งหมด'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <ul className="border-t border-white/10" onPointerLeave={() => setHover(null)}>
                    {list.map((p) => (
                        <li key={p.id} className="work-row border-b border-white/10">
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
                                    className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition-all duration-500 ease-out-expo group-hover:rotate-45 group-hover:border-transparent group-hover:text-ink md:h-12 md:w-12"
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
