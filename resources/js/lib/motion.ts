import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis: Lenis | null = null;
let tick: ((time: number) => void) | null = null;

/** smooth scroll ที่ sync กับ ScrollTrigger — ข้ามเมื่อผู้ใช้ตั้งลดการเคลื่อนไหว */
export function startSmoothScroll(): Lenis | null {
    if (lenis || reducedMotion()) return lenis;
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    tick = (time) => lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return lenis;
}

export function stopSmoothScroll() {
    if (tick) gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
    tick = null;
}

export function scrollToTarget(target: string | number | HTMLElement, immediate = false) {
    if (lenis) {
        lenis.scrollTo(target, { immediate, offset: typeof target === 'number' ? 0 : -24, duration: 1.4 });
        return;
    }
    if (typeof target === 'number') window.scrollTo({ top: target, behavior: immediate ? 'auto' : 'smooth' });
    else (typeof target === 'string' ? document.querySelector(target) : target)?.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
}

/** แยกข้อความเป็นคำ — รองรับภาษาไทย (ไม่มีเว้นวรรค) ด้วย Intl.Segmenter */
export function segmentWords(text: string): string[] {
    const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
    if (!Seg) return text.split(/(\s+)/).filter(Boolean);
    return Array.from(new Seg('th', { granularity: 'word' }).segment(text), (s) => s.segment);
}

/**
 * คำโผล่จากใต้เส้น (ใช้กับ SplitWords variant="mask") — ใส่ class masking ระหว่างเล่น แล้วเอาออกตอนจบ
 * เพราะ mask ที่ตัดขอบตลอดเวลาจะตัดวรรณยุกต์ไทยที่ซ้อนสูง (ไม้เอกของ "ที่") บนจอกว้าง
 */
export function revealWords(el: Element | null, vars: gsap.TweenVars = {}): gsap.core.Tween | null {
    if (!el) return null;
    el.classList.add('masking');
    return gsap.from(el.querySelectorAll('.split-word'), {
        yPercent: 115,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.05,
        ...vars,
        onComplete: () => el.classList.remove('masking'),
    });
}
