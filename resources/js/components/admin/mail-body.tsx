import { cn } from '@/lib/utils';
import { ChevronDown, CornerDownRight, Forward, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

/**
 * แยกเนื้อหาอีเมล (ข้อความล้วน) เป็นช่วงแบบโปรแกรมอีเมลทั่วไป:
 * ข้อความใหม่ → ข้อความเดิมที่ถูกตอบกลับ (บรรทัด "> ...") พร้อมหัว "ในวันที่ ... เขียนว่า:" / "On ... wrote:" → ข้อความที่ส่งต่อ
 * ตอบกลับซ้อนหลายทอดแสดงเป็นชั้น พับข้อความเดิมไว้ก่อน
 */

export type Segment =
    | { type: 'text'; text: string }
    | { type: 'quote'; header: QuoteHeader | null; children: Segment[] }
    | { type: 'forward'; fields: { label: string; value: string }[]; children: Segment[] };

export interface QuoteHeader {
    who: string;
    email: string | null;
    when: string | null;
}

// หัวข้อความเดิม: Gmail ไทย/อังกฤษ, Outlook, และแบบที่หน้านี้สร้างเอง ("เมื่อ ... เขียนว่า:")
const HEADER_START = /^\s*(on\b|ในวันที่|เมื่อ|le\b|am\b)/i;
const HEADER_END = /(wrote|เขียนว่า|a écrit|schrieb)\s*:\s*$/i;
const FORWARD_MARK = /^\s*-{2,}\s*(forwarded message|ข้อความที่ส่งต่อ|original message|ข้อความต้นฉบับ)\s*-{2,}\s*$/i;
const FORWARD_FIELD = /^\s*(from|จาก|date|sent|วันที่|subject|เรื่อง|to|ถึง|cc|สำเนา)\s*:\s*(.*)$/i;
const FIELD_LABEL: Record<string, string> = {
    from: 'จาก',
    จาก: 'จาก',
    date: 'วันที่',
    sent: 'วันที่',
    วันที่: 'วันที่',
    subject: 'เรื่อง',
    เรื่อง: 'เรื่อง',
    to: 'ถึง',
    ถึง: 'ถึง',
    cc: 'สำเนา',
    สำเนา: 'สำเนา',
};

const isQuoted = (line: string) => /^\s*>/.test(line);
const unquote = (line: string) => line.replace(/^\s*>\s?/, '');

function parseHeader(text: string): QuoteHeader {
    const clean = text
        .replace(HEADER_END, '')
        .replace(/^\s*(on|ในวันที่|เมื่อ)\s+/i, '')
        .trim();
    const email = clean.match(/<([^>]+)>/)?.[1] ?? null;
    const tokens = clean
        .replace(/<[^>]*>/, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    // วันเวลาอยู่หน้า ชื่ออยู่หลังคำสุดท้ายที่มีตัวเลข (เช่น "21:57") — AM/PM นับเป็นส่วนของเวลา
    let cut = -1;
    tokens.forEach((t, i) => {
        if (/\d/.test(t)) cut = i;
    });
    while (cut >= 0 && /^(am|pm|น\.)$/i.test(tokens[cut + 1] ?? '')) cut++;
    const when =
        cut >= 0
            ? tokens
                  .slice(0, cut + 1)
                  .join(' ')
                  .replace(/,$/, '')
            : null;
    const who = (cut >= 0 ? tokens.slice(cut + 1) : tokens).join(' ').replace(/^["',]+|["',]+$/g, '');

    return { who: who || email || 'ผู้ส่ง', email, when };
}

export function parseMailBody(body: string): Segment[] {
    const lines = body.replace(/\r/g, '').split('\n');
    const out: Segment[] = [];
    let text: string[] = [];
    const flush = () => {
        const t = text.join('\n').replace(/^\n+|\s+$/g, '');
        if (t) out.push({ type: 'text', text: t });
        text = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // ส่งต่อ: ส่วนที่เหลือทั้งหมดเป็นข้อความที่ส่งต่อ
        if (FORWARD_MARK.test(line)) {
            flush();
            const fields: { label: string; value: string }[] = [];
            let j = i + 1;
            while (j < lines.length && (FORWARD_FIELD.test(lines[j]) || (fields.length === 0 && !lines[j].trim()))) {
                const m = lines[j].match(FORWARD_FIELD);
                if (m) fields.push({ label: FIELD_LABEL[m[1].toLowerCase()] ?? m[1], value: m[2].trim() });
                j++;
            }
            out.push({ type: 'forward', fields, children: parseMailBody(lines.slice(j).join('\n')) });

            return out;
        }

        // หัวข้อความเดิม (อาจยาว 1–3 บรรทัด) ตามด้วยบรรทัด "> ..."
        if (HEADER_START.test(line) || HEADER_END.test(line)) {
            let end = -1;
            for (let k = i; k < Math.min(i + 3, lines.length); k++) {
                if (HEADER_END.test(lines[k])) {
                    end = k;
                    break;
                }
            }
            if (end >= 0) {
                let q = end + 1;
                while (q < lines.length && !lines[q].trim()) q++;
                if (q < lines.length && isQuoted(lines[q])) {
                    flush();
                    const quoted: string[] = [];
                    while (q < lines.length && (isQuoted(lines[q]) || !lines[q].trim())) quoted.push(unquote(lines[q++]));
                    out.push({ type: 'quote', header: parseHeader(lines.slice(i, end + 1).join(' ')), children: parseMailBody(quoted.join('\n')) });
                    i = q - 1;
                    continue;
                }
            }
        }

        // บรรทัด "> ..." ที่ไม่มีหัว
        if (isQuoted(line)) {
            flush();
            const quoted: string[] = [];
            let q = i;
            while (q < lines.length && isQuoted(lines[q])) quoted.push(unquote(lines[q++]));
            out.push({ type: 'quote', header: null, children: parseMailBody(quoted.join('\n')) });
            i = q - 1;
            continue;
        }

        text.push(line);
    }
    flush();

    return out;
}

/** ประเภทของอีเมล ใช้ทำป้ายในช่องอ่านและไอคอนในรายการ */
export function mailKind(subject: string, segments?: Segment[]): 'reply' | 'forward' | null {
    if (/^\s*(fwd?|fw)\s*:/i.test(subject) || segments?.some((s) => s.type === 'forward')) return 'forward';
    if (/^\s*(re|ตอบกลับ)\s*:/i.test(subject) || segments?.some((s) => s.type === 'quote')) return 'reply';

    return null;
}

export function MailBody({ body }: { body: string }) {
    const segments = parseMailBody(body);
    if (segments.length === 0) return <p className="text-muted-foreground text-sm">(ไม่มีเนื้อหา)</p>;

    return <Segments segments={segments} depth={0} />;
}

function Segments({ segments, depth }: { segments: Segment[]; depth: number }) {
    return (
        <div className="flex flex-col gap-3">
            {segments.map((s, i) =>
                s.type === 'text' ? (
                    <pre key={i} className="font-sans text-sm leading-6 break-words whitespace-pre-wrap">
                        {s.text}
                    </pre>
                ) : s.type === 'quote' ? (
                    <QuoteBlock key={i} header={s.header} depth={depth} segments={s.children} />
                ) : (
                    <ForwardBlock key={i} fields={s.fields} depth={depth} segments={s.children} />
                ),
            )}
        </div>
    );
}

function QuoteBlock({ header, segments, depth }: { header: QuoteHeader | null; segments: Segment[]; depth: number }) {
    const [open, setOpen] = useState(false);
    const empty = segments.length === 0;
    if (empty) return null;

    return (
        <div className={cn('rounded-xl border', open ? 'border-border' : 'border-border border-dashed')}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="hover:bg-secondary/60 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs"
            >
                {open ? (
                    <CornerDownRight className="text-muted-foreground size-3.5 shrink-0" strokeWidth={1.75} />
                ) : (
                    <MoreHorizontal className="text-muted-foreground size-3.5 shrink-0" strokeWidth={1.75} />
                )}
                <span className="text-text-2 min-w-0 flex-1 truncate">
                    {header ? (
                        <>
                            ข้อความก่อนหน้าจาก <span className="text-foreground font-medium">{header.who}</span>
                            {header.email && header.email !== header.who && <span className="text-muted-foreground"> &lt;{header.email}&gt;</span>}
                            {header.when && <span className="text-muted-foreground"> · {header.when}</span>}
                        </>
                    ) : (
                        'ข้อความที่ยกมา'
                    )}
                </span>
                <ChevronDown
                    className={cn('text-muted-foreground size-3.5 shrink-0 transition-transform', open && 'rotate-180')}
                    strokeWidth={1.75}
                />
            </button>
            {open && (
                <div className={cn('text-text-2 mr-3 ml-4 border-l-2 pb-3 pl-3', depth % 2 === 0 ? 'border-primary/40' : 'border-success/40')}>
                    <Segments segments={segments} depth={depth + 1} />
                </div>
            )}
        </div>
    );
}

function ForwardBlock({ fields, segments, depth }: { fields: { label: string; value: string }[]; segments: Segment[]; depth: number }) {
    return (
        <div className="border-border bg-secondary/40 rounded-xl border p-3">
            <p className="text-text-2 mb-2 flex items-center gap-1.5 text-xs font-medium">
                <Forward className="size-3.5" strokeWidth={1.75} /> ข้อความที่ส่งต่อ
            </p>
            {fields.length > 0 && (
                <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    {fields.map((f, i) => (
                        <div key={i} className="contents">
                            <dt className="text-muted-foreground">{f.label}</dt>
                            <dd className="min-w-0 break-words">{f.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
            <Segments segments={segments} depth={depth + 1} />
        </div>
    );
}
