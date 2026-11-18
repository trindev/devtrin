import { gsap, reducedMotion, setSmoothScrollPaused } from '@/lib/motion';
import { useEffect, useRef, useState } from 'react';

const KEY = 'dt-intro';

/** ควรเล่น intro ไหม — เฉพาะครั้งแรกของแท็บนี้ และไม่เล่นถ้าผู้ใช้ตั้งลดการเคลื่อนไหว */
export function shouldPlayIntro(): boolean {
    if (typeof window === 'undefined' || reducedMotion()) return false;
    try {
        return sessionStorage.getItem(KEY) !== '1';
    } catch {
        return false;
    }
}

/**
 * ฉากเปิดเว็บ: โลโก้ + ตัวเลขนับ 0→100 แล้วม่านเลื่อนขึ้นเผยหน้าเว็บ (~1.9 วินาที)
 * เรียก onDone ตอนม่านเริ่มเปิด เพื่อให้แอนิเมชันของ hero เล่นต่อเนื่องกัน
 */
export default function Intro({ name, onDone }: { name: string; onDone: () => void }) {
    const root = useRef<HTMLDivElement>(null);
    const [gone, setGone] = useState(false);

    useEffect(() => {
        const el = root.current;
        if (!el) return;
        try {
            sessionStorage.setItem(KEY, '1');
        } catch {
            // ไม่มี storage — เล่นทุกครั้งก็ได้
        }
        setSmoothScrollPaused(true);
        document.documentElement.style.overflow = 'hidden';

        const count = { v: 0 };
        const num = el.querySelector<HTMLElement>('.intro-num')!;
        const ctx = gsap.context(() => {
            gsap.timeline({
                onComplete: () => {
                    document.documentElement.style.overflow = '';
                    setSmoothScrollPaused(false);
                    setGone(true);
                },
            })
                .from('.intro-mark', { scale: 0.6, opacity: 0, duration: 0.6, ease: 'back.out(1.8)' })
                .from('.intro-word span', { yPercent: 110, duration: 0.7, ease: 'expo.out', stagger: 0.03 }, '<0.1')
                .to(count, { v: 100, duration: 1.1, ease: 'power2.inOut', onUpdate: () => (num.textContent = String(Math.round(count.v)).padStart(2, '0')) }, 0)
                .to('.intro-bar', { scaleX: 1, duration: 1.1, ease: 'power2.inOut' }, 0)
                .add(onDone, '+=0.05')
                .to('.intro-inner', { y: -60, opacity: 0, duration: 0.5, ease: 'power2.in' }, '<')
                .to(el, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '<0.1');
        }, el);

        return () => {
            ctx.revert();
            document.documentElement.style.overflow = '';
            setSmoothScrollPaused(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (gone) return null;

    return (
        <div ref={root} className="fixed inset-0 z-[90] bg-ink text-paper" role="presentation" aria-hidden="true">
            <div className="intro-inner flex h-full flex-col justify-between p-6 md:p-10">
                <div className="flex items-center gap-3">
                    <img src="/favicon.svg" alt="" className="intro-mark h-11 w-11 rounded-xl" />
                    <p className="intro-word overflow-hidden font-display text-2xl font-bold tracking-tight">
                        {Array.from(name.toLowerCase()).map((ch, i) => (
                            <span key={i} className="inline-block">
                                {ch}
                            </span>
                        ))}
                        <span className="inline-block text-lime">.</span>
                    </p>
                </div>
                <div>
                    <p className="font-display text-[clamp(6rem,26vw,20rem)] leading-[0.85] font-bold tracking-tighter tabular-nums">
                        <span className="intro-num">00</span>
                        <span className="text-lime">%</span>
                    </p>
                    <div className="mt-6 h-px w-full bg-paper/15">
                        <div className="intro-bar h-px origin-left scale-x-0 bg-lime" />
                    </div>
                </div>
            </div>
        </div>
    );
}
