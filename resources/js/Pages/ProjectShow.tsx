import Magnetic from '@/components/site/Magnetic';
import ProjectArt from '@/components/site/ProjectArt';
import SiteLayout, { ContactSection } from '@/components/site/SiteLayout';
import SplitWords from '@/components/site/SplitWords';
import { gsap, useGSAP } from '@/lib/motion';
import type { Project, SharedProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowUpRight, Code } from 'lucide-react';
import { useRef } from 'react';

interface Props extends SharedProps {
    project: Project;
    next: Pick<Project, 'id' | 'slug' | 'title' | 'tagline' | 'accent' | 'cover_url'> | null;
    statuses: Record<string, string>;
}

export default function ProjectShow() {
    const { project, next, statuses, site, auth } = usePage<Props>().props;
    const root = useRef<HTMLDivElement>(null);
    const paragraphs = (project.description ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const images = project.images ?? [];

    useGSAP(
        () => {
            const mm = gsap.matchMedia();
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.timeline({ defaults: { ease: 'expo.out' } })
                    .from('.p-title .split-word', { yPercent: 115, duration: 1.3, stagger: 0.05 })
                    .from('.p-fade', { y: 20, opacity: 0, duration: 0.9, stagger: 0.06 }, '-=0.9')
                    .from('.p-glow', { opacity: 0, scale: 0.6, duration: 2 }, 0);

                // ปกเปิดออกจากกรอบเล็ก (clip-path) แล้วภาพเลื่อนช้ากว่ากรอบ
                gsap.fromTo(
                    '.p-cover',
                    { clipPath: 'inset(12% 8% 12% 8% round 32px)' },
                    { clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none', scrollTrigger: { trigger: '.p-cover', start: 'top 85%', end: 'top 20%', scrub: true } },
                );
                gsap.fromTo('.p-cover-img', { yPercent: -8, scale: 1.18 }, { yPercent: 8, scale: 1.18, ease: 'none', scrollTrigger: { trigger: '.p-cover', start: 'top bottom', end: 'bottom top', scrub: true } });

                gsap.utils.toArray<HTMLElement>('.p-reveal').forEach((el) =>
                    gsap.from(el, { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }),
                );
                gsap.utils.toArray<HTMLElement>('.p-shot').forEach((el, i) =>
                    gsap.from(el, { y: 80 + (i % 2) * 40, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } }),
                );
                gsap.from('.p-next-title', {
                    xPercent: -8,
                    opacity: 0.2,
                    ease: 'none',
                    scrollTrigger: { trigger: '.p-next', start: 'top bottom', end: 'top 40%', scrub: true },
                });
            });
            return () => mm.revert();
        },
        { scope: root, dependencies: [project.id] },
    );

    return (
        <div ref={root} style={{ ['--accent' as string]: project.accent }}>
            <Head title={`${project.title} — ${site.site_name}`} />

            <section className="relative overflow-hidden px-4 pt-32 pb-16 md:px-8 md:pt-44 md:pb-24">
                <div
                    className="p-glow pointer-events-none absolute -top-1/3 left-1/2 h-[80vmax] w-[80vmax] -translate-x-1/2 rounded-full opacity-40 blur-[140px]"
                    style={{ background: project.accent }}
                    aria-hidden="true"
                />
                <div className="relative mx-auto max-w-[1400px]">
                    <div className="p-fade mb-10 flex flex-wrap items-center gap-3">
                        <Link href="/#work" className="inline-flex items-center gap-2 text-sm text-paper/70 transition hover:text-paper">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> ผลงานทั้งหมด
                        </Link>
                        {!project.is_published && <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-medium text-ink">ยังไม่เผยแพร่ (เห็นเฉพาะแอดมิน)</span>}
                        {auth.user?.is_admin && (
                            <Link href={`/admin/projects/${project.slug}/edit`} className="rounded-full border border-white/15 px-3 py-1 text-xs text-paper/70 hover:text-paper">
                                แก้ไข
                            </Link>
                        )}
                    </div>
                    <SplitWords as="h1" text={project.title} className="p-title font-display text-[clamp(3rem,11vw,10rem)] leading-[0.95] font-bold tracking-[-0.035em]" />
                    {project.tagline && <p className="p-fade mt-8 max-w-3xl text-xl leading-relaxed text-paper/75 md:text-2xl">{project.tagline}</p>}

                    <dl className="p-fade mt-14 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-white/10 pt-8 md:grid-cols-4">
                        <Meta label="หมวด" value={project.category} />
                        <Meta label="ปี" value={project.year} />
                        <Meta
                            label="สถานะ"
                            value={
                                <span className="inline-flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${project.status === 'live' ? 'bg-lime' : project.status === 'archived' ? 'bg-mute' : 'bg-amber-400'}`} />
                                    {statuses[project.status]}
                                </span>
                            }
                        />
                        <Meta
                            label="ลิงก์"
                            value={
                                project.url ? (
                                    <a href={project.url} target="_blank" rel="noopener noreferrer" className="break-all underline decoration-white/30 underline-offset-4 hover:decoration-[var(--accent)]">
                                        {project.host}
                                    </a>
                                ) : null
                            }
                        />
                    </dl>
                </div>
            </section>

            <div className="px-4 md:px-8">
                <div className="p-cover relative mx-auto aspect-[16/9] max-w-[1400px] overflow-hidden rounded-3xl">
                    <ProjectArt project={project} className="p-cover-img absolute inset-0 h-full w-full" sizes="(min-width: 1400px) 1400px, 100vw" />
                </div>
            </div>

            <section className="px-4 py-24 md:px-8 md:py-36">
                <div className="mx-auto grid max-w-[1400px] gap-14 md:grid-cols-12">
                    <aside className="p-reveal md:col-span-4">
                        <p className="mb-5 font-mono text-xs tracking-[0.25em] text-mute uppercase">Stack</p>
                        <ul className="flex flex-wrap gap-2">
                            {(project.tech_stack ?? []).map((t) => (
                                <li key={t} className="rounded-full border border-white/15 px-4 py-2 text-sm text-paper/85">
                                    {t}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-10 flex flex-wrap gap-3">
                            {project.url && (
                                <Magnetic>
                                    <a
                                        href={project.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group inline-flex h-14 items-center gap-3 rounded-full px-7 font-semibold text-ink"
                                        style={{ backgroundColor: project.accent }}
                                    >
                                        เปิดเว็บไซต์
                                        <ArrowUpRight className="h-5 w-5 transition-transform duration-500 ease-out-expo group-hover:rotate-45" aria-hidden="true" />
                                    </a>
                                </Magnetic>
                            )}
                            {project.repo_url && (
                                <a
                                    href={project.repo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-14 items-center gap-2 rounded-full border border-white/20 px-6 text-paper transition hover:border-paper"
                                >
                                    <Code className="h-5 w-5" aria-hidden="true" /> Source
                                </a>
                            )}
                        </div>
                    </aside>
                    <div className="space-y-6 text-lg leading-[1.9] text-paper/80 md:col-span-8 md:text-xl">
                        {paragraphs.length > 0 ? (
                            paragraphs.map((p, i) => (
                                <p key={i} className="p-reveal whitespace-pre-line">
                                    {p}
                                </p>
                            ))
                        ) : (
                            <p className="p-reveal text-mute">{project.tagline ?? 'รายละเอียดกำลังจะมาเร็ว ๆ นี้'}</p>
                        )}
                    </div>
                </div>
            </section>

            {images.length > 0 && (
                <section className="px-4 pb-24 md:px-8 md:pb-36" aria-label="ภาพหน้าจอ">
                    <div className="mx-auto grid max-w-[1400px] gap-4 md:grid-cols-2 md:gap-8">
                        {images.map((img, i) => (
                            <figure key={img.id} className={`p-shot overflow-hidden rounded-3xl bg-ink-3 ${images.length % 2 === 1 && i === 0 ? 'md:col-span-2' : ''}`}>
                                <img src={img.url} alt={img.caption ?? `${project.title} ภาพที่ ${i + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                {img.caption && <figcaption className="px-5 py-3 text-sm text-mute">{img.caption}</figcaption>}
                            </figure>
                        ))}
                    </div>
                </section>
            )}

            {next && (
                <Link href={`/projects/${next.slug}`} className="p-next group block overflow-hidden border-t border-white/10 px-4 py-20 md:px-8 md:py-32">
                    <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-8">
                        <div className="min-w-0">
                            <p className="mb-4 font-mono text-xs tracking-[0.25em] text-mute uppercase">โปรเจกต์ถัดไป</p>
                            <p className="p-next-title truncate font-display text-[clamp(2.5rem,9vw,8rem)] leading-none font-bold tracking-tight transition-colors duration-500 group-hover:text-[var(--next)]" style={{ ['--next' as string]: next.accent }}>
                                {next.title}
                            </p>
                        </div>
                        <span
                            className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-ink transition-transform duration-700 ease-out-expo group-hover:translate-x-2 group-hover:rotate-45 md:h-24 md:w-24"
                            style={{ backgroundColor: next.accent }}
                            aria-hidden="true"
                        >
                            <ArrowUpRight className="h-8 w-8" />
                        </span>
                    </div>
                </Link>
            )}

            <ContactSection />
        </div>
    );
}

ProjectShow.layout = (page: React.ReactNode) => <SiteLayout>{page}</SiteLayout>;

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div>
            <dt className="mb-1 text-sm text-mute">{label}</dt>
            <dd className="text-paper/90">{value}</dd>
        </div>
    );
}
