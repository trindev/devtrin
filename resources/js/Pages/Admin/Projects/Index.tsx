import AdminLayout from '@/components/admin/AdminLayout';
import { Button, PageHeader } from '@/components/admin/ui';
import ProjectArt from '@/components/site/ProjectArt';
import type { Project, SharedProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Pencil, Plus, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props extends SharedProps {
    projects: Project[];
    statuses: Record<string, string>;
}

export default function ProjectsIndex() {
    const { projects, statuses } = usePage<Props>().props;
    const [order, setOrder] = useState(projects);
    const dirty = order.some((p, i) => p.id !== projects[i]?.id);

    useEffect(() => setOrder(projects), [projects]);

    const move = (index: number, delta: number) => {
        const next = [...order];
        const [item] = next.splice(index, 1);
        next.splice(index + delta, 0, item);
        setOrder(next);
    };

    const toggle = (p: Project, field: 'is_published' | 'is_featured') =>
        router.patch(`/admin/projects/${p.slug}/toggle`, { field }, { preserveScroll: true, preserveState: true });

    return (
        <AdminLayout title="โปรเจกต์">
            <PageHeader
                title="โปรเจกต์"
                description="ลำดับในหน้านี้คือลำดับที่แสดงบนหน้าเว็บ"
                actions={
                    <>
                        {dirty && (
                            <>
                                <Button variant="ghost" onClick={() => setOrder(projects)}>
                                    ยกเลิก
                                </Button>
                                <Button onClick={() => router.post('/admin/projects/reorder', { ids: order.map((p) => p.id) }, { preserveScroll: true })}>บันทึกลำดับ</Button>
                            </>
                        )}
                        <Link href="/admin/projects/create" className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900">
                            <Plus className="h-4 w-4" /> เพิ่มโปรเจกต์
                        </Link>
                    </>
                }
            />

            {order.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">ยังไม่มีโปรเจกต์ — กด "เพิ่มโปรเจกต์"</div>
            ) : (
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                    {order.map((p, i) => (
                        <li key={p.id} className={clsx('flex items-center gap-3 p-3 sm:gap-4 sm:p-4', !p.is_published && 'opacity-60')}>
                            <div className="flex flex-col">
                                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-zinc-400 hover:text-zinc-900 disabled:opacity-20 dark:hover:text-white" aria-label={`เลื่อน ${p.title} ขึ้น`}>
                                    <ArrowUp className="h-4 w-4" />
                                </button>
                                <button type="button" disabled={i === order.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-zinc-400 hover:text-zinc-900 disabled:opacity-20 dark:hover:text-white" aria-label={`เลื่อน ${p.title} ลง`}>
                                    <ArrowDown className="h-4 w-4" />
                                </button>
                            </div>
                            <ProjectArt project={p} className="hidden aspect-[4/3] w-20 shrink-0 rounded-lg sm:block" imgClassName="!text-3xl" />
                            <div className="min-w-0 flex-1">
                                <Link href={`/admin/projects/${p.slug}/edit`} className="block truncate font-medium hover:underline">
                                    {p.title}
                                </Link>
                                <p className="mt-0.5 truncate text-xs text-zinc-500">
                                    {[p.category, statuses[p.status], p.host, p.images_count ? `${p.images_count} รูป` : null].filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <IconButton active={p.is_featured} onClick={() => toggle(p, 'is_featured')} label={p.is_featured ? 'เอาออกจากผลงานเด่น' : 'ตั้งเป็นผลงานเด่น'}>
                                    <Star className={clsx('h-4 w-4', p.is_featured && 'fill-amber-400 text-amber-400')} />
                                </IconButton>
                                <IconButton active={p.is_published} onClick={() => toggle(p, 'is_published')} label={p.is_published ? 'ซ่อนจากหน้าเว็บ' : 'แสดงบนหน้าเว็บ'}>
                                    {p.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </IconButton>
                                <a href={`/projects/${p.slug}`} target="_blank" rel="noopener" className="hidden rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 sm:block dark:hover:bg-zinc-800 dark:hover:text-white" aria-label="ดูหน้าโปรเจกต์" title="ดูหน้าโปรเจกต์">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                                <Link href={`/admin/projects/${p.slug}/edit`} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white" aria-label={`แก้ไข ${p.title}`} title="แก้ไข">
                                    <Pencil className="h-4 w-4" />
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </AdminLayout>
    );
}

function IconButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 aria-pressed:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white dark:aria-pressed:text-white"
        >
            {children}
        </button>
    );
}
