import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useSyncExternalStore } from 'react';

/**
 * กล่องยืนยันแนว SweetAlert: วงกลมไอคอนวาดตัวเองตอนเปิด หัวข้อ ข้อความ และปุ่มสองปุ่ม
 *
 * if (await confirm({ title: 'ลบคดีนี้?', text: 'ลบแล้วกู้คืนไม่ได้', confirmText: 'ลบ', tone: 'danger' })) { … }
 * await alertBox({ title: 'บันทึกแล้ว', tone: 'success' })
 */
type Tone = 'danger' | 'warning' | 'info' | 'success';
interface Options {
    title: string;
    text?: string;
    confirmText?: string;
    cancelText?: string | null; // null = ไม่มีปุ่มยกเลิก (ใช้กับ alertBox)
    tone?: Tone;
}
interface State extends Options {
    open: boolean;
    resolve?: (ok: boolean) => void;
}

let state: State = { open: false, title: '' };
const listeners = new Set<() => void>();
const set = (next: State) => {
    state = next;
    listeners.forEach((l) => l());
};

export function confirm(options: Options): Promise<boolean> {
    state.resolve?.(false);
    return new Promise((resolve) => set({ tone: 'warning', confirmText: 'ยืนยัน', cancelText: 'ยกเลิก', ...options, open: true, resolve }));
}

export function alertBox(options: Omit<Options, 'cancelText'>): Promise<boolean> {
    return confirm({ tone: 'success', confirmText: 'ตกลง', ...options, cancelText: null });
}

function close(ok: boolean) {
    state.resolve?.(ok);
    set({ ...state, open: false, resolve: undefined });
}

const RING: Record<Tone, string> = {
    danger: 'text-destructive bg-danger-soft',
    warning: 'text-warning bg-warning-soft',
    info: 'text-primary bg-accent-soft',
    success: 'text-success bg-success-soft',
};

/** ไอคอนที่วาดเส้นตัวเอง (stroke-dashoffset) — วงกลมก่อน แล้วสัญลักษณ์ตาม */
function DrawnIcon({ tone }: { tone: Tone }) {
    const draw = (delay: number, length: number) => ({
        strokeDasharray: length,
        strokeDashoffset: length,
        animation: `confirm-draw 420ms var(--ease) ${delay}ms forwards`,
    });

    return (
        <div className={cn('mx-auto flex size-16 items-center justify-center rounded-full', RING[tone])}>
            <svg
                viewBox="0 0 48 48"
                className="size-11"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="24" cy="24" r="20" style={draw(0, 126)} />
                {tone === 'success' && <path d="M15 24.5l6 6 12-13" style={draw(260, 30)} />}
                {(tone === 'danger' || tone === 'warning') && (
                    <>
                        <path d="M24 14v13" style={draw(260, 13)} />
                        <path d="M24 33.5v.5" style={draw(380, 1)} />
                    </>
                )}
                {tone === 'info' && (
                    <>
                        <path d="M24 22v12" style={draw(260, 12)} />
                        <path d="M24 15.5v.5" style={draw(380, 1)} />
                    </>
                )}
            </svg>
        </div>
    );
}

/** วางครั้งเดียวต่อ layout (อยู่ใน <Toaster /> แล้ว) */
export function ConfirmHost() {
    const s = useSyncExternalStore(
        (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        () => state,
        () => state,
    );
    const tone = s.tone ?? 'warning';

    return (
        <DialogPrimitive.Root open={s.open} onOpenChange={(open) => !open && close(false)}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-[70] bg-[var(--scrim)] backdrop-blur-[2px]" />
                <DialogPrimitive.Content
                    role="alertdialog"
                    className="glass data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90 fixed top-1/2 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 text-center outline-none data-[state=open]:duration-300"
                >
                    {s.open && <DrawnIcon key={s.title} tone={tone} />}
                    <DialogPrimitive.Title className="text-foreground mt-4 text-lg leading-7 font-medium">{s.title}</DialogPrimitive.Title>
                    {s.text ? (
                        <DialogPrimitive.Description className="text-muted-foreground mt-1 text-sm leading-6 whitespace-pre-line">
                            {s.text}
                        </DialogPrimitive.Description>
                    ) : (
                        <DialogPrimitive.Description className="sr-only">{s.title}</DialogPrimitive.Description>
                    )}
                    <div className="mt-6 flex gap-2">
                        {s.cancelText !== null && (
                            <button
                                type="button"
                                onClick={() => close(false)}
                                className="press border-border bg-card text-foreground hover:bg-secondary h-11 flex-1 rounded-xl border text-sm font-medium"
                            >
                                {s.cancelText}
                            </button>
                        )}
                        <button
                            type="button"
                            autoFocus
                            onClick={() => close(true)}
                            className={cn(
                                'press h-11 flex-1 rounded-xl text-sm font-medium',
                                tone === 'danger'
                                    ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                                    : 'bg-primary text-primary-foreground hover:opacity-90',
                            )}
                        >
                            {s.confirmText}
                        </button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
