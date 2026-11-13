import { usePrefs } from '@/lib/prefs';
import clsx from 'clsx';
import { Moon, Sun } from 'lucide-react';

/**
 * ปุ่มปรับขนาดตัวอักษร (A− / A+) และสวิตช์ธีม — ใช้ทั้งหน้าบ้าน (tone="site") และหลังบ้าน (tone="admin")
 */
export default function DisplayControls({ tone, className }: { tone: 'site' | 'admin'; className?: string }) {
    const { theme, scale, toggleTheme, smaller, bigger, reset } = usePrefs();
    const dark = theme === 'dark';

    const group =
        tone === 'site'
            ? 'border-paper/15 text-paper/80'
            : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300';
    const btn =
        tone === 'site'
            ? 'hover:bg-paper/10 hover:text-paper disabled:opacity-30'
            : 'hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-white';

    return (
        <div className={clsx('flex items-center gap-2', className)}>
            <div className={clsx('flex h-9 items-center rounded-full border', group)} role="group" aria-label="ขนาดตัวอักษร">
                <button type="button" onClick={smaller ?? undefined} disabled={!smaller} className={clsx('grid h-full w-9 place-items-center rounded-l-full text-xs font-semibold transition', btn)} aria-label="ลดขนาดตัวอักษร" title="ลดขนาดตัวอักษร">
                    A−
                </button>
                <button type="button" onClick={reset} className={clsx('h-full min-w-11 px-1 text-[11px] tabular-nums transition', btn)} aria-label={`ขนาดตัวอักษร ${Math.round(scale * 100)}% กดเพื่อกลับเป็นปกติ`} title="กลับเป็นขนาดปกติ">
                    {Math.round(scale * 100)}%
                </button>
                <button type="button" onClick={bigger ?? undefined} disabled={!bigger} className={clsx('grid h-full w-9 place-items-center rounded-r-full text-sm font-semibold transition', btn)} aria-label="เพิ่มขนาดตัวอักษร" title="เพิ่มขนาดตัวอักษร">
                    A+
                </button>
            </div>

            <button
                type="button"
                role="switch"
                aria-checked={dark}
                aria-label="ธีมมืด"
                title={dark ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'}
                onClick={toggleTheme}
                className={clsx(
                    'relative h-9 w-16 shrink-0 rounded-full border transition-colors',
                    tone === 'site' ? 'border-paper/15 bg-paper/5' : 'border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800',
                )}
            >
                <span
                    className={clsx(
                        'absolute top-1 left-1 grid h-[26px] w-[26px] place-items-center rounded-full shadow transition-transform duration-300 ease-out',
                        dark ? 'translate-x-7 bg-zinc-900 text-lime ring-1 ring-white/15' : 'translate-x-0 bg-white text-amber-500',
                    )}
                >
                    {dark ? <Moon className="h-3.5 w-3.5" aria-hidden="true" /> : <Sun className="h-3.5 w-3.5" aria-hidden="true" />}
                </span>
            </button>
        </div>
    );
}
