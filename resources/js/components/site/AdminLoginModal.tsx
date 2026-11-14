import { setSmoothScrollPaused } from '@/lib/motion';
import { useForm } from '@inertiajs/react';
import { LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

/** หน้าต่าง login หลังบ้าน — เปิดจากทางลับที่ footer (แตะ © 5 ครั้ง) ไม่มีลิงก์ให้เห็นบนหน้าเว็บ */
export default function AdminLoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const form = useForm({ email: '', password: '', remember: true });
    const email = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        setSmoothScrollPaused(true);
        const t = setTimeout(() => email.current?.focus(), 50);
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => {
            clearTimeout(t);
            window.removeEventListener('keydown', onKey);
            setSmoothScrollPaused(false);
        };
    }, [open, onClose]);

    if (!open) return null;

    const input = 'block h-12 w-full rounded-2xl border border-paper/15 bg-ink px-4 text-paper outline-none transition focus:border-lime';

    return (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-dark/70 px-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-login-title"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post('/admin/login', { preserveScroll: true, preserveState: true, onFinish: () => form.reset('password') });
                }}
                className="relative w-full max-w-sm space-y-4 rounded-3xl border border-paper/10 bg-ink-2 p-6 shadow-2xl"
            >
                <button type="button" onClick={onClose} className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper" aria-label="ปิด">
                    <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                    <img src="/favicon.svg" alt="" className="h-10 w-10 rounded-xl" />
                    <h2 id="admin-login-title" className="text-lg font-semibold">
                        เข้าสู่หลังบ้าน
                    </h2>
                </div>
                <label className="block">
                    <span className="mb-1.5 block text-sm text-paper/70">อีเมล</span>
                    <input ref={email} type="email" autoComplete="username" required value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} className={input} aria-invalid={!!form.errors.email} />
                </label>
                <label className="block">
                    <span className="mb-1.5 block text-sm text-paper/70">รหัสผ่าน</span>
                    <input type="password" autoComplete="current-password" required value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} className={input} />
                </label>
                {(form.errors.email || form.errors.password) && (
                    <p className="text-sm text-red-500" role="alert">
                        {form.errors.email || form.errors.password}
                    </p>
                )}
                <label className="flex items-center gap-2 text-sm text-paper/70">
                    <input type="checkbox" checked={form.data.remember} onChange={(e) => form.setData('remember', e.target.checked)} className="h-4 w-4 accent-lime" />
                    จดจำการเข้าสู่ระบบ
                </label>
                <button type="submit" disabled={form.processing} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lime font-semibold text-dark disabled:opacity-60">
                    {form.processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    เข้าสู่ระบบ
                </button>
            </form>
        </div>
    );
}
