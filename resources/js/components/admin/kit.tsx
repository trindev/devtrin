import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ChevronDown, Search, TriangleAlert, X } from 'lucide-react';
import { type ComponentProps, type ReactNode } from 'react';

/**
 * ชิ้นส่วนของหน้าแอดมิน — โครงหน้า หัวหน้า ตัวกรอง ตาราง ช่องกรอก
 * ทุกหน้าใน pages/admin ใช้ชุดนี้ เพื่อให้ระยะ ขนาด และสถานะของแถวเหมือนกันทุกหน้า
 */

/**
 * โครงเนื้อหาหลักของหน้า (ขอบหน้า + จางขึ้นทีละชิ้น)
 * contain:inline-size — ตารางกว้างเลื่อนภายในกรอบของมัน ไม่ดันความกว้างของหน้า (SidebarInset ไม่มี min-w-0)
 */
export function AdminPage({ children, narrow = false, className }: { children: ReactNode; narrow?: boolean; className?: string }) {
    return (
        <div className={cn('stagger mx-auto flex w-full min-w-0 flex-col gap-6 p-4 md:p-6 lg:p-8', narrow ? 'max-w-3xl' : 'max-w-7xl', className)}>
            {children}
        </div>
    );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl leading-8 font-medium">{title}</h1>
                {description && <p className="text-text-2 mt-1 text-sm leading-6">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
        </div>
    );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <h2 className="text-base leading-6 font-medium">{children}</h2>
            {action}
        </div>
    );
}

/** แถบกรองแบบปุ่มติดกัน (สถานะ, กฎหมาย) — เลื่อนแนวนอนได้เมื่อจอแคบ */
export function Segmented<T extends string | number>({
    label,
    value,
    options,
    onChange,
    tour,
}: {
    label: string;
    value: T;
    options: { value: T; label: ReactNode; count?: number }[];
    onChange: (value: T) => void;
    /** เป้าหมายของแนะนำการใช้งาน (data-tour) */
    tour?: string;
}) {
    return (
        <div className="max-w-full overflow-x-auto [scrollbar-width:none]" data-tour={tour}>
            <div role="group" aria-label={label} className="bg-secondary inline-flex gap-1 rounded-xl p-1">
                {options.map((option) => {
                    const active = option.value === value;
                    return (
                        <button
                            key={String(option.value)}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onChange(option.value)}
                            className={cn(
                                'press flex h-8 items-center gap-2 rounded-lg px-3 text-sm whitespace-nowrap',
                                active ? 'bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]' : 'text-text-2 hover:text-foreground',
                            )}
                        >
                            {option.label}
                            {option.count !== undefined && (
                                <span className="text-muted-foreground font-mono text-xs tabular-nums">{option.count.toLocaleString()}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** ป้ายตัวกรองที่กดเพื่อเอาออก */
export function FilterChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
    return (
        <button
            type="button"
            onClick={onRemove}
            className="press bg-secondary text-text-2 hover:text-foreground inline-flex h-8 items-center gap-1 rounded-lg pr-2 pl-3 text-sm"
        >
            {children}
            <X className="size-4" strokeWidth={1.75} aria-label="เอาตัวกรองออก" />
        </button>
    );
}

export function SearchField({ className, ...props }: ComponentProps<'input'>) {
    return (
        <div className={cn('relative w-full sm:w-64', className)}>
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" strokeWidth={1.75} />
            <Input type="search" className="pl-9" {...props} />
        </div>
    );
}

const control =
    'border-input bg-card text-foreground w-full rounded-xl border text-base transition-[border-color,box-shadow] duration-150 focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_4px_var(--accent-soft)] focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

/** select ของเบราว์เซอร์ ในหน้าตาเดียวกับ Input */
export function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
    return (
        <div className={cn('relative w-full', className)}>
            <select className={cn(control, 'h-10 appearance-none truncate pr-9 pl-3')} {...props}>
                {children}
            </select>
            <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" strokeWidth={1.75} />
        </div>
    );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
    return <textarea className={cn(control, 'px-3 py-2 leading-6', className)} {...props} />;
}

/** ป้ายชื่อ + ช่องกรอก + คำอธิบาย + ข้อผิดพลาดของช่องนั้น */
export function Field({
    label,
    htmlFor,
    hint,
    error,
    children,
    className,
}: {
    label?: ReactNode;
    htmlFor?: string;
    hint?: ReactNode;
    error?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            {label && (
                <Label htmlFor={htmlFor} className="leading-5">
                    {label}
                </Label>
            )}
            {children}
            {hint && !error && <p className="text-muted-foreground text-xs leading-5">{hint}</p>}
            {error && <p className="text-destructive text-xs leading-5">{error}</p>}
        </div>
    );
}

/** ข้อผิดพลาดแรกของฟอร์ม เมื่อไม่ได้ผูกกับช่องใด */
export function FormError({ errors }: { errors: Record<string, string | undefined> }) {
    const first = Object.values(errors).find(Boolean);
    if (!first) return null;
    return <p className="bg-danger-soft text-destructive rounded-xl px-3 py-2 text-sm">{first}</p>;
}

/** แจ้งเตือนในหน้า เช่น ยังไม่ได้ตั้ง API key */
export function Notice({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('bg-warning-soft flex gap-3 rounded-xl px-4 py-3 text-sm leading-6', className)}>
            <TriangleAlert className="text-warning mt-1 size-4 shrink-0" strokeWidth={1.75} />
            <div className="text-foreground min-w-0">{children}</div>
        </div>
    );
}

export function EmptyState({ children }: { children: ReactNode }) {
    return <div className="surface text-muted-foreground px-6 py-12 text-center text-sm leading-6">{children}</div>;
}

export function Code({ children }: { children: ReactNode }) {
    return <code className="bg-secondary text-text-2 rounded-md px-1.5 py-0.5 font-mono text-xs">{children}</code>;
}

/** ตัวเลขสถิติ: ป้าย + ตัวเลขใหญ่ (+ บรรทัดเสริม) ไม่มีของตกแต่ง */
export function StatCard({
    label,
    value,
    hint,
    href,
    emphasis = false,
    className,
}: {
    label: ReactNode;
    value: ReactNode;
    hint?: ReactNode;
    href?: string | null;
    emphasis?: boolean;
    className?: string;
}) {
    const body = (
        <>
            <p className="text-text-2 text-sm leading-5">{label}</p>
            <p className={cn('mt-2 font-mono text-[1.75rem] leading-9 font-medium tabular-nums', emphasis && 'text-primary')}>{value}</p>
            {hint && <p className="text-muted-foreground mt-1 text-xs leading-5">{hint}</p>}
        </>
    );

    return href ? (
        <Link href={href} className={cn('surface hover:bg-secondary/60 block p-5 transition-colors', className)}>
            {body}
        </Link>
    ) : (
        <div className={cn('surface p-5', className)}>{body}</div>
    );
}

/** ตารางในกรอบ surface — เลื่อนแนวนอนภายในกรอบเมื่อจอแคบ */
export function TableShell({ children, className, tableClassName }: { children: ReactNode; className?: string; tableClassName?: string }) {
    return (
        <div className={cn('surface overflow-hidden', className)}>
            <div className="overflow-x-auto">
                <table className={cn('w-full text-sm', tableClassName)}>{children}</table>
            </div>
        </div>
    );
}

export const th = 'text-muted-foreground h-10 px-4 text-left align-middle text-xs font-normal whitespace-nowrap';
export const tr = 'border-border border-t transition-colors hover:bg-secondary/60';
export const td = 'px-4 py-3';
export const num = 'text-right font-mono tabular-nums whitespace-nowrap';

export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
    return (
        <tr className="border-border border-t">
            <td colSpan={colSpan} className="text-muted-foreground px-4 py-12 text-center">
                {children}
            </td>
        </tr>
    );
}

export const DIFFICULTY: Record<string, string> = { easy: 'ง่าย', medium: 'ปานกลาง', hard: 'ยาก' };

export const dateTime = (value: string) => new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
export const dateOnly = (value: string) => new Date(value).toLocaleDateString('th-TH', { dateStyle: 'medium' });

/** ลำดับหมวดของมาตรา: บรรพ › ลักษณะ › หมวด › ส่วน */
export const chapterPath = (c: { book: string | null; title_group: string | null; chapter: string | null; division: string | null } | null) =>
    c ? [c.book, c.title_group, c.chapter, c.division].filter(Boolean).join(' › ') : '';

/** ข้อผิดพลาดที่ไม่ได้แสดงใต้ช่องใด — ส่งให้ <FormError /> */
export const otherErrors = (errors: Record<string, string | undefined>, shown: string[]) =>
    Object.fromEntries(Object.entries(errors).filter(([key]) => !shown.includes(key)));
