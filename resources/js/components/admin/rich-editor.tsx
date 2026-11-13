import { cn } from '@/lib/utils';
import {
    Bold,
    Check,
    Heading,
    ImagePlus,
    Italic,
    Link2,
    List,
    ListOrdered,
    type LucideIcon,
    PenLine,
    Quote,
    Redo2,
    RemoveFormatting,
    Strikethrough,
    Underline,
    Undo2,
    X,
} from 'lucide-react';
import { type ClipboardEvent, type DragEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

/**
 * ช่องเขียนข้อความแบบจัดรูปแบบสำหรับอีเมล (contentEditable + execCommand — เบา ไม่ต้องลง editor library)
 * - วางข้อความจากที่อื่นเป็นข้อความล้วน (กันสไตล์รก ๆ จาก Word/เว็บ) แต่วางรูปได้
 * - รูปที่แทรกใช้ blob: URL ระหว่างเขียน — ตอนส่งแปลงเป็นไฟล์แนบแบบ inline ด้วย collectInlineImages()
 * - เซิร์ฟเวอร์กรอง HTML อีกชั้น (App\Support\MailHtml) จึงไม่ต้องเชื่อสิ่งที่ส่งมาจากหน้านี้
 */

export const MAX_IMAGE_MB = 5;

/** สไตล์ของเนื้อหาในช่องเขียนและตัวอย่างลายเซ็น */
export const richContent =
    'text-sm leading-6 break-words [&_a]:text-primary [&_a]:underline [&_blockquote]:text-text-2 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-medium [&_img]:my-1 [&_img]:inline-block [&_img]:max-h-80 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:min-h-6 [&_ul]:list-disc [&_ul]:pl-6 [&_[data-signature]]:text-text-2 [&_[data-signature]]:mt-4';

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** ข้อความล้วน → ย่อหน้า HTML */
export const textToHtml = (text: string) => escapeHtml(text).replace(/\n/g, '<br>');

export const signatureBlock = (html: string) => `<div data-signature="1">${html}</div>`;

/**
 * แปลงรูป blob: ในเนื้อหาเป็น cid:inline-N และคืนไฟล์ตามลำดับ — รูปที่ถูกลบออกจากเนื้อหาแล้วจะไม่ถูกส่ง
 */
export function collectInlineImages(html: string, images: Map<string, File>): { html: string; files: File[] } {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const files: File[] = [];
    const index = new Map<string, number>();
    doc.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src') ?? '';
        const file = images.get(src);
        if (!file) {
            if (src.startsWith('blob:') || src.startsWith('data:')) img.remove();

            return;
        }
        if (!index.has(src)) {
            index.set(src, files.length);
            files.push(file);
        }
        img.setAttribute('src', `cid:inline-${index.get(src)}`);
    });

    return { html: doc.body.innerHTML, files };
}

type Command = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList';
const STATEFUL: Command[] = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'];

export function RichEditor({
    initialHtml,
    onChange,
    images,
    signature,
    minHeight = 'min-h-64',
    autoFocus,
    placeholder,
    onImageError,
}: {
    /** ค่าเริ่มต้น — เปลี่ยนเนื้อหาจากภายนอกด้วยการเปลี่ยน key ของ component */
    initialHtml: string;
    onChange: (html: string) => void;
    /** มีค่า = แทรกรูปได้ (blob URL → File) */
    images?: Map<string, File>;
    /** มีค่า = มีปุ่มใส่/เอาลายเซ็นออก */
    signature?: string | null;
    minHeight?: string;
    autoFocus?: boolean;
    placeholder?: string;
    onImageError?: (message: string) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const range = useRef<Range | null>(null);
    const [active, setActive] = useState<Partial<Record<Command, boolean>>>({});
    const [linking, setLinking] = useState<string | null>(null);
    const [hasSignature, setHasSignature] = useState(false);
    const [empty, setEmpty] = useState(true);

    const emit = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        onChange(el.innerHTML);
        setHasSignature(!!el.querySelector('[data-signature]'));
        setEmpty(!el.textContent?.trim() && !el.querySelector('img'));
    }, [onChange]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.innerHTML = initialHtml || '<p><br></p>';
        emit();
        if (autoFocus) {
            el.focus();
            const r = document.createRange();
            r.setStart(el, 0);
            r.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(r);
        }
        // เนื้อหาเริ่มต้นตั้งครั้งเดียวตอน mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // สถานะปุ่ม (ตัวหนาอยู่ไหม ฯลฯ) ตามตำแหน่งเคอร์เซอร์
    useEffect(() => {
        const update = () => {
            const sel = window.getSelection();
            if (!sel?.anchorNode || !ref.current?.contains(sel.anchorNode)) return;
            range.current = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
            setActive(Object.fromEntries(STATEFUL.map((c) => [c, document.queryCommandState(c)])));
        };
        document.addEventListener('selectionchange', update);

        return () => document.removeEventListener('selectionchange', update);
    }, []);

    const restore = () => {
        const el = ref.current;
        if (!el) return;
        el.focus();
        const sel = window.getSelection();
        if (range.current && sel) {
            sel.removeAllRanges();
            sel.addRange(range.current);
        }
    };

    const exec = (command: string, value?: string) => {
        restore();
        document.execCommand('styleWithCSS', false, 'false');
        document.execCommand(command, false, value);
        emit();
    };

    const toggleBlock = (tag: 'blockquote' | 'h3') => {
        restore();
        const node = window.getSelection()?.anchorNode;
        const block = (node instanceof Element ? node : node?.parentElement)?.closest('blockquote, h3');
        document.execCommand('formatBlock', false, block?.tagName.toLowerCase() === tag ? 'p' : tag);
        emit();
    };

    const insertImages = (files: File[]) => {
        if (!images) return;
        const html: string[] = [];
        for (const file of files) {
            if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) {
                onImageError?.(`${file.name}: แทรกได้เฉพาะรูป JPG PNG GIF หรือ WEBP`);
                continue;
            }
            if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
                onImageError?.(`${file.name}: รูปต้องไม่เกิน ${MAX_IMAGE_MB}MB`);
                continue;
            }
            const url = URL.createObjectURL(file);
            images.set(url, file);
            html.push(`<img src="${url}" alt="${escapeHtml(file.name)}">`);
        }
        if (html.length) exec('insertHTML', html.join(' '));
    };

    const applyLink = () => {
        const url = (linking ?? '').trim();
        setLinking(null);
        if (!url) return;
        const href = /^(https?:\/\/|mailto:)/i.test(url) ? url : url.includes('@') && !url.includes('/') ? `mailto:${url}` : `https://${url}`;
        restore();
        const text = window.getSelection()?.toString();
        if (text) document.execCommand('createLink', false, href);
        else document.execCommand('insertHTML', false, `<a href="${escapeHtml(href)}">${escapeHtml(url)}</a>&nbsp;`);
        emit();
    };

    const toggleSignature = () => {
        const el = ref.current;
        if (!el || !signature) return;
        const existing = el.querySelector('[data-signature]');
        if (existing) {
            existing.remove();
        } else {
            const holder = document.createElement('div');
            holder.innerHTML = signatureBlock(signature);
            // ใส่ก่อนข้อความที่ยกมา (ตอบกลับ/ส่งต่อ) ถ้ามี ไม่งั้นต่อท้าย
            el.insertBefore(holder.firstChild!, el.querySelector(':scope > [data-quote]'));
        }
        emit();
    };

    const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
        const files = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'));
        e.preventDefault();
        if (files.length && images) {
            insertImages(files);

            return;
        }
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        emit();
    };

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
        if (!files.length || !images) return;
        e.preventDefault();
        const caret = document.caretRangeFromPoint?.(e.clientX, e.clientY);
        if (caret) range.current = caret;
        insertImages(files);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            setLinking('');
        }
    };

    const tools: ({ icon: LucideIcon; label: string; on?: boolean; run: () => void } | '|')[] = [
        { icon: Bold, label: 'ตัวหนา (⌘B)', on: active.bold, run: () => exec('bold') },
        { icon: Italic, label: 'ตัวเอียง (⌘I)', on: active.italic, run: () => exec('italic') },
        { icon: Underline, label: 'ขีดเส้นใต้ (⌘U)', on: active.underline, run: () => exec('underline') },
        { icon: Strikethrough, label: 'ขีดฆ่า', on: active.strikeThrough, run: () => exec('strikeThrough') },
        '|',
        { icon: Heading, label: 'หัวข้อ', run: () => toggleBlock('h3') },
        { icon: List, label: 'รายการแบบจุด', on: active.insertUnorderedList, run: () => exec('insertUnorderedList') },
        { icon: ListOrdered, label: 'รายการแบบตัวเลข', on: active.insertOrderedList, run: () => exec('insertOrderedList') },
        { icon: Quote, label: 'ข้อความอ้างอิง', run: () => toggleBlock('blockquote') },
        '|',
        { icon: Link2, label: 'ใส่ลิงก์ (⌘K)', run: () => setLinking('') },
        ...(images ? [{ icon: ImagePlus, label: 'แทรกรูปในเนื้อหา', run: () => fileRef.current?.click() }] : []),
        ...(signature ? [{ icon: PenLine, label: hasSignature ? 'เอาลายเซ็นออก' : 'ใส่ลายเซ็น', on: hasSignature, run: toggleSignature }] : []),
        { icon: RemoveFormatting, label: 'ล้างรูปแบบ', run: () => exec('removeFormat') },
        '|',
        { icon: Undo2, label: 'เลิกทำ', run: () => exec('undo') },
        { icon: Redo2, label: 'ทำซ้ำ', run: () => exec('redo') },
    ];

    return (
        <div className="border-input bg-card focus-within:border-primary/50 overflow-hidden rounded-xl border">
            <div
                className="border-border bg-secondary/50 flex flex-wrap items-center gap-0.5 border-b p-1"
                role="toolbar"
                aria-label="จัดรูปแบบข้อความ"
            >
                {tools.map((t, i) =>
                    t === '|' ? (
                        <span key={i} className="bg-border mx-1 h-5 w-px" aria-hidden />
                    ) : (
                        <button
                            key={t.label}
                            type="button"
                            title={t.label}
                            aria-label={t.label}
                            aria-pressed={t.on ?? undefined}
                            // กดปุ่มแล้วไม่ให้ช่องเขียนเสียโฟกัส (selection จะได้ไม่หาย)
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={t.run}
                            className={cn(
                                'text-text-2 hover:bg-card hover:text-foreground grid size-8 place-items-center rounded-lg transition-colors',
                                t.on && 'bg-card text-primary shadow-xs',
                            )}
                        >
                            <t.icon className="size-4" strokeWidth={1.75} />
                        </button>
                    ),
                )}
            </div>

            {linking !== null && (
                <div className="border-border flex items-center gap-2 border-b px-3 py-2">
                    <Link2 className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />
                    <input
                        autoFocus
                        value={linking}
                        onChange={(e) => setLinking(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                applyLink();
                            }
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                e.stopPropagation();
                                setLinking(null);
                                restore();
                            }
                        }}
                        placeholder="วางลิงก์ เช่น https://law-quest.devtrin.com หรืออีเมล"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                    <button
                        type="button"
                        onClick={applyLink}
                        className="text-primary grid size-7 place-items-center rounded-md"
                        aria-label="ใส่ลิงก์"
                    >
                        <Check className="size-4" strokeWidth={1.75} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setLinking(null);
                            restore();
                        }}
                        className="text-muted-foreground grid size-7 place-items-center rounded-md"
                        aria-label="ยกเลิก"
                    >
                        <X className="size-4" strokeWidth={1.75} />
                    </button>
                </div>
            )}

            <div className="relative">
                {empty && placeholder && (
                    <p className="text-muted-foreground pointer-events-none absolute top-3 left-3 text-sm" aria-hidden>
                        {placeholder}
                    </p>
                )}
                <div
                    ref={ref}
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline
                    aria-label={placeholder ?? 'ข้อความ'}
                    onInput={emit}
                    onBlur={emit}
                    onPaste={onPaste}
                    onDrop={onDrop}
                    onKeyDown={onKeyDown}
                    className={cn('max-h-[50vh] overflow-y-auto p-3 outline-none', minHeight, richContent)}
                />
            </div>

            {images && (
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    multiple
                    hidden
                    onChange={(e) => {
                        insertImages([...(e.target.files ?? [])]);
                        e.target.value = '';
                    }}
                />
            )}
        </div>
    );
}
