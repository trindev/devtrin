import { segmentWords } from '@/lib/motion';
import { createElement, type ElementType } from 'react';

interface Props {
    text: string;
    as?: ElementType;
    className?: string;
    /** mask = คำเลื่อนขึ้นจากใต้เส้น (หัวข้อ), plain = แค่ห่อคำไว้ทำ opacity scrub */
    variant?: 'mask' | 'plain';
}

/** ห่อแต่ละคำด้วย span ให้ GSAP จับเป็นชิ้น ๆ (.split-word) — screen reader อ่านข้อความเต็มจาก aria-label */
export default function SplitWords({ text, as = 'span', className, variant = 'mask' }: Props) {
    const words = segmentWords(text);
    return createElement(
        as,
        { className, 'aria-label': text },
        words.map((word, i) =>
            /^\s+$/.test(word) ? (
                ' '
            ) : variant === 'mask' ? (
                <span key={i} className="split-mask" aria-hidden="true">
                    <span className="split-word">{word}</span>
                </span>
            ) : (
                <span key={i} className="split-word" aria-hidden="true">
                    {word}
                </span>
            ),
        ),
    );
}
