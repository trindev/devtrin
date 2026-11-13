import { ImageOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * แสดงอีเมล HTML ขาเข้า — HTML ผ่าน App\Support\MailHtml (allowlist) มาแล้ว และยังแสดงใน iframe แบบ sandbox อีกชั้น
 * - sandbox ไม่มี allow-scripts: สคริปต์รันไม่ได้แน่นอน, สไตล์ของอีเมลไม่กระทบหน้าเรา
 * - allow-same-origin ไว้วัดความสูงของเนื้อหา, allow-popups ให้ลิงก์เปิดแท็บใหม่
 * - รูปจากเว็บภายนอกซ่อนไว้ก่อน (กันผู้ส่งรู้ว่าเปิดอ่านแล้ว) กดแสดงได้
 */
export function HtmlMail({ html }: { html: string }) {
    const frame = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(160);
    const [showRemote, setShowRemote] = useState(false);
    const remote = useMemo(() => (html.match(/data-remote-src=/g) ?? []).length, [html]);

    const srcDoc = useMemo(() => {
        const css = getComputedStyle(document.documentElement);
        const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
        const body = showRemote ? html.replace(/data-remote-src=/g, 'src=') : html;

        return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
            html,body{margin:0;padding:0;background:transparent}
            body{font-family:${v('--font-sans', 'system-ui, sans-serif')};font-size:14px;line-height:1.7;color:${v('--foreground', '#1f2430')};word-wrap:break-word;overflow-wrap:anywhere}
            a{color:${v('--primary', '#2340c8')}}
            img{max-width:100%;height:auto}
            img:not([src]){display:none}
            blockquote{margin:8px 0;padding-left:12px;border-left:2px solid ${v('--border', '#d8dce5')};color:${v('--text-2', '#4a5160')}}
            table{border-collapse:collapse;max-width:100%}
            td,th{padding:2px 6px;vertical-align:top}
            pre{white-space:pre-wrap}
            p{margin:0 0 8px}
        </style></head><body>${body}</body></html>`;
    }, [html, showRemote]);

    const measure = useCallback(() => {
        const doc = frame.current?.contentDocument;
        if (!doc?.body) return;
        setHeight(Math.min(Math.max(doc.documentElement.scrollHeight, 60), 4000));
    }, []);

    useEffect(() => {
        const el = frame.current;
        if (!el) return;
        const onLoad = () => {
            measure();
            el.contentDocument?.querySelectorAll('img').forEach((img) => img.addEventListener('load', measure));
        };
        el.addEventListener('load', onLoad);

        return () => el.removeEventListener('load', onLoad);
    }, [measure, srcDoc]);

    return (
        <div className="flex flex-col gap-2">
            {remote > 0 && !showRemote && (
                <button
                    type="button"
                    onClick={() => setShowRemote(true)}
                    className="bg-secondary text-text-2 hover:text-foreground flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
                >
                    <ImageOff className="size-3.5" strokeWidth={1.75} /> ซ่อนรูปจากภายนอก {remote} รูป — กดเพื่อแสดง
                </button>
            )}
            <iframe
                ref={frame}
                title="เนื้อหาอีเมล"
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                srcDoc={srcDoc}
                style={{ height }}
                className="w-full border-0"
            />
        </div>
    );
}
