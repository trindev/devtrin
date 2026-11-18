import type { SharedProps } from '@/types';
import { usePage } from '@inertiajs/react';
import clsx from 'clsx';
import { Construction } from 'lucide-react';

/**
 * แถบเตือน admin ว่าเว็บกำลังปิดปรับปรุง — admin มี cookie ข้ามจึงเห็นเว็บตามปกติ
 * ถ้าไม่บอกจะดูเหมือน "กดปิดแล้วหน้าเว็บไม่ปิด" (ผู้เข้าชมทั่วไปเห็นหน้าปิดปรับปรุงอยู่)
 */
export default function MaintenanceBanner({ tone }: { tone: 'site' | 'admin' }) {
    const { maintenance } = usePage<SharedProps>().props;
    if (!maintenance) return null;

    return (
        <div
            role="status"
            className={clsx(
                'flex flex-wrap items-center gap-x-4 gap-y-1 text-sm',
                tone === 'site'
                    ? 'fixed bottom-4 left-4 z-40 max-w-[calc(100vw-6.5rem)] rounded-2xl bg-amber-400 px-4 py-2.5 font-medium text-dark shadow-xl md:bottom-6 md:left-6'
                    : 'mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
            )}
        >
            <span className="inline-flex items-center gap-2 font-semibold">
                <Construction className="h-4 w-4" aria-hidden="true" /> เว็บปิดปรับปรุงอยู่
            </span>
            <span className={tone === 'site' ? 'hidden opacity-80 sm:inline' : 'opacity-80'}>ผู้เข้าชมเห็นหน้าปิดปรับปรุง คุณเห็นเว็บได้เพราะเป็นแอดมิน</span>
            <span className="flex gap-3">
                <a href="/_maintenance/preview" target="_blank" rel="noopener" className="underline underline-offset-2">
                    ดูหน้าที่ผู้เข้าชมเห็น
                </a>
                <a href="/_maintenance#mode" className="underline underline-offset-2">
                    เปิดเว็บ
                </a>
            </span>
        </div>
    );
}
