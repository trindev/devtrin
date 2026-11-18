import ProjectArt from '@/components/site/ProjectArt';
import type { Project } from '@/types';
import { useMemo } from 'react';

/**
 * "กำแพงผลงาน" ใน hero: ภาพปกโปรเจกต์จริงเรียง 3 แถวแนวตั้ง เอียงแบบ 3D เลื่อนวนไม่รู้จบ (สลับทิศทีละแถว)
 * ตกแต่งล้วน ๆ (aria-hidden) — เนื้อหาเดียวกันมีในรายการผลงานด้านล่างอยู่แล้ว
 */
export default function CoverWall({ projects }: { projects: Project[] }) {
    const columns = useMemo(() => {
        // โปรเจกต์ที่มีรูปปกขึ้นก่อน แล้วแจกลง 3 แถว · แถวที่มีน้อยกว่า 4 ใบ วนซ้ำให้เต็ม
        const sorted = [...projects].sort((a, b) => Number(!!b.cover_url) - Number(!!a.cover_url));
        const cols: Project[][] = [[], [], []];
        sorted.forEach((p, i) => cols[i % 3].push(p));
        return cols.map((col, i) => {
            const base = col.length ? col : sorted.slice(i, i + 1);
            const filled = [...base];
            while (base.length && filled.length < 4) filled.push(...base);
            return filled;
        });
    }, [projects]);

    if (projects.length === 0) return null;

    return (
        <div className="wall pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {/* wall-shift = ชั้นที่ GSAP ขยับ/จาง (แยกจากชั้นที่หมุน 3D เพื่อไม่ให้ทับ transform กัน) */}
            {/* wall-mask: กำแพงจางหายฝั่งซ้าย/บน/ล่าง ด้วย mask (ไม่ใช้สีทับ) — แสงพื้นหลังจึงยังเห็นหลังตัวหนังสือ */}
            <div className="wall-shift wall-mask absolute inset-0 [perspective:1600px]">
            <div className="wall-inner absolute -top-[35%] -right-[26%] grid h-[190%] w-[125vw] grid-cols-3 gap-3 [transform:rotateX(22deg)_rotateY(-10deg)_rotateZ(-12deg)] md:-right-[16%] md:w-[66vw] md:gap-5 lg:w-[60vw]">
                {columns.map((col, i) => (
                    <div key={i} className={`wall-col ${i % 2 ? 'rev' : ''}`} style={{ ['--dur' as string]: `${46 + i * 12}s` }}>
                        {[0, 1].map((half) => (
                            <div key={half} className="flex flex-col gap-3 pb-3 md:gap-5 md:pb-5">
                                {col.map((p, j) => (
                                    <ProjectArt
                                        key={`${p.id}-${j}`}
                                        project={p}
                                        eager
                                        className="aspect-[16/10] w-full rounded-lg border border-paper/10 shadow-2xl shadow-black/40 md:rounded-2xl"
                                        imgClassName="!text-[5rem]"
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            </div>
        </div>
    );
}
