<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;

/**
 * เนื้อหาอีเมลแบบจัดรูปแบบจากหน้าเขียนอีเมล admin
 * - sanitize(): เก็บเฉพาะแท็ก/แอตทริบิวต์ที่ปลอดภัย (allowlist) — ลบ script/style/iframe ทั้งก้อน แท็กอื่นที่ไม่รู้จักเก็บแต่ข้อความข้างใน
 * - toText(): ฉบับข้อความล้วน (multipart/alternative) — ข้อความที่ยกมาเป็นบรรทัด "> " ให้หน้าอ่านอีเมลแยกช่วงได้เหมือนเดิม
 * - document(): ห่อเป็นเอกสาร HTML พร้อมสไตล์พื้นฐานสำหรับโปรแกรมอีเมล
 */
class MailHtml
{
    /** แท็ก => แอตทริบิวต์ที่อนุญาต */
    private const ALLOWED = [
        'p' => [], 'div' => [], 'br' => [], 'span' => [], 'hr' => [],
        'b' => [], 'strong' => [], 'i' => [], 'em' => [], 'u' => [], 's' => [], 'strike' => [],
        'h1' => [], 'h2' => [], 'h3' => [], 'h4' => [], 'blockquote' => [], 'ul' => [], 'ol' => [], 'li' => [],
        'pre' => [], 'code' => [], 'small' => [], 'sub' => [], 'sup' => [],
        // ตารางในอีเมลขาเข้า (หลายฉบับจัดหน้าด้วยตาราง)
        'table' => [], 'thead' => [], 'tbody' => [], 'tr' => [], 'td' => ['colspan', 'rowspan'], 'th' => ['colspan', 'rowspan'],
        'a' => ['href'], 'img' => ['src', 'alt', 'width', 'data-remote-src'],
    ];

    /**
     * ตัวเลือกของการกรองครั้งนั้น:
     * remote = 'allow' (รูป https แสดงเลย) | 'defer' (ย้ายไป data-remote-src รอผู้ใช้กดแสดง — กันอีเมลขาเข้าแอบติดตาม)
     * cid = content-id ของไฟล์แนบ => URL ของหน้าเรา (รูปที่ฝังมากับอีเมลขาเข้า)
     *
     * @var array{remote: string, cid: array<string, string>}
     */
    private static array $options = ['remote' => 'allow', 'cid' => []];

    /** ลบทั้งแท็กและเนื้อหาข้างใน */
    private const DROP = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'svg', 'math', 'template', 'noscript', 'head', 'title', 'meta', 'link', 'base'];

    private const BLOCK = ['p', 'div', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'hr'];

    /** @param  array{remote?: string, cid?: array<string, string>}  $options */
    public static function sanitize(string $html, array $options = []): string
    {
        self::$options = ['remote' => $options['remote'] ?? 'allow', 'cid' => $options['cid'] ?? []];
        // อีเมลขาเข้าเป็นเอกสาร HTML ทั้งฉบับ — เอาเฉพาะเนื้อใน body
        if (preg_match('#<body[^>]*>(.*)</body>#si', $html, $m)) {
            $html = $m[1];
        }
        $root = self::load($html);
        self::clean($root);
        self::$options = ['remote' => 'allow', 'cid' => []];

        return trim(self::inner($root));
    }

    /** มีข้อความหรือรูปจริงไหม (กันส่งอีเมลเปล่าที่มีแค่ <p><br></p>) */
    public static function isBlank(string $html): bool
    {
        return trim(html_entity_decode(strip_tags($html, '<img>'), ENT_QUOTES | ENT_HTML5, 'UTF-8'), " \t\n\r\0\x0B\u{00A0}") === '';
    }

    public static function toText(string $html): string
    {
        $text = self::text(self::load($html));
        $text = preg_replace("/[ \t]+\n/", "\n", $text);

        return trim(preg_replace("/\n{3,}/", "\n\n", (string) $text));
    }

    public static function document(string $body): string
    {
        return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>'
            .'<body style="margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Tahoma,sans-serif;font-size:15px;line-height:1.6;color:#1f2430">'
            .'<style>blockquote{margin:8px 0;padding-left:12px;border-left:3px solid #c9cfdb;color:#4a5160}img{max-width:100%;height:auto}a{color:#2340c8}</style>'
            .$body.'</body></html>';
    }

    private static function load(string $html): DOMElement
    {
        $doc = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="utf-8"?><div id="lq-root">'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        foreach ($doc->getElementsByTagName('div') as $div) {
            if ($div->getAttribute('id') === 'lq-root') {
                return $div;
            }
        }

        return $doc->createElement('div');
    }

    private static function clean(DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMText) {
                continue;
            }
            if (! $child instanceof DOMElement) {
                $node->removeChild($child); // comment, CDATA, processing instruction

                continue;
            }
            $tag = strtolower($child->tagName);
            if (in_array($tag, self::DROP, true)) {
                $node->removeChild($child);

                continue;
            }
            self::clean($child);
            if (! array_key_exists($tag, self::ALLOWED)) {
                while ($child->firstChild) {
                    $node->insertBefore($child->firstChild, $child);
                }
                $node->removeChild($child);

                continue;
            }
            if ($tag === 'img') {
                self::rewriteImage($child);
            }
            foreach (iterator_to_array($child->attributes) as $attr) {
                $name = strtolower($attr->name);
                if (! in_array($name, self::ALLOWED[$tag], true) || ! self::safeValue($tag, $name, $attr->value)) {
                    $child->removeAttribute($attr->name);
                }
            }
            if ($tag === 'a' && $child->hasAttribute('href')) {
                $child->setAttribute('target', '_blank');
                $child->setAttribute('rel', 'noopener');
            }
            if ($tag === 'img' && ! $child->hasAttribute('src') && ! $child->hasAttribute('data-remote-src')) {
                $node->removeChild($child);
            }
        }
    }

    /** รูปในอีเมลขาเข้า: cid → ไฟล์แนบบนหน้าเรา, รูปจากเว็บ → รอผู้ใช้กดแสดง (ถ้าตั้ง remote = defer) */
    private static function rewriteImage(DOMElement $img): void
    {
        $src = trim($img->getAttribute('src'));
        $img->removeAttribute('data-remote-src');
        if (preg_match('#^cid:(.+)$#i', $src, $m)) {
            $url = self::$options['cid'][trim($m[1], '<> ')] ?? null;
            if ($url !== null) {
                $img->setAttribute('src', $url);
            }

            return;
        }
        if (self::$options['remote'] === 'defer' && preg_match('#^https://#i', $src)) {
            $img->removeAttribute('src');
            $img->setAttribute('data-remote-src', $src);
        }
    }

    private static function safeValue(string $tag, string $attr, string $value): bool
    {
        $value = trim($value);

        return match ([$tag, $attr]) {
            ['a', 'href'] => (bool) preg_match('#^(https?://|mailto:)#i', $value),
            // รูปในเนื้อหาแนบมากับอีเมล (cid:inline-N) รูปจากเว็บ https (เช่นโลโก้ในลายเซ็น) หรือไฟล์แนบที่แปลงจาก cid แล้ว
            ['img', 'src'] => (bool) preg_match('#^(cid:inline-\d+|https://|/admin/mail/attachment\?)#i', $value),
            ['img', 'data-remote-src'] => (bool) preg_match('#^https://#i', $value),
            ['img', 'width'] => (bool) preg_match('/^\d{1,4}$/', $value),
            ['td', 'colspan'], ['td', 'rowspan'], ['th', 'colspan'], ['th', 'rowspan'] => (bool) preg_match('/^\d{1,2}$/', $value),
            default => mb_strlen($value) <= 300,
        };
    }

    private static function text(DOMNode $node): string
    {
        $out = '';
        foreach ($node->childNodes as $child) {
            if ($child instanceof DOMText) {
                $out .= preg_replace('/\s+/u', ' ', $child->textContent);

                continue;
            }
            if (! $child instanceof DOMElement) {
                continue;
            }
            $tag = strtolower($child->tagName);
            $inner = self::text($child);
            $out .= match (true) {
                $tag === 'br' => "\n",
                $tag === 'hr' => "\n----------\n",
                $tag === 'img' => '[รูป'.($child->getAttribute('alt') ? ': '.$child->getAttribute('alt') : '').']',
                $tag === 'a' => ($href = $child->getAttribute('href')) && trim($inner) !== $href && ! str_starts_with($href, 'mailto:') ? "{$inner} ({$href})" : $inner,
                $tag === 'li' => "\n".($child->parentNode instanceof DOMElement && strtolower($child->parentNode->tagName) === 'ol'
                    ? (self::position($child)).'. '
                    : '- ').trim($inner),
                $tag === 'blockquote' => "\n".implode("\n", array_map(fn ($l) => rtrim('> '.$l), explode("\n", trim($inner))))."\n",
                in_array($tag, self::BLOCK, true) => "\n".$inner."\n",
                default => $inner,
            };
        }

        return $out;
    }

    private static function position(DOMElement $li): int
    {
        $n = 1;
        for ($s = $li->previousSibling; $s; $s = $s->previousSibling) {
            if ($s instanceof DOMElement && strtolower($s->tagName) === 'li') {
                $n++;
            }
        }

        return $n;
    }

    private static function inner(DOMElement $el): string
    {
        $html = '';
        foreach ($el->childNodes as $child) {
            $html .= $el->ownerDocument->saveHTML($child);
        }

        return $html;
    }
}
