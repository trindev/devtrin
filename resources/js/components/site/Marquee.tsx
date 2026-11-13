import { gsap, reducedMotion, ScrollTrigger, useGSAP } from '@/lib/motion';
import { useRef } from 'react';

/** แถบตัวหนังสือวิ่งไม่รู้จบ — เร่งความเร็วและกลับทิศตามการเลื่อนหน้า */
export default function Marquee({ items, reverse = false, className = '' }: { items: string[]; reverse?: boolean; className?: string }) {
    const root = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            if (reducedMotion()) return;
            const track = root.current!.querySelector('.marquee-track')!;
            const tween = gsap.fromTo(track, { xPercent: reverse ? -50 : 0 }, { xPercent: reverse ? 0 : -50, duration: 40, ease: 'none', repeat: -1 });
            let boostTl: gsap.core.Timeline | undefined;
            ScrollTrigger.create({
                trigger: root.current,
                start: 'top bottom',
                end: 'bottom top',
                onUpdate: (self) => {
                    // เลื่อนเร็ว = วิ่งเร็ว (สูงสุด 6 เท่า) แล้วค่อย ๆ กลับความเร็วปกติ, เลื่อนขึ้น = วิ่งกลับทิศ
                    const boost = Math.min(6, 1 + Math.abs(self.getVelocity()) / 400);
                    boostTl?.kill();
                    boostTl = gsap
                        .timeline()
                        .to(tween, { timeScale: self.direction * boost, duration: 0.25 })
                        .to(tween, { timeScale: self.direction, duration: 1.2 });
                },
            });
        },
        { scope: root },
    );

    const row = (
        <div className="flex shrink-0 items-center">
            {items.map((item, i) => (
                <span key={i} className="flex items-center">
                    <span className="px-6 md:px-10">{item}</span>
                    <span className="text-lime" aria-hidden="true">✳</span>
                </span>
            ))}
        </div>
    );

    return (
        <div ref={root} className={`overflow-hidden whitespace-nowrap select-none ${className}`} aria-label={items.join(', ')}>
            <div className="marquee-track flex w-max" aria-hidden="true">
                {row}
                {row}
            </div>
        </div>
    );
}
