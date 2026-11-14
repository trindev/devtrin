import { prepareImage } from '@/lib/image';
import clsx from 'clsx';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from 'react';

/** รูปแนบหนึ่งรูปต่อข้อความ — เลือกไฟล์ หรือวาง (Ctrl/Cmd+V) ในช่องพิมพ์ · ย่อรูปในเบราว์เซอร์ก่อนส่ง */
export function useChatImage() {
    const [image, setImage] = useState<File | null>(null);
    const [preparing, setPreparing] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
    useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

    const pick = async (file: File | null | undefined) => {
        if (!file || !file.type.startsWith('image/')) return;
        setPreparing(true);
        setImage(await prepareImage(file, 1800));
        setPreparing(false);
    };

    const onPaste = (e: ClipboardEvent) => {
        const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
        if (file) {
            e.preventDefault();
            pick(file);
        }
    };

    const clear = () => {
        setImage(null);
        if (input.current) input.current.value = '';
    };

    return { image, preview, preparing, pick, onPaste, clear, input };
}

export function AttachButton({ chat, className }: { chat: ReturnType<typeof useChatImage>; className?: string }) {
    return (
        <label className={clsx('grid shrink-0 cursor-pointer place-items-center rounded-full focus-within:ring-2 focus-within:ring-current', className)} title="แนบรูป" aria-label="แนบรูป">
            <ImagePlus className="h-5 w-5" />
            <input ref={chat.input} type="file" accept="image/*" className="sr-only" onChange={(e) => chat.pick(e.target.files?.[0])} />
        </label>
    );
}

export function AttachPreview({ chat, className }: { chat: ReturnType<typeof useChatImage>; className?: string }) {
    if (!chat.preview && !chat.preparing) return null;
    return (
        <div className={clsx('relative mb-2 inline-block', className)}>
            {chat.preview ? <img src={chat.preview} alt="รูปที่จะส่ง" className="h-20 max-w-40 rounded-xl object-cover" /> : <div className="h-20 w-28 animate-pulse rounded-xl bg-current/10" />}
            <button type="button" onClick={chat.clear} className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white" aria-label="เอารูปออก">
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

/** รูปในฟองข้อความ — กดเพื่อเปิดเต็มในแท็บใหม่ */
export function MessageImage({ src, onLoad }: { src: string; onLoad?: () => void }) {
    return (
        <a href={src} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl">
            <img src={src} alt="รูปที่แนบ" loading="lazy" onLoad={onLoad} className="max-h-64 w-auto max-w-full object-contain" />
        </a>
    );
}
