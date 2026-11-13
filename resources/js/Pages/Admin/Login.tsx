import { Button, Field, Input } from '@/components/admin/ui';
import type { SharedProps } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

export default function Login() {
    const { site } = usePage<SharedProps>().props;
    const form = useForm({ email: '', password: '', remember: true });

    return (
        <div className="grid min-h-screen place-items-center bg-zinc-50 px-4 dark:bg-zinc-950">
            <Head title={`เข้าสู่ระบบ · ${site.site_name}`} />
            <div className="w-full max-w-sm">
                <Link href="/" className="mb-8 flex flex-col items-center gap-4 font-display text-3xl font-bold text-zinc-900 dark:text-white">
                    <img src="/favicon.svg" alt="" className="h-16 w-16 rounded-2xl shadow-lg" />
                    <span>
                    {site.site_name.toLowerCase()}
                    <span className="text-violet-600">.</span>
                    </span>
                </Link>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/admin/login', { onFinish: () => form.reset('password') });
                    }}
                    className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">เข้าสู่หลังบ้าน</h1>
                    <Field label="อีเมล" htmlFor="email" error={form.errors.email}>
                        <Input id="email" type="email" autoComplete="username" autoFocus required value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} aria-invalid={!!form.errors.email} />
                    </Field>
                    <Field label="รหัสผ่าน" htmlFor="password" error={form.errors.password}>
                        <Input id="password" type="password" autoComplete="current-password" required value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} />
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <input type="checkbox" checked={form.data.remember} onChange={(e) => form.setData('remember', e.target.checked)} className="h-4 w-4 rounded accent-violet-600" />
                        จดจำการเข้าสู่ระบบ
                    </label>
                    <Button type="submit" className="w-full" loading={form.processing}>
                        เข้าสู่ระบบ
                    </Button>
                </form>
            </div>
        </div>
    );
}
