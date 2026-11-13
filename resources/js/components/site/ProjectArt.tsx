import type { Project } from '@/types';
import clsx from 'clsx';

/** รูปปกของโปรเจกต์ — ไม่มีรูปก็สร้างภาพจากสีประจำโปรเจกต์ + ตัวอักษรย่อ ให้หน้าเว็บไม่โล่ง */
export default function ProjectArt({
    project,
    className,
    imgClassName,
    sizes,
    eager = false,
}: {
    project: Pick<Project, 'title' | 'accent' | 'cover_url'>;
    className?: string;
    imgClassName?: string;
    sizes?: string;
    /** ภาพที่อยู่ในจอแรกหรือในส่วนที่เลื่อนด้วย transform (lazy โหลดช้า) */
    eager?: boolean;
}) {
    if (project.cover_url) {
        return (
            <div className={clsx('relative overflow-hidden bg-ink-3', className)}>
                <img src={project.cover_url} alt={project.title} sizes={sizes} loading={eager ? 'eager' : 'lazy'} decoding="async" className={clsx('h-full w-full object-cover', imgClassName)} />
            </div>
        );
    }
    const initials = project.title
        .replace(/[·|].*$/, '')
        .trim()
        .split(/\s+/)
        .map((w) => Array.from(w)[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div
            className={clsx('noise relative overflow-hidden', className)}
            style={{
                background: `radial-gradient(120% 90% at 15% 10%, ${project.accent} 0%, transparent 55%), radial-gradient(90% 90% at 100% 100%, ${project.accent}99 0%, transparent 60%), #111114`,
            }}
            role="img"
            aria-label={project.title}
        >
            <div className="grid-lines absolute inset-0 opacity-60" />
            <span className={clsx('absolute -bottom-[0.18em] -right-[0.04em] font-display leading-none font-extrabold tracking-tighter text-white/90 mix-blend-overlay', imgClassName)} style={{ fontSize: 'clamp(6rem, 22vw, 18rem)' }}>
                {initials}
            </span>
        </div>
    );
}
