import { useSyncExternalStore } from 'react';

/**
 * การตั้งค่าการแสดงผลของผู้ใช้ (ธีม + ขนาดตัวอักษร) — เก็บใน localStorage ใช้ร่วมกันทั้งหน้าบ้านและหลังบ้าน
 * ค่าเริ่มต้นถูกตั้งก่อนวาดหน้าโดยสคริปต์ใน resources/views/app.blade.php (key เดียวกัน)
 */
export type Theme = 'light' | 'dark';

export const FONT_STEPS = [0.9, 1, 1.1, 1.2, 1.3, 1.4] as const;

const THEME_KEY = 'dt-theme';
const FONT_KEY = 'dt-font';
const listeners = new Set<() => void>();

function save(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // โหมดส่วนตัว/บล็อก storage — ใช้ได้เฉพาะหน้านี้
    }
}

function snapshot() {
    const root = document.documentElement;
    const font = parseFloat(root.style.fontSize) / 100;
    return `${root.dataset.theme === 'light' ? 'light' : 'dark'}|${Number.isFinite(font) ? font : 1}`;
}

function emit() {
    listeners.forEach((l) => l());
    // ขนาดตัวอักษร/ธีมเปลี่ยน = ความสูงของส่วนต่าง ๆ เปลี่ยน → ให้ ScrollTrigger คำนวณตำแหน่งใหม่ (ฟัง resize อยู่แล้ว)
    window.dispatchEvent(new Event('resize'));
}

export function setTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f5f4f0' : '#0a0a0b');
    save(THEME_KEY, theme);
    emit();
}

export function setFontScale(scale: number) {
    const clamped = Math.min(FONT_STEPS[FONT_STEPS.length - 1], Math.max(FONT_STEPS[0], Math.round(scale * 10) / 10));
    document.documentElement.style.fontSize = clamped === 1 ? '' : `${clamped * 100}%`;
    save(FONT_KEY, String(clamped));
    emit();
}

export function usePrefs() {
    const value = useSyncExternalStore(
        (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        snapshot,
    );
    const [theme, font] = value.split('|');
    const scale = Number(font);
    const index = FONT_STEPS.findIndex((s) => Math.abs(s - scale) < 0.01);

    return {
        theme: theme as Theme,
        scale,
        toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
        smaller: index > 0 ? () => setFontScale(FONT_STEPS[index - 1]) : null,
        bigger: index < FONT_STEPS.length - 1 ? () => setFontScale(FONT_STEPS[Math.max(index, 0) + 1]) : null,
        reset: () => setFontScale(1),
    };
}
