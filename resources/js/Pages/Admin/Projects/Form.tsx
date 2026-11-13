import AdminLayout from '@/components/admin/AdminLayout';
import { Button, Card, Field, Input, PageHeader, Switch, Textarea } from '@/components/admin/ui';
import ProjectArt from '@/components/site/ProjectArt';
import { prepareImage } from '@/lib/image';
import type { Project, SharedProps } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import clsx from 'clsx';
import { ArrowLeft, ExternalLink, ImagePlus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Props extends SharedProps {
    project: Project | null;
    statuses: Record<string, string>;
    categories: string[];
    techSuggestions: string[];
}

type FormData = {
    title: string;
    slug: string;
    tagline: string;
    description: string;
    url: string;
    repo_url: string;
    category: string;
    tech_stack: string[];
    year: string;
    status: string;
    accent: string;
    is_featured: boolean;
    is_published: boolean;
    cover: File | null;
    remove_cover: boolean;
    images: File[];
    remove_images: number[];
};

const PRESET_COLORS = ['#7c5cff', '#c8ff3d', '#16a3a3', '#2546c8', '#e0567a', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#a855f7'];

export default function ProjectForm() {
    const { project, statuses, categories, techSuggestions } = usePage<Props>().props;
    const editing = !!project;

    const form = useForm<FormData>({
        title: project?.title ?? '',
        slug: project?.slug ?? '',
        tagline: project?.tagline ?? '',
        description: project?.description ?? '',
        url: project?.url ?? '',
        repo_url: project?.repo_url ?? '',
        category: project?.category ?? '',
        tech_stack: project?.tech_stack ?? [],
        year: project?.year ? String(project.year) : '',
        status: project?.status ?? 'live',
        accent: project?.accent ?? '#7c5cff',
        is_featured: project?.is_featured ?? false,
        is_published: project?.is_published ?? true,
        cover: null,
        remove_cover: false,
        images: [],
        remove_images: [],
    });

    // หลังบันทึก (redirect กลับมาหน้าเดิม) ล้างไฟล์ที่เลือกไว้ ไม่งั้นกดบันทึกซ้ำจะอัปโหลดซ้ำ
    useEffect(() => {
        form.setData((d) => ({ ...d, cover: null, remove_cover: false, images: [], remove_images: [] }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.updated_at]);

    const coverPreview = useObjectUrl(form.data.cover);
    const galleryPreviews = useObjectUrls(form.data.images);
    const [preparing, setPreparing] = useState(false);
    const errors = form.errors as Record<string, string>;
    const imageErrors = Object.entries(errors).filter(([k]) => k.startsWith('images.')).map(([, v]) => v);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, forceFormData: true };
        if (editing) {
            form.transform((d) => ({ ...d, _method: 'put' }));
            form.post(`/admin/projects/${project!.slug}`, options);
        } else {
            form.post('/admin/projects', options);
        }
    };

    const pickFiles = async (files: FileList | null, multiple: boolean) => {
        if (!files?.length) return;
        setPreparing(true);
        const prepared = await Promise.all(Array.from(files).map((f) => prepareImage(f)));
        setPreparing(false);
        if (multiple) form.setData('images', [...form.data.images, ...prepared]);
        else form.setData((d) => ({ ...d, cover: prepared[0], remove_cover: false }));
    };

    const destroy = () => {
        if (!project || !confirm(`ลบ "${project.title}" และรูปทั้งหมดของโปรเจกต์นี้? ย้อนกลับไม่ได้`)) return;
        router.delete(`/admin/projects/${project.slug}`);
    };

    const artProject = {
        title: form.data.title || 'Project',
        accent: form.data.accent,
        cover_url: coverPreview ?? (form.data.remove_cover ? null : (project?.cover_url ?? null)),
    };
    const existingImages = (project?.images ?? []).filter((img) => !form.data.remove_images.includes(img.id));

    return (
        <AdminLayout title={editing ? `แก้ไข ${project!.title}` : 'เพิ่มโปรเจกต์'}>
            <Link href="/admin/projects" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" /> โปรเจกต์ทั้งหมด
            </Link>
            <PageHeader
                title={editing ? project!.title : 'เพิ่มโปรเจกต์'}
                actions={
                    editing && (
                        <a href={`/projects/${project!.slug}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                            <ExternalLink className="h-4 w-4" /> ดูบนเว็บ
                        </a>
                    )
                }
            />

            <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card title="ข้อมูลหลัก">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="ชื่อโปรเจกต์ *" htmlFor="title" error={errors.title} className="md:col-span-2">
                                <Input id="title" required value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} aria-invalid={!!errors.title} />
                            </Field>
                            <Field label="คำโปรยสั้น ๆ" htmlFor="tagline" error={errors.tagline} hint="บรรทัดเดียว แสดงใต้ชื่อในการ์ดและหน้ารายละเอียด" className="md:col-span-2">
                                <Input id="tagline" maxLength={200} value={form.data.tagline} onChange={(e) => form.setData('tagline', e.target.value)} />
                            </Field>
                            <Field label="ลิงก์เว็บ" htmlFor="url" error={errors.url} hint="เช่น https://staycool.devtrin.com">
                                <Input id="url" type="url" inputMode="url" placeholder="https://" value={form.data.url} onChange={(e) => form.setData('url', e.target.value)} />
                            </Field>
                            <Field label="ลิงก์ source code" htmlFor="repo_url" error={errors.repo_url} hint="เว้นว่างถ้าเป็น private">
                                <Input id="repo_url" type="url" inputMode="url" placeholder="https://github.com/…" value={form.data.repo_url} onChange={(e) => form.setData('repo_url', e.target.value)} />
                            </Field>
                            <Field label="รายละเอียด" htmlFor="description" error={errors.description} hint="เว้นบรรทัดว่างเพื่อขึ้นย่อหน้าใหม่" className="md:col-span-2">
                                <Textarea id="description" rows={8} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                            </Field>
                        </div>
                    </Card>

                    <Card title="รูปปก" description="แนะนำแนวนอน 16:10 — ระบบย่อรูปให้อัตโนมัติก่อนอัปโหลด">
                        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                            <ProjectArt project={artProject} className="aspect-[16/10] w-full rounded-xl" />
                            <div className="flex gap-2 sm:flex-col">
                                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-medium hover:bg-zinc-50 focus-within:ring-2 focus-within:ring-violet-500 dark:border-zinc-700 dark:hover:bg-zinc-800">
                                    <ImagePlus className="h-4 w-4" /> {artProject.cover_url ? 'เปลี่ยนรูป' : 'เลือกรูป'}
                                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickFiles(e.target.files, false)} />
                                </label>
                                {artProject.cover_url && (
                                    <Button type="button" variant="ghost" onClick={() => form.setData((d) => ({ ...d, cover: null, remove_cover: !!project?.cover_url }))}>
                                        เอารูปออก
                                    </Button>
                                )}
                            </div>
                        </div>
                        {errors.cover && <p className="mt-2 text-sm text-red-600">{errors.cover}</p>}
                        {!artProject.cover_url && <p className="mt-2 text-xs text-zinc-500">ไม่มีรูปปก หน้าเว็บจะใช้ภาพจากสีประจำโปรเจกต์แทน (ตัวอย่างด้านบน)</p>}
                    </Card>

                    <Card title="แกลเลอรี" description="ภาพหน้าจอที่แสดงในหน้ารายละเอียด">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {existingImages.map((img) => (
                                <Thumb key={img.id} src={img.url} onRemove={() => form.setData('remove_images', [...form.data.remove_images, img.id])} />
                            ))}
                            {galleryPreviews.map((src, i) => (
                                <Thumb key={src} src={src} isNew onRemove={() => form.setData('images', form.data.images.filter((_, j) => j !== i))} />
                            ))}
                            <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-zinc-200 text-sm text-zinc-500 hover:border-violet-400 hover:text-violet-600 focus-within:ring-2 focus-within:ring-violet-500 dark:border-zinc-700">
                                <span className="flex flex-col items-center gap-1">
                                    <ImagePlus className="h-5 w-5" /> เพิ่มรูป
                                </span>
                                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => pickFiles(e.target.files, true)} />
                            </label>
                        </div>
                        {form.data.remove_images.length > 0 && (
                            <p className="mt-3 text-xs text-amber-600">
                                จะลบ {form.data.remove_images.length} รูปเมื่อกดบันทึก ·{' '}
                                <button type="button" className="underline" onClick={() => form.setData('remove_images', [])}>
                                    ยกเลิก
                                </button>
                            </p>
                        )}
                        {imageErrors.map((err) => (
                            <p key={err} className="mt-2 text-sm text-red-600">
                                {err}
                            </p>
                        ))}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title="การแสดงผล">
                        <div className="space-y-5">
                            <Switch label="แสดงบนหน้าเว็บ" checked={form.data.is_published} onChange={(v) => form.setData('is_published', v)} />
                            <Switch label="ผลงานเด่น" description="แสดงในส่วนการ์ดใหญ่เลื่อนแนวนอน" checked={form.data.is_featured} onChange={(v) => form.setData('is_featured', v)} />
                        </div>
                    </Card>

                    <Card title="รายละเอียดเพิ่มเติม">
                        <div className="space-y-4">
                            <Field label="สถานะ" htmlFor="status" error={errors.status}>
                                <select
                                    id="status"
                                    value={form.data.status}
                                    onChange={(e) => form.setData('status', e.target.value)}
                                    className="block h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                >
                                    {Object.entries(statuses).map(([k, v]) => (
                                        <option key={k} value={k}>
                                            {v}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="หมวด" htmlFor="category" error={errors.category} hint="ใช้เป็นตัวกรองบนหน้าเว็บ">
                                <Input id="category" list="categories" value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} placeholder="Web App, IoT, PWA…" />
                                <datalist id="categories">
                                    {categories.map((c) => (
                                        <option key={c} value={c} />
                                    ))}
                                </datalist>
                            </Field>
                            <Field label="ปี" htmlFor="year" error={errors.year}>
                                <Input id="year" type="number" inputMode="numeric" min={2000} max={2100} value={form.data.year} onChange={(e) => form.setData('year', e.target.value)} />
                            </Field>
                            <TechInput value={form.data.tech_stack} onChange={(v) => form.setData('tech_stack', v)} suggestions={techSuggestions} error={errors.tech_stack} />
                            <Field label="สีประจำโปรเจกต์" htmlFor="accent" error={errors.accent}>
                                <div className="flex flex-wrap items-center gap-2">
                                    {PRESET_COLORS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => form.setData('accent', c)}
                                            className={clsx('h-7 w-7 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-zinc-900', form.data.accent.toLowerCase() === c && 'ring-2 ring-zinc-900 dark:ring-white')}
                                            style={{ background: c }}
                                            aria-label={`เลือกสี ${c}`}
                                        />
                                    ))}
                                    <input id="accent" type="color" value={form.data.accent} onChange={(e) => form.setData('accent', e.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" aria-label="เลือกสีเอง" />
                                </div>
                            </Field>
                            <Field label="Slug (URL)" htmlFor="slug" error={errors.slug} hint={`/projects/${form.data.slug || 'สร้างจากชื่ออัตโนมัติ'}`}>
                                <Input id="slug" value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value.toLowerCase())} placeholder="อัตโนมัติ" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
                            </Field>
                        </div>
                    </Card>

                    <div className="sticky bottom-4 space-y-3">
                        {form.progress && (
                            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                <div className="h-full bg-violet-600 transition-all" style={{ width: `${form.progress.percentage ?? 0}%` }} />
                            </div>
                        )}
                        <Button type="submit" className="w-full shadow-lg" loading={form.processing || preparing}>
                            {preparing ? 'กำลังเตรียมรูป…' : editing ? 'บันทึก' : 'เพิ่มโปรเจกต์'}
                        </Button>
                        {editing && (
                            <Button type="button" variant="danger" className="w-full" onClick={destroy}>
                                <Trash2 className="h-4 w-4" /> ลบโปรเจกต์
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}

function Thumb({ src, onRemove, isNew }: { src: string; onRemove: () => void; isNew?: boolean }) {
    return (
        <div className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
            <img src={src} alt="" className="h-full w-full object-cover" />
            {isNew && <span className="absolute top-2 left-2 rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-medium text-white">ใหม่</span>}
            <button type="button" onClick={onRemove} className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white opacity-90 hover:bg-black" aria-label="เอารูปนี้ออก">
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

function TechInput({ value, onChange, suggestions, error }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[]; error?: string }) {
    const [text, setText] = useState('');
    const add = (raw: string) => {
        const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
        if (items.length) onChange([...new Set([...value, ...items])]);
        setText('');
    };
    const rest = suggestions.filter((s) => !value.includes(s));

    return (
        <Field label="เทคโนโลยี" htmlFor="tech" error={error} hint="พิมพ์แล้วกด Enter หรือคั่นด้วย ,">
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-200 p-2 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/15 dark:border-zinc-700">
                {value.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 py-1 pr-1 pl-2 text-xs font-medium dark:bg-zinc-800">
                        {t}
                        <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700" aria-label={`ลบ ${t}`}>
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}
                <input
                    id="tech"
                    list="tech-suggestions"
                    value={text}
                    onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add(text);
                        } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
                    }}
                    onBlur={() => text && add(text)}
                    className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
                    placeholder={value.length ? '' : 'Laravel, React…'}
                />
                <datalist id="tech-suggestions">
                    {rest.map((s) => (
                        <option key={s} value={s} />
                    ))}
                </datalist>
            </div>
        </Field>
    );
}

function useObjectUrl(file: File | null) {
    const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
    return url;
}

function useObjectUrls(files: File[]) {
    const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
    useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
    return urls;
}
