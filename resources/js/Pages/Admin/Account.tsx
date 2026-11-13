import AdminLayout from '@/components/admin/AdminLayout';
import { Button, Card, Field, Input, PageHeader } from '@/components/admin/ui';
import type { SharedProps } from '@/types';
import { useForm, usePage } from '@inertiajs/react';

export default function Account() {
    const { auth } = usePage<SharedProps>().props;
    const form = useForm({ name: auth.user?.name ?? '', email: auth.user?.email ?? '', current_password: '', password: '', password_confirmation: '' });

    return (
        <AdminLayout title="บัญชีของฉัน">
            <PageHeader title="บัญชีของฉัน" />
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put('/admin/account', { preserveScroll: true, onSuccess: () => form.reset('current_password', 'password', 'password_confirmation') });
                }}
                className="max-w-xl space-y-6"
            >
                <Card title="ข้อมูลบัญชี">
                    <div className="space-y-4">
                        <Field label="ชื่อ" htmlFor="name" error={form.errors.name}>
                            <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                        </Field>
                        <Field label="อีเมล (ใช้เข้าสู่ระบบ)" htmlFor="email" error={form.errors.email}>
                            <Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} required />
                        </Field>
                    </div>
                </Card>
                <Card title="เปลี่ยนรหัสผ่าน" description="เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน">
                    <div className="space-y-4">
                        <Field label="รหัสผ่านปัจจุบัน" htmlFor="current_password" error={form.errors.current_password}>
                            <Input id="current_password" type="password" autoComplete="current-password" value={form.data.current_password} onChange={(e) => form.setData('current_password', e.target.value)} />
                        </Field>
                        <Field label="รหัสผ่านใหม่" htmlFor="password" error={form.errors.password} hint="อย่างน้อย 10 ตัวอักษร">
                            <Input id="password" type="password" autoComplete="new-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} />
                        </Field>
                        <Field label="ยืนยันรหัสผ่านใหม่" htmlFor="password_confirmation">
                            <Input id="password_confirmation" type="password" autoComplete="new-password" value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} />
                        </Field>
                    </div>
                </Card>
                <Button type="submit" loading={form.processing}>
                    บันทึก
                </Button>
            </form>
        </AdminLayout>
    );
}
