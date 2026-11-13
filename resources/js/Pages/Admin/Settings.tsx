import AdminLayout from '@/components/admin/AdminLayout';
import { Button, Card, Field, Input, PageHeader, Textarea } from '@/components/admin/ui';
import type { SharedProps, SiteSettings } from '@/types';
import { useForm, usePage } from '@inertiajs/react';

type Key = keyof SiteSettings;

const groups: { title: string; description?: string; fields: { key: Key; label: string; hint?: string; multiline?: number; type?: string }[] }[] = [
    {
        title: 'ส่วนบนสุด (Hero)',
        fields: [
            { key: 'site_name', label: 'ชื่อเว็บ', hint: 'แสดงเป็นโลโก้มุมซ้ายบน' },
            { key: 'hero_eyebrow', label: 'ข้อความเล็กเหนือหัวข้อ' },
            { key: 'hero_title', label: 'หัวข้อใหญ่' },
            { key: 'hero_subtitle', label: 'คำอธิบายใต้หัวข้อ', multiline: 3 },
            { key: 'availability', label: 'ป้ายสถานะในเมนู', hint: 'เช่น "เปิดรับงานใหม่" — เว้นว่างเพื่อซ่อน' },
        ],
    },
    {
        title: 'เกี่ยวกับ',
        fields: [{ key: 'about', label: 'ข้อความแนะนำ', hint: 'คำจะค่อย ๆ สว่างขึ้นตามการเลื่อนหน้า', multiline: 5 }],
    },
    {
        title: 'ติดต่อ',
        description: 'ช่องที่เว้นว่างจะไม่แสดงบนเว็บ',
        fields: [
            { key: 'contact_title', label: 'หัวข้อส่วนติดต่อ' },
            { key: 'email', label: 'อีเมล', type: 'email' },
            { key: 'phone', label: 'เบอร์โทร' },
            { key: 'line_url', label: 'ลิงก์ LINE', type: 'url' },
            { key: 'facebook_url', label: 'ลิงก์ Facebook', type: 'url' },
            { key: 'github_url', label: 'ลิงก์ GitHub', type: 'url' },
            { key: 'location', label: 'ที่ตั้ง' },
        ],
    },
    {
        title: 'SEO',
        fields: [{ key: 'seo_description', label: 'คำอธิบายเว็บ (Google / แชร์ลิงก์)', multiline: 2 }],
    },
];

export default function Settings() {
    const { values } = usePage<SharedProps & { values: SiteSettings }>().props;
    const form = useForm<SiteSettings>({ ...values });

    return (
        <AdminLayout title="ตั้งค่าเว็บ">
            <PageHeader title="ตั้งค่าเว็บ" description="ข้อความบนหน้าแรกและช่องทางติดต่อ" />
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put('/admin/settings', { preserveScroll: true });
                }}
                className="space-y-6"
            >
                {groups.map((g) => (
                    <Card key={g.title} title={g.title} description={g.description}>
                        <div className="grid gap-4 md:grid-cols-2">
                            {g.fields.map((f) => (
                                <Field key={f.key} label={f.label} hint={f.hint} htmlFor={f.key} error={form.errors[f.key]} className={f.multiline ? 'md:col-span-2' : ''}>
                                    {f.multiline ? (
                                        <Textarea id={f.key} rows={f.multiline} value={form.data[f.key]} onChange={(e) => form.setData(f.key, e.target.value)} />
                                    ) : (
                                        <Input id={f.key} type={f.type ?? 'text'} value={form.data[f.key]} onChange={(e) => form.setData(f.key, e.target.value)} />
                                    )}
                                </Field>
                            ))}
                        </div>
                    </Card>
                ))}
                <div className="sticky bottom-4 flex justify-end">
                    <Button type="submit" loading={form.processing} className="shadow-lg">
                        บันทึกการตั้งค่า
                    </Button>
                </div>
            </form>
        </AdminLayout>
    );
}
