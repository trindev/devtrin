import AdminLayout from '@/components/admin/AdminLayout';
import { Card, PageHeader } from '@/components/admin/ui';
import type { Project, SharedProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Plus, Stethoscope, TriangleAlert } from 'lucide-react';

interface Props extends SharedProps {
    counts: { total: number; published: number; featured: number; no_cover: number };
    recent: Project[];
    alerts: string[];
}

export default function Dashboard() {
    const { counts, recent, alerts, auth } = usePage<Props>().props;

    return (
        <AdminLayout title="ภาพรวม">
            <PageHeader
                title={`สวัสดี ${auth.user?.name ?? ''}`}
                description="จัดการผลงานที่แสดงบนหน้าเว็บ"
                actions={
                    <Link href="/admin/projects/create" className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900">
                        <Plus className="h-4 w-4" /> เพิ่มโปรเจกต์
                    </Link>
                }
            />

            {alerts.map((a) => (
                <div key={a} className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <TriangleAlert className="h-5 w-5 shrink-0" /> {a}
                </div>
            ))}

            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Tile label="โปรเจกต์ทั้งหมด" value={counts.total} />
                <Tile label="แสดงบนเว็บ" value={counts.published} />
                <Tile label="ผลงานเด่น" value={counts.featured} hint="แสดงในส่วนเลื่อนแนวนอน" />
                <Tile label="ยังไม่มีรูปปก" value={counts.no_cover} warn={counts.no_cover > 0} />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card title="แก้ไขล่าสุด" className="md:col-span-2">
                    <ul className="-my-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                        {recent.map((p) => (
                            <li key={p.id}>
                                <Link href={`/admin/projects/${p.slug}/edit`} className="flex items-center gap-3 py-3 hover:opacity-80">
                                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.accent }} />
                                    <span className="flex-1 truncate font-medium">{p.title}</span>
                                    <span className="text-xs text-zinc-500">{new Date(p.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Card>
                <Card title="ศูนย์ดูแลระบบ" description="ตรวจสุขภาพเว็บ อัปเดตเวอร์ชัน และเปิด/ปิดปรับปรุง">
                    <a href="/_maintenance" className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                        <Stethoscope className="h-4 w-4" /> เปิด doctor
                    </a>
                </Card>
            </div>
        </AdminLayout>
    );
}

function Tile({ label, value, hint, warn }: { label: string; value: number; hint?: string; warn?: boolean }) {
    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className={`mt-1 text-3xl font-semibold tracking-tight ${warn ? 'text-amber-600' : ''}`}>{value}</p>
            {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
        </div>
    );
}
