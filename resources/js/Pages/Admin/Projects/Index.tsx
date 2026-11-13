import AdminLayout from '@/components/admin/AdminLayout';
import { Button, PageHeader } from '@/components/admin/ui';
import ProjectArt from '@/components/site/ProjectArt';
import type { Project, SharedProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Pencil, Plus, Star } from 'lucide-react';
import { prepareImage } from '@/lib/image';
import { useEffect, useState } from 'react';

interface Props extends SharedProps {
    projects: Project[];
    statuses: Record<string, string>;
}

type Filter = 'all' | 'shown' | 'hidden';

export default function ProjectsIndex() {
    const { projects, statuses } = usePage<Props>().props;
    const [order, setOrder] = useState(projects);
    const [filter, setFilter] = useState<Filter>('all');
    const dirty = order.some((p, i) => p.id !== projects[i]?.id);

    useEffect(() => setOrder(projects), [projects]);

    const move = (index: number, delta: number) => {
        const next = [...order];
        const [item] = next.splice(index, 1);
        next.splice(index + delta, 0, item);
        setOrder(next);
    };

    // เปลี่ยนบนจอทันที แล้วค่อยบันทึก — ถ้าบันทึกไม่ผ่าน props จาก server จะคืนค่าเดิมให้เอง
    const toggle = (p: Project, field: 'is_published' | 'is_featured') => {
        setOrder((list) => list.map((x) => (x.id === p.id ? { ...x, [field]: !x[field] } : x)));
        router.patch(`/admin/projects/${p.slug}/toggle`, { field }, { preserveScroll: true, preserveState: true, onError: () => setOrder(projects) });
    };

    const [uploading, setUploading] = useState(false);
    const uploadCovers = async (files: FileList | null) => {
        if (!files?.length) return;
        setUploading(true);
        const covers = await Promise.all(Array.from(files).map((f) => prepareImage(f))); // ย่อรูปแต่คงชื่อไฟล์ (= slug) ไว้
        router.post('/admin/projects/covers', { covers }, { forceFormData: true, preserveScroll: true, onFinish: () => setUploading(false) });
    };

    const shownCount = order.filter((p) => p.is_published).length;
    const visible = order.filter((p) => (filter === 'shown' ? p.is_published : filter === 'hidden' ? !p.is_published : true));
    const tabs: [Filter, string, number][] = [
        ['all', 'ทั้งหมด', order.length],
        ['shown', 'แสดงอยู่', shownCount],
        ['hidden', 'ซ่อนอยู่', order.length - shownCount],
    ];

    return (
        <AdminLayout title="โปรเจกต์">
            <PageHeader
                title="โปรเจกต์"
                description={`แสดงบนหน้าเว็บ ${shownCount} จาก ${order.length} โปรเจกต์ · ลำดับในหน้านี้คือลำดับบนหน้าเว็บ`}
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
                        <label
                            className={clsx(
                                'inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 focus-within:ring-2 focus-within:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800',
                                uploading && 'pointer-events-none opacity-60',
                            )}
                            title="ตั้งชื่อไฟล์ให้ตรงกับ slug เช่น staycool.webp"
                        >
                            <ImagePlus className="h-4 w-4" /> {uploading ? 'กำลังอัปโหลด…' : 'อัปโหลดปกหลายรูป'}
                            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => uploadCovers(e.target.files)} />
                        </label>
                        <Link href="/admin/projects/create" className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900">
                            <Plus className="h-4 w-4" /> เพิ่มโปรเจกต์
                        </Link>
                    </>
                }
            />

            <div className="mb-4 inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/70" role="tablist" aria-label="กรองตามการแสดงผล">
                {tabs.map(([key, label, count]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={filter === key}
                        onClick={() => setFilter(key)}
                        className={clsx(
                            'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                            filter === key ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white',
                        )}
                    >
                        {label} <span className="ml-1 text-xs text-zinc-400">{count}</span>
                    </button>
                ))}
            </div>

            {visible.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
                    {order.length === 0 ? 'ยังไม่มีโปรเจกต์ — กด "เพิ่มโปรเจกต์"' : filter === 'hidden' ? 'ไม่มีโปรเจกต์ที่ซ่อนอยู่' : 'ยังไม่มีโปรเจกต์ที่แสดงบนหน้าเว็บ'}
                </div>
            ) : (
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                    {visible.map((p) => {
                        const i = order.indexOf(p);
                        return (
                            <li key={p.id} className={clsx('flex items-center gap-3 p-3 transition-colors sm:gap-4 sm:p-4', !p.is_published && 'bg-zinc-50 dark:bg-zinc-950/40')}>
                                {filter === 'all' && (
                                    <div className="flex flex-col">
                                        <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-zinc-400 hover:text-zinc-900 disabled:opacity-20 dark:hover:text-white" aria-label={`เลื่อน ${p.title} ขึ้น`}>
                                            <ArrowUp className="h-4 w-4" />
                                        </button>
                                        <button type="button" disabled={i === order.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-zinc-400 hover:text-zinc-900 disabled:opacity-20 dark:hover:text-white" aria-label={`เลื่อน ${p.title} ลง`}>
                                            <ArrowDown className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                                <div className={clsx('flex min-w-0 flex-1 items-center gap-3 sm:gap-4', !p.is_published && 'opacity-50')}>
                                    <ProjectArt project={p} className="hidden aspect-[4/3] w-20 shrink-0 rounded-lg sm:block" imgClassName="!text-3xl" />
                                    <div className="min-w-0 flex-1">
                                        <Link href={`/admin/projects/${p.slug}/edit`} className="block truncate font-medium hover:underline">
                                            {p.title}
                                        </Link>
                                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                                            {[p.category, statuses[p.status], p.host, p.images_count ? `${p.images_count} รูป` : null].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                </div>

                                <ShowSwitch checked={p.is_published} title={p.title} onChange={() => toggle(p, 'is_published')} />

                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => toggle(p, 'is_featured')}
                                        aria-pressed={p.is_featured}
                                        aria-label={p.is_featured ? `เอา ${p.title} ออกจากผลงานเด่น` : `ตั้ง ${p.title} เป็นผลงานเด่น`}
                                        title={p.is_featured ? 'ผลงานเด่น (กดเพื่อเอาออก)' : 'ตั้งเป็นผลงานเด่น'}
                                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                                    >
                                        <Star className={clsx('h-4 w-4', p.is_featured && 'fill-amber-400 text-amber-400')} />
                                    </button>
                                    <a href={`/projects/${p.slug}`} target="_blank" rel="noopener" className="hidden rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 sm:block dark:hover:bg-zinc-800 dark:hover:text-white" aria-label="ดูหน้าโปรเจกต์" title="ดูหน้าโปรเจกต์">
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                    <Link href={`/admin/projects/${p.slug}/edit`} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white" aria-label={`แก้ไข ${p.title}`} title="แก้ไข">
                                        <Pencil className="h-4 w-4" />
                                    </Link>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
            <p className="mt-3 text-xs text-zinc-500">อัปโหลดปกหลายรูป: ตั้งชื่อไฟล์ตาม slug ของโปรเจกต์ (ส่วนท้ายของลิงก์ /projects/…) เช่น staycool.webp · โปรเจกต์ที่ซ่อนไว้จะไม่อยู่ในหน้าแรก แต่แอดมินยังเปิดดูหน้าโปรเจกต์ได้ · ★ = แสดงในส่วนผลงานเด่น (เฉพาะโปรเจกต์ที่แสดงอยู่)</p>
        </AdminLayout>
    );
}

/** สวิตช์เปิด/ปิดการแสดงบนหน้าบ้าน — มีข้อความกำกับให้เห็นสถานะชัดเจน */
function ShowSwitch({ checked, title, onChange }: { checked: boolean; title: string; onChange: () => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={`แสดง ${title} บนหน้าเว็บ`}
            onClick={onChange}
            className="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
            <span className={clsx('hidden w-8 text-right sm:inline', checked ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400')}>{checked ? 'แสดง' : 'ซ่อน'}</span>
            <span className={clsx('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700')}>
                <span className={clsx('absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
            </span>
        </button>
    );
}
