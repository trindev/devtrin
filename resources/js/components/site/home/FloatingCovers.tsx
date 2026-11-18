import ProjectArt from '@/components/site/ProjectArt';
import type { Project } from '@/types';

/**
 * ภาพปกลอย 3 ใบข้างข้อความ (ตกแต่ง) — แต่ละใบมี data-parallax ต่างกัน จึงเลื่อนคนละความเร็ว = เห็นเป็นชั้นลึกตื้น
 * ค่า data-parallax = ระยะ (px) ที่เลื่อนสวนขึ้นระหว่างผ่านจอ: มาก = อยู่ "ใกล้ตา" · ติดลบ = อยู่ "ไกล" (เลื่อนช้ากว่าหน้า)
 */
const LAYERS = [
    { cls: 'top-[4%] left-0 w-[82%] -rotate-6', depth: 150 },
    { cls: 'top-[38%] left-[26%] w-[60%] rotate-[5deg] opacity-60 blur-[1.5px]', depth: -70 },
    { cls: 'top-[68%] left-[2%] w-[72%] rotate-[9deg]', depth: 240 },
];

export default function FloatingCovers({ projects }: { projects: Project[] }) {
    const items = projects.filter((p) => p.cover_url).slice(0, LAYERS.length);
    if (items.length === 0) return null;
    return (
        <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
            {items.map((p, i) => (
                <div key={p.id} data-parallax={LAYERS[i].depth} className={`absolute will-change-transform ${LAYERS[i].cls}`}>
                    <ProjectArt project={p} eager className="aspect-[16/10] w-full rounded-xl border border-paper/10 shadow-2xl shadow-black/40" />
                </div>
            ))}
        </div>
    );
}
