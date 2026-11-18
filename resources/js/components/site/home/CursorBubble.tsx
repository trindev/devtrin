import { gsap } from '@/lib/motion';
import { useEffect, useRef, useState } from 'react';

/**
 * ฟองตามเมาส์: ชี้องค์ประกอบที่มี data-cursor="ข้อความ" แล้วฟองสี lime พร้อมข้อความจะโผล่ตามเมาส์
 * เฉพาะอุปกรณ์ที่มีเมาส์ · ไม่ซ่อนเคอร์เซอร์จริง (ฟองเป็นของเสริม)
 */
export default function CursorBubble() {
    const ref = useRef<HTMLDivElement>(null);
    const [label, setLabel] = useState('');

    useEffect(() => {
        const el = ref.current;
        if (!el || !window.matchMedia('(pointer: fine)').matches) return;
        const x = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3' });
        const y = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3' });
        let shown = false;

        const move = (e: PointerEvent) => {
            x(e.clientX);
            y(e.clientY);
            const target = (e.target as Element | null)?.closest?.('[data-cursor]') as HTMLElement | null;
            if (target && !shown) {
                shown = true;
                setLabel(target.dataset.cursor || '');
                gsap.to(el.firstElementChild, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.7)', overwrite: true });
            } else if (!target && shown) {
                shown = false;
                gsap.to(el.firstElementChild, { scale: 0, opacity: 0, duration: 0.3, ease: 'power3.in', overwrite: true });
            }
        };
        const hide = () => {
            shown = false;
            gsap.to(el.firstElementChild, { scale: 0, opacity: 0, duration: 0.2, overwrite: true });
        };
        window.addEventListener('pointermove', move, { passive: true });
        document.addEventListener('pointerleave', hide);
        window.addEventListener('scroll', hide, { passive: true });
        return () => {
            window.removeEventListener('pointermove', move);
            document.removeEventListener('pointerleave', hide);
            window.removeEventListener('scroll', hide);
        };
    }, []);

    return (
        <div ref={ref} className="pointer-events-none fixed top-0 left-0 z-[70] hidden [@media(pointer:fine)]:block" aria-hidden="true">
            <div
                className="grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-lime text-center text-sm font-semibold text-dark shadow-xl"
                style={{ transform: 'scale(0)', opacity: 0 }}
            >
                {label}
            </div>
        </div>
    );
}
