import { cn } from '@/lib/utils';

/** วงหมุนบางๆ — ใช้ในปุ่มที่กำลังทำงาน และพื้นที่ที่กำลังโหลด */
export function Spinner({ className, label = 'กำลังโหลด' }: { className?: string; label?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" role="status" aria-label={label} className={cn('size-4 animate-spin', className)}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}

/** สามจุด — ใช้ตอนรอ AI หรืองานที่ใช้เวลา */
export function Dots({ className }: { className?: string }) {
    return (
        <span role="status" aria-label="กำลังทำงาน" className={cn('inline-flex items-center gap-1', className)}>
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="size-1.5 animate-pulse rounded-full bg-current [animation-duration:1200ms]"
                    style={{ animationDelay: `${i * 200}ms` }}
                />
            ))}
        </span>
    );
}

/** โครงกระดูกระหว่างโหลด */
export function SkeletonLine({ className }: { className?: string }) {
    return <div className={cn('bg-muted h-4 animate-pulse rounded-md', className)} />;
}
