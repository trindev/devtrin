import ProjectArt from '@/components/site/ProjectArt';
import { gsap, useGSAP } from '@/lib/motion';
import type { Project } from '@/types';
import { useMemo, useRef } from 'react';

/**
 * ฉากซูม (zoom parallax): ตรึงจอไว้ แล้วภาพปกหลายใบขยายด้วยอัตราไม่เท่ากันตามการเลื่อน
 * ใบกลางขยาย 4 เท่าจนเต็มจอพอดี (กล่อง 25vw x 25vh) ใบรอบ ๆ ขยายเร็วกว่าจึงพุ่งออกนอกจอ = รู้สึกเหมือนบินเข้าไปในภาพ
 * ช่วงท้ายพื้นมืดลงและหัวข้อของส่วนถัดไปโผล่ขึ้นมา
 * ผู้ใช้ตั้งลดการเคลื่อนไหว: ไม่ตรึง/ไม่ซูม แสดงเป็นภาพตัดแปะนิ่ง ๆ พร้อมหัวข้อ (ความสูงลดเหลือหนึ่งจอ — ดู .zoom ใน app.css)
 */
// ตำแหน่ง/ขนาดของแต่ละใบ (อ้างจากกึ่งกลางจอ) — ค่าแรก = จอแนวตั้ง (มือถือ: ใบกว้างขึ้น เรียงบน-ล่าง), md: = จอกว้าง
// ใบกลางสูง 25vh ทั้งสองแบบ → ขยาย 4 เท่าแล้วสูงเต็มจอพอดี
const LAYOUT = [
    { box: 'h-[25vh] w-[60vw] md:w-[25vw]', scale: 4 },
    { box: '-top-[29vh] -left-[12vw] h-[26vh] w-[58vw] md:-top-[30vh] md:left-[5vw] md:h-[30vh] md:w-[35vw]', scale: 5 },
    { box: '-top-[27vh] left-[42vw] h-[20vh] w-[40vw] md:-top-[10vh] md:-left-[25vw] md:h-[45vh] md:w-[20vw]', scale: 6 },
    { box: 'top-[2vh] left-[54vw] h-[18vh] w-[36vw] md:top-0 md:left-[27.5vw] md:h-[25vh] md:w-[25vw]', scale: 5 },
    { box: 'top-[28vh] left-[14vw] h-[24vh] w-[56vw] md:top-[27.5vh] md:left-[5vw] md:h-[25vh] md:w-[20vw]', scale: 6 },
    { box: 'top-[27vh] -left-[42vw] h-[20vh] w-[40vw] md:top-[27.5vh] md:-left-[22.5vw] md:h-[25vh] md:w-[30vw]', scale: 8 },
    { box: 'top-[4vh] -left-[52vw] h-[16vh] w-[34vw] md:top-[22.5vh] md:left-[25vw] md:h-[15vh] md:w-[15vw]', scale: 9 },
];

export const ZOOM_MIN_TILES = 5;

/** เลือกภาพสำหรับฉากซูม: ใบกลาง = ผลงานเด่นใบแรก ที่เหลือเอาโปรเจกต์ที่มีรูปปกก่อน */
export function zoomTiles(projects: Project[], center?: Project): Project[] {
    const first = center ?? projects[0];
    if (!first) return [];
    const rest = projects.filter((p) => p.id !== first.id).sort((a, b) => Number(!!b.cover_url) - Number(!!a.cover_url));
    return [first, ...rest].slice(0, LAYOUT.length);
}

export default function ZoomGallery({ tiles, eyebrow, title, note }: { tiles: Project[]; eyebrow: string; title: string; note?: string }) {
    const root = useRef<HTMLElement>(null);
    const items = useMemo(() => tiles.slice(0, LAYOUT.length), [tiles]);

    useGSAP(
        () => {
            const mm = gsap.matchMedia();
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: true } });
                gsap.utils.toArray<HTMLElement>('.zoom-el', root.current).forEach((el, i) => {
                    tl.fromTo(el, { scale: 1 }, { scale: LAYOUT[i].scale, ease: 'none', duration: 1 }, 0);
                });
                tl.fromTo('.zoom-hint', { opacity: 1 }, { opacity: 0, duration: 0.12 }, 0.02)
                    .fromTo('.zoom-shade', { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.28 }, 0.7)
                    .fromTo('.zoom-title', { opacity: 0, y: 70 }, { opacity: 1, y: 0, ease: 'power2.out', duration: 0.28 }, 0.72);
            });
            return () => mm.revert();
        },
        { scope: root, dependencies: [items.length] },
    );

    return (
        <section ref={root} className="zoom relative" aria-label={title}>
            <div className="sticky top-0 h-[100svh] overflow-hidden">
                {items.map((p, i) => (
                    <div key={p.id} className="zoom-el absolute inset-0 flex items-center justify-center will-change-transform" aria-hidden="true">
                        <div className={`relative ${LAYOUT[i].box}`}>
                            <ProjectArt project={p} eager className="h-full w-full rounded-[0.4vw]" imgClassName="!text-[4vw]" />
                        </div>
                    </div>
                ))}
                <p className="zoom-hint absolute inset-x-0 bottom-8 text-center font-mono text-xs tracking-[0.25em] text-paper/60 uppercase motion-reduce:hidden" aria-hidden="true">
                    เลื่อนลงเพื่อเข้าไปดู ↓
                </p>
                <div className="zoom-shade absolute inset-0 bg-ink/80" aria-hidden="true" />
                <div className="zoom-title absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                    <p className="mb-5 font-mono text-xs tracking-[0.25em] text-paper/60 uppercase">{eyebrow}</p>
                    <h2 className="font-display text-[clamp(3rem,11vw,10rem)] leading-[1.05] font-bold tracking-[-0.03em]">{title}</h2>
                    {note && <p className="mt-5 font-mono text-xs tracking-[0.2em] text-paper/60 uppercase">{note}</p>}
                </div>
            </div>
        </section>
    );
}
