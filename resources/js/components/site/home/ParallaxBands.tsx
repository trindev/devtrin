import { gsap, useGSAP } from '@/lib/motion';
import type { Project } from '@/types';
import { Fragment, useMemo, useRef } from 'react';

/**
 * แถบตัวอักษรยักษ์ 3 แถว เคลื่อนที่ตามการเลื่อนหน้า (scrub) สวนทางกันทีละแถว — มีภาพปกแทรกระหว่างคำ
 * ต่างจาก Marquee ที่วิ่งเองตลอดเวลา: อันนี้ขยับเฉพาะตอนเลื่อน จึงรู้สึกว่าหน้าเว็บตอบสนองมือ
 */
export default function ParallaxBands({ words, projects }: { words: string[]; projects: Project[] }) {
    const root = useRef<HTMLDivElement>(null);
    const covers = useMemo(() => projects.filter((p) => p.cover_url), [projects]);

    useGSAP(
        () => {
            const mm = gsap.matchMedia();
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.utils.toArray<HTMLElement>('.band-row', root.current).forEach((row, i) => {
                    const reverse = i % 2 === 1;
                    gsap.fromTo(
                        row,
                        { xPercent: reverse ? -34 : 0 },
                        { xPercent: reverse ? 0 : -34, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 } },
                    );
                });
            });
            return () => mm.revert();
        },
        { scope: root },
    );

    const rows = [0, 1, 2];

    return (
        <div ref={root} className="overflow-hidden border-y border-paper/10 py-10 md:py-16" aria-hidden="true">
            <div className="-rotate-2 scale-105 space-y-2 md:space-y-4">
                {rows.map((r) => (
                    <p
                        key={r}
                        className={`band-row flex w-max items-center font-display text-[15vw] leading-[1] font-extrabold tracking-[-0.04em] whitespace-nowrap uppercase md:text-[10.5vw] ${r === 1 ? 'text-outline' : 'text-paper'}`}
                    >
                        {/* แต่ละแถวเริ่มจากคำคนละคำ — ไม่ให้ทั้งสามแถวเรียงตรงกัน */}
                        {Array.from({ length: 3 }).flatMap((_, rep) =>
                            [...words.slice(r % words.length), ...words.slice(0, r % words.length)].map((word, i) => {
                                const cover = covers.length ? covers[(r * 3 + rep * words.length + i) % covers.length] : null;
                                return (
                                    <Fragment key={`${rep}-${i}`}>
                                        <span className="px-[0.14em]">{word}</span>
                                        {cover ? (
                                            <img src={cover.cover_url!} alt="" loading="lazy" decoding="async" className="mx-[0.12em] inline-block h-[0.66em] w-auto rounded-[0.14em] object-cover" style={{ aspectRatio: '16 / 10' }} />
                                        ) : (
                                            <span className="px-[0.1em] text-lime">✳</span>
                                        )}
                                    </Fragment>
                                );
                            }),
                        )}
                    </p>
                ))}
            </div>
        </div>
    );
}
