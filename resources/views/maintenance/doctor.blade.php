@php
    /*
     * ศูนย์ดูแลระบบ (/_maintenance) — Blade + CSS ในไฟล์เดียว ไม่พึ่ง Vite/JS bundle
     * เพื่อให้เปิดได้แม้ frontend build หรือ vendor บางส่วนเสีย
     */
    use Illuminate\Support\Carbon;

    $tone = ['ok' => 'ok', 'warn' => 'warn', 'fail' => 'fail'];
    $word = ['ok' => 'ปกติ', 'warn' => 'ควรดู', 'fail' => 'ผิดปกติ'];
    $rank = ['fail' => 0, 'warn' => 1, 'ok' => 2];

    $all = $checks->flatten(1);
    $count = ['ok' => $all->where('status', 'ok')->count(), 'warn' => $all->where('status', 'warn')->count(), 'fail' => $all->where('status', 'fail')->count()];
    $headline = match ($status) {
        'fail' => "ผิดปกติ {$count['fail']} รายการ",
        'warn' => "มี {$count['warn']} รายการที่ควรดู",
        default => 'ระบบทำงานปกติ',
    };

    $flash = session('status');
    $flashBad = $flash && preg_match('/ไม่สำเร็จ|ล้มเหลว|ไม่ได้|ผิดพลาด/u', $flash);
    $th = fn ($at, $fmt = 'd/m/Y H:i') => Carbon::parse($at)->timezone('Asia/Bangkok')->format($fmt);
    $newer = fn ($r) => version_compare($r['version'], $app['version'], '>');
    $actionGroups = ['deploy' => 'หลังติดตั้งหรือแก้ไฟล์', 'fix' => 'แก้ปัญหา'];
@endphp
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>ศูนย์ดูแลระบบ - Devtrin</title>
    <link rel="icon" href="/favicon.ico?v=2" sizes="any">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png?v=2">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #f5f6f8; --card: #ffffff; --text: #15171c; --text-2: #4a505e; --muted: #6a7080;
            --border: rgb(21 23 28 / 0.08); --input: rgb(21 23 28 / 0.14); --soft: #eceef2;
            --primary: #2546c8; --primary-fg: #ffffff; --primary-soft: #e8edfc;
            --ok: #16893f; --ok-soft: #e6f4ea; --warn: #b45309; --warn-soft: #fdf3e2; --fail: #d42f2f; --fail-soft: #fbeaea;
            --nav: rgb(245 246 248 / 0.82); --shadow: 0 1px 2px rgb(21 23 28 / 0.04);
            --ease: cubic-bezier(0.22, 1, 0.36, 1);
            color-scheme: light;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #0e0f12; --card: #16171b; --text: #eceef2; --text-2: #a8adb8; --muted: #8b909c;
                --border: rgb(255 255 255 / 0.07); --input: rgb(255 255 255 / 0.12); --soft: #212329;
                --primary: #7f98ff; --primary-fg: #0e0f12; --primary-soft: rgb(127 152 255 / 0.12);
                --ok: #4cc38a; --ok-soft: rgb(76 195 138 / 0.12); --warn: #f0a44b; --warn-soft: rgb(240 164 75 / 0.12); --fail: #e5484d; --fail-soft: rgb(229 72 77 / 0.12);
                --nav: rgb(14 15 18 / 0.82); --shadow: none;
                color-scheme: dark;
            }
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; scroll-padding-top: 72px; }
        body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.6 'IBM Plex Sans Thai Looped', 'IBM Plex Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        a { color: inherit; }
        code, .mono { font-family: 'IBM Plex Mono', ui-monospace, Menlo, monospace; font-size: 12px; }
        code { padding: 1px 6px; border-radius: 6px; background: var(--soft); word-break: break-all; }
        .wrap { max-width: 880px; margin: 0 auto; padding: 0 16px; }
        .muted { color: var(--muted); }
        .text-2 { color: var(--text-2); }
        .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

        /* หัวหน้า */
        .top { display: flex; align-items: center; gap: 12px; padding: 20px 0 16px; }
        .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .brand img { width: 32px; height: 32px; border-radius: 9px; }
        .brand b { font-weight: 600; font-size: 15px; }
        .brand span { color: var(--muted); font-size: 13px; }
        .top .grow { flex: 1; }

        /* ปุ่ม */
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--input); background: var(--card); color: var(--text); font: inherit; font-weight: 500; font-size: 13px; text-decoration: none; cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s, opacity .15s; }
        .btn:hover { background: var(--soft); }
        .btn:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible, .nav a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
        .btn.primary { background: var(--primary); border-color: var(--primary); color: var(--primary-fg); }
        .btn.primary:hover { opacity: .9; }
        .btn.danger { color: var(--fail); border-color: color-mix(in oklab, var(--fail) 40%, transparent); }
        .btn.danger:hover { background: var(--fail-soft); }
        .btn.ghost { border-color: transparent; background: transparent; color: var(--text-2); }
        .btn.ghost:hover { background: var(--soft); color: var(--text); }
        .btn.sm { height: 30px; padding: 0 10px; font-size: 12px; border-radius: 8px; }
        .btn[disabled] { opacity: .6; cursor: progress; }
        .btn svg { width: 16px; height: 16px; flex: none; }

        /* การ์ดสถานะรวม */
        .hero { display: flex; flex-wrap: wrap; align-items: center; gap: 16px 24px; padding: 20px; border-radius: 16px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--shadow); }
        .hero .state { display: flex; align-items: center; gap: 14px; flex: 1 1 320px; min-width: 0; }
        .ring { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; flex: none; }
        .ring svg { width: 22px; height: 22px; }
        .ring.ok { background: var(--ok-soft); color: var(--ok); }
        .ring.warn { background: var(--warn-soft); color: var(--warn); }
        .ring.fail { background: var(--fail-soft); color: var(--fail); }
        .hero h1 { margin: 0; font-size: 20px; line-height: 28px; font-weight: 600; }
        .hero p { margin: 2px 0 0; font-size: 13px; color: var(--muted); }
        .hero .acts { display: flex; gap: 8px; flex-wrap: wrap; }
        .tally { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }

        /* ป้ายสถานะ */
        .chip { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; background: var(--soft); color: var(--text-2); }
        .chip.ok { background: var(--ok-soft); color: var(--ok); }
        .chip.warn { background: var(--warn-soft); color: var(--warn); }
        .chip.fail { background: var(--fail-soft); color: var(--fail); }
        .chip.primary { background: var(--primary-soft); color: var(--primary); }
        .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--muted); }
        .dot.ok { background: var(--ok); } .dot.warn { background: var(--warn); } .dot.fail { background: var(--fail); }

        /* แถบแจ้ง */
        .note { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; font-size: 13px; line-height: 20px; margin-top: 12px; word-break: break-word; }
        .note svg { width: 18px; height: 18px; flex: none; margin-top: 1px; }
        .note.ok { background: var(--ok-soft); color: var(--ok); }
        .note.warn { background: var(--warn-soft); color: var(--warn); }
        .note.fail { background: var(--fail-soft); color: var(--fail); }
        .note.info { background: var(--primary-soft); color: var(--primary); }
        .note .body { flex: 1; min-width: 0; }
        .note .body .text-2 { color: inherit; opacity: .85; }
        .note .notes summary, .note .notes pre { color: inherit; opacity: .85; }
        .note .x { margin: -4px -6px -4px 0; color: inherit; }

        /* เมนูเลื่อนไปแต่ละส่วน */
        .nav { position: sticky; top: 0; z-index: 10; margin: 20px 0 8px; padding: 8px 0; background: var(--nav); backdrop-filter: saturate(1.4) blur(12px); -webkit-backdrop-filter: saturate(1.4) blur(12px); }
        .nav .in { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; padding: 4px; border-radius: 12px; background: var(--soft); width: max-content; max-width: 100%; }
        .nav a { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500; color: var(--text-2); white-space: nowrap; }
        .nav a:hover { color: var(--text); background: var(--card); }

        /* ส่วนเนื้อหา */
        section { margin-top: 28px; }
        .sec-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .sec-head h2 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
        .sec-head p { margin: 2px 0 0; font-size: 13px; color: var(--muted); }
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow); }
        .card + .card { margin-top: 8px; }
        .pad { padding: 16px; }
        .rows > * + * { border-top: 1px solid var(--border); }

        /* กลุ่มผลตรวจ */
        details.group > summary { list-style: none; display: flex; align-items: center; gap: 10px; padding: 14px 16px; cursor: pointer; border-radius: 14px; }
        details.group > summary::-webkit-details-marker { display: none; }
        details.group > summary:hover { background: color-mix(in oklab, var(--soft) 50%, transparent); }
        details.group > summary b { font-weight: 600; }
        details.group > summary .grow { flex: 1; }
        .chev { width: 16px; height: 16px; color: var(--muted); transition: transform .2s var(--ease); }
        details[open] > summary .chev { transform: rotate(90deg); }
        details.group[open] > summary { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
        .check { display: grid; grid-template-columns: 8px minmax(120px, 200px) 1fr; gap: 4px 12px; align-items: baseline; padding: 10px 16px; border-top: 1px solid var(--border); }
        .check .dot { align-self: center; }
        .check .name { font-weight: 500; }
        .check .detail { color: var(--text-2); font-size: 13px; word-break: break-word; }
        .check.warn .detail { color: var(--warn); } .check.fail .detail { color: var(--fail); }

        /* เวอร์ชัน */
        .ver { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
        .ver .big { font-size: 22px; line-height: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .ver .grow { flex: 1; }
        .update { margin-top: 14px; padding: 14px; border-radius: 12px; background: var(--primary-soft); display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
        .update .grow { flex: 1 1 260px; min-width: 0; }
        .update b { color: var(--primary); }
        .notes { margin-top: 6px; font-size: 13px; }
        .notes summary { cursor: pointer; color: var(--text-2); }
        .notes pre { white-space: pre-wrap; font: inherit; margin: 8px 0 0; color: var(--text-2); max-height: 260px; overflow: auto; }
        .rel { display: flex; align-items: center; gap: 12px; padding: 10px 16px; }
        .rel .tag { font-weight: 600; min-width: 72px; font-variant-numeric: tabular-nums; }
        .rel .grow { flex: 1; min-width: 0; font-size: 13px; color: var(--muted); }
        details.more > summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 12px 16px; font-size: 13px; font-weight: 500; color: var(--text-2); }
        details.more > summary::-webkit-details-marker { display: none; }

        /* แถวตั้งค่า (สวิตช์) */
        .setting { display: flex; align-items: center; gap: 16px; padding: 14px 16px; }
        .setting .grow { flex: 1; min-width: 0; }
        .setting .t { font-weight: 500; }
        .setting .d { font-size: 13px; color: var(--muted); }
        .switch { position: relative; width: 40px; height: 24px; border-radius: 999px; border: 0; padding: 0; background: var(--input); cursor: pointer; flex: none; transition: background .2s var(--ease); }
        .switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / .2); transition: transform .2s var(--ease); }
        .switch[aria-checked="true"] { background: var(--primary); }
        .switch[aria-checked="true"]::after { transform: translateX(16px); }
        .switch:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

        /* ฟอร์ม */
        .form { display: grid; grid-template-columns: 1fr 180px; gap: 10px; }
        .field label { display: block; font-size: 12px; font-weight: 500; color: var(--text-2); margin-bottom: 4px; }
        input, select { width: 100%; height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--input); background: var(--bg); color: var(--text); font: inherit; }
        .form-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; flex-wrap: wrap; }

        /* คำสั่ง */
        .cmd-group { font-size: 12px; font-weight: 500; color: var(--muted); margin: 0 0 8px; }
        .cmd-group:not(:first-child) { margin-top: 16px; }
        .cmd { display: flex; align-items: center; gap: 16px; padding: 12px 16px; }
        .cmd .grow { flex: 1; min-width: 0; }
        .cmd .t { font-weight: 500; }
        .cmd .d { font-size: 13px; color: var(--muted); }
        .foot { margin: 32px 0 40px; font-size: 12px; color: var(--muted); text-align: center; }

        @media (max-width: 640px) {
            .hero { padding: 16px; }
            .hero .acts { width: 100%; }
            .hero .acts .btn { flex: 1; }
            .check { grid-template-columns: 8px 1fr; }
            .check .detail { grid-column: 2; }
            .form { grid-template-columns: 1fr; }
            .rel { flex-wrap: wrap; }
            .rel .grow { flex-basis: 100%; order: 3; }
            .cmd, .setting { align-items: flex-start; }
            .top .brand span { display: none; }
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } html { scroll-behavior: auto; } }
        /* กล่องยืนยันแบบ SweetAlert — แทน window.confirm */
        .swal-back { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgb(8 10 16 / 0.55); backdrop-filter: blur(3px); animation: swal-fade .2s ease both; }
        .swal { width: 100%; max-width: 400px; background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 28px 24px 20px; text-align: center; box-shadow: 0 24px 60px rgb(0 0 0 / 0.28); animation: swal-pop .32s var(--ease) both; }
        .swal-icon { width: 64px; height: 64px; margin: 0 auto 14px; border-radius: 50%; display: grid; place-items: center; border: 3px solid currentColor; animation: swal-icon .5s var(--ease) .08s both; }
        .swal-icon svg { width: 30px; height: 30px; }
        .swal-icon.q { color: var(--primary); background: var(--primary-soft); }
        .swal-icon.w { color: var(--warn); background: var(--warn-soft); }
        .swal h3 { margin: 0; font-size: 18px; font-weight: 600; }
        .swal p { margin: 8px 0 0; color: var(--text-2); font-size: 14px; line-height: 1.65; }
        .swal-actions { display: flex; gap: 8px; margin-top: 22px; }
        .swal-actions .btn { flex: 1; height: 42px; font-size: 14px; }
        .swal-actions .btn.warn { background: var(--warn); border-color: var(--warn); color: #fff; }
        .swal-back.out { animation: swal-fade .15s ease reverse both; }
        .swal-back.out .swal { animation: swal-pop .15s ease reverse both; }
        @keyframes swal-fade { from { opacity: 0; } }
        @keyframes swal-pop { from { opacity: 0; transform: scale(.92) translateY(8px); } }
        @keyframes swal-icon { from { opacity: 0; transform: scale(.4) rotate(-20deg); } }
        @media (prefers-reduced-motion: reduce) { .swal-back, .swal, .swal-icon { animation: none !important; } }
    </style>
</head>
<body>
@php
    $icon = [
        'ok' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
        'warn' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
        'fail' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
        'info' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
        'chev' => '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
        'x' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
        'refresh' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
        'arrow' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
        'copy' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    ];
@endphp
<div class="wrap">
    <header class="top">
        <a class="brand" href="/_maintenance">
            <img src="/favicon.svg" alt="">
            <b>Devtrin</b>
            <span>ศูนย์ดูแลระบบ</span>
        </a>
        <span class="grow"></span>
        @if ($isAdmin)
            <a class="btn ghost" href="/admin">หน้า admin {!! $icon['arrow'] !!}</a>
        @endif
    </header>

    {{-- สถานะรวม --}}
    <div class="hero">
        <div class="state">
            <span class="ring {{ $tone[$status] }}">{!! $icon[$status] !!}</span>
            <div style="min-width: 0">
                <h1>{{ $headline }}</h1>
                <p>ตรวจ {{ $all->count() }} รายการ{{ $deep ? ' แบบละเอียด' : '' }} · {{ now()->timezone('Asia/Bangkok')->format('H:i') }} น. · v{{ $app['version'] }} <span class="mono">{{ $app['revision'] }}</span></p>
                <div class="tally">
                    <span class="chip ok"><span class="dot ok"></span>ปกติ {{ $count['ok'] }}</span>
                    @if ($count['warn'])<span class="chip warn"><span class="dot warn"></span>ควรดู {{ $count['warn'] }}</span>@endif
                    @if ($count['fail'])<span class="chip fail"><span class="dot fail"></span>ผิดปกติ {{ $count['fail'] }}</span>@endif
                </div>
            </div>
        </div>
        <div class="acts">
            <a class="btn" href="/_maintenance{{ $deep ? '' : '?deep=1' }}" title="{{ $deep ? 'ข้ามการตรวจไฟล์ทั้งหมด' : 'ตรวจไฟล์ทุกไฟล์กับ release และทดสอบ AI จริง' }}">{!! $icon['refresh'] !!}{{ $deep ? 'ตรวจแบบเร็ว' : 'ตรวจละเอียด' }}</a>
            <a class="btn ghost" href="/_maintenance?format=json{{ $deep ? '&deep=1' : '' }}" title="สำหรับ uptime monitor — ตอบ 503 เมื่อมีรายการผิดปกติ">JSON</a>
        </div>
    </div>

    @if ($flash)
        <div class="note {{ $flashBad ? 'fail' : 'ok' }}" role="status">
            {!! $flashBad ? $icon['fail'] : $icon['ok'] !!}
            <div class="body">
                {{ $flash }}
                @if (session('status_detail'))
                    <details class="notes"><summary>ดูผลลัพธ์</summary><pre class="mono">{{ session('status_detail') }}</pre></details>
                @endif
            </div>
            <button class="btn ghost sm x" type="button" onclick="this.parentElement.remove()" aria-label="ปิดข้อความ">{!! $icon['x'] !!}</button>
        </div>
    @endif

    @if ($down)
        <div class="note warn">
            {!! $icon['warn'] !!}
            <div class="body">
                <strong>Maintenance mode เปิดอยู่</strong> — ผู้เข้าชมเห็นหน้า "ปิดปรับปรุงชั่วคราว"
                @if (! empty($down['secret']))
                    <div class="text-2" style="margin-top: 4px">admin คนอื่นเข้าเว็บได้ทางลิงก์ <code id="bypass">{{ url($down['secret']) }}</code>
                        <button class="btn ghost sm" type="button" data-copy="#bypass" style="height: 24px; vertical-align: middle">{!! $icon['copy'] !!}คัดลอก</button>
                    </div>
                @endif
            </div>
            <a class="btn sm" href="#mode">จัดการ</a>
        </div>
    @endif

    <nav class="nav" aria-label="ส่วนของหน้านี้">
        <div class="in">
            <a href="#health"><span class="dot {{ $tone[$status] }}"></span>สุขภาพระบบ</a>
            @if ($isAdmin)
                <a href="#version">เวอร์ชัน @if ($update['configured'] ?? false) @if ($update['available'])<span class="chip primary" style="height: 18px">ใหม่</span>@endif @endif</a>
                <a href="#mode">ปิดปรับปรุง</a>
                <a href="#commands">คำสั่ง</a>
            @endif
        </div>
    </nav>

    {{-- สุขภาพระบบ --}}
    <section id="health">
        <div class="sec-head">
            <div>
                <h2>สุขภาพระบบ</h2>
                <p>กลุ่มที่มีรายการควรดูจะเปิดไว้ให้ก่อน</p>
            </div>
        </div>
        @foreach ($checks as $group => $items)
            @php
                $sorted = $items->sortBy(fn ($c) => $rank[$c['status']])->values();
                $gw = $items->where('status', 'warn')->count();
                $gf = $items->where('status', 'fail')->count();
            @endphp
            <details class="card group" @if ($gw || $gf) open @endif>
                <summary>
                    <span class="dot {{ $gf ? 'fail' : ($gw ? 'warn' : 'ok') }}"></span>
                    <b>{{ $group }}</b>
                    <span class="grow"></span>
                    @if ($gf)<span class="chip fail">ผิดปกติ {{ $gf }}</span>@endif
                    @if ($gw)<span class="chip warn">ควรดู {{ $gw }}</span>@endif
                    @if (! $gf && ! $gw)<span class="muted" style="font-size: 13px">ปกติทั้งหมด {{ $items->count() }} รายการ</span>@endif
                    {!! $icon['chev'] !!}
                </summary>
                @foreach ($sorted as $check)
                    <div class="check {{ $tone[$check['status']] }}">
                        <span class="dot {{ $tone[$check['status']] }}" title="{{ $word[$check['status']] }}"></span>
                        <span class="name">{{ $check['name'] }} <span class="sr">({{ $word[$check['status']] }})</span></span>
                        <span class="detail">{{ $check['detail'] }}</span>
                    </div>
                @endforeach
            </details>
        @endforeach
    </section>

    @if ($isAdmin)
        {{-- เวอร์ชัน --}}
        <section id="version">
            <div class="sec-head">
                <div>
                    <h2>เวอร์ชันแอป</h2>
                    <p>อัปเดตจาก GitHub Release — ระบบปิดเว็บ ติดตั้ง migrate แล้วเปิดเว็บให้เอง</p>
                </div>
                @if ($update['configured'])
                    <a class="btn ghost sm" href="/_maintenance?refresh=1#version">{!! $icon['refresh'] !!}ตรวจอีกครั้ง</a>
                @endif
            </div>

            <div class="card pad">
                <div class="ver">
                    <div>
                        <div class="muted" style="font-size: 12px">ติดตั้งอยู่</div>
                        <div class="big">v{{ $app['version'] }}</div>
                    </div>
                    <span class="grow"></span>
                    @if (! $update['configured'])
                        <span class="chip">ยังไม่ได้ตั้งค่าการอัปเดต</span>
                    @elseif ($update['available'])
                        <span class="chip primary">มีเวอร์ชันใหม่</span>
                    @elseif (! $update['error'])
                        <span class="chip ok"><span class="dot ok"></span>เป็นเวอร์ชันล่าสุด</span>
                    @endif
                </div>

                @if (! $update['configured'])
                    <div class="note info">{!! $icon['info'] !!}<div class="body">ตั้ง <code>GITHUB_TOKEN</code> ใน .env แล้วจะอัปเดตจากหน้านี้ได้ (ดู DEPLOY.md)</div></div>
                @else
                    @if ($update['error'])
                        <div class="note fail">{!! $icon['fail'] !!}<div class="body">{{ $update['error'] }}</div></div>
                    @endif
                    @if ($update['writable_problems'])
                        <div class="note warn">{!! $icon['warn'] !!}<div class="body">PHP เขียนไฟล์เหล่านี้ไม่ได้ จึงอัปเดตจากหน้านี้ไม่ได้: {{ implode(', ', $update['writable_problems']) }}</div></div>
                    @endif

                    @if ($update['available'] && $update['latest'])
                        @php $latest = collect($update['releases'])->firstWhere('tag', $update['latest']['tag']) ?? $update['latest']; @endphp
                        <div class="update">
                            <div class="grow">
                                <div>เวอร์ชันใหม่ <b>{{ $latest['tag'] }}</b></div>
                                <div class="muted" style="font-size: 13px">
                                    @isset($latest['published_at']) {{ $th($latest['published_at']) }} @endisset
                                    @isset($latest['size']) · {{ number_format($latest['size'] / 1048576, 1) }} MB @endisset
                                    · ควร backup ฐานข้อมูลก่อน เว็บจะปิดราว 1 นาที
                                </div>
                                @if (! empty($latest['notes']))
                                    <details class="notes"><summary>มีอะไรใหม่</summary><pre>{{ $latest['notes'] }}</pre></details>
                                @endif
                            </div>
                            @unless ($update['writable_problems'])
                                <form method="POST" action="/_maintenance/update" data-busy="กำลังติดตั้ง… อย่าปิดหน้านี้" data-confirm="ติดตั้ง {{ $latest['tag'] }}? เว็บจะปิดชั่วคราวระหว่างอัปเดต (ควร backup ฐานข้อมูลก่อน)">
                                    @csrf
                                    <input type="hidden" name="tag" value="{{ $latest['tag'] }}">
                                    <button class="btn primary">อัปเดตเป็น {{ $latest['tag'] }}</button>
                                </form>
                            @endunless
                        </div>
                    @endif
                @endif
            </div>

            @if ($update['configured'] && count($update['releases']))
                <details class="card more">
                    <summary>{!! $icon['chev'] !!}ทุกเวอร์ชัน (ติดตั้งซ้ำหรือย้อนกลับ) <span class="muted" style="font-weight: 400">{{ count($update['releases']) }} รายการ</span></summary>
                    <div class="rows" style="border-top: 1px solid var(--border)">
                        @foreach ($update['releases'] as $release)
                            <div class="rel">
                                <span class="tag">{{ $release['tag'] }}</span>
                                @if ($release['prerelease'])<span class="chip warn">pre</span>@endif
                                <span class="grow">
                                    {{ $th($release['published_at']) }} · {{ number_format($release['size'] / 1048576, 1) }} MB
                                    @if ($release['notes'])
                                        <details class="notes"><summary>รายละเอียด</summary><pre>{{ $release['notes'] }}</pre></details>
                                    @endif
                                </span>
                                @if ($release['version'] === $app['version'])
                                    <span class="chip ok">ติดตั้งอยู่</span>
                                @elseif (! $update['writable_problems'])
                                    <form method="POST" action="/_maintenance/update" data-busy="กำลังติดตั้ง…" data-confirm="{{ $newer($release) ? 'อัปเดต' : 'ย้อนกลับ' }}เป็น {{ $release['tag'] }}? เว็บจะปิดชั่วคราวระหว่างติดตั้ง (ควร backup ฐานข้อมูลก่อน)">
                                        @csrf
                                        <input type="hidden" name="tag" value="{{ $release['tag'] }}">
                                        <button class="btn sm {{ $newer($release) ? 'primary' : '' }}">{{ $newer($release) ? 'อัปเดต' : 'ย้อนกลับ' }}</button>
                                    </form>
                                @endif
                            </div>
                        @endforeach
                    </div>
                </details>
            @endif

        </section>

        {{-- Maintenance mode --}}
        <section id="mode">
            <div class="sec-head">
                <div>
                    <h2>ปิดปรับปรุงชั่วคราว</h2>
                    <p>ผู้เข้าชมเห็นหน้าแจ้งปิดปรับปรุง ส่วนคุณยังใช้งานได้ตามปกติ</p>
                </div>
                <span class="chip {{ $down ? 'warn' : 'ok' }}"><span class="dot {{ $down ? 'warn' : 'ok' }}"></span>{{ $down ? 'เว็บปิดอยู่' : 'เว็บเปิดอยู่' }}</span>
            </div>
            <div class="card pad">
                @if ($down)
                    <form method="POST" action="/_maintenance/up" class="form-foot" style="margin: 0" data-busy="กำลังเปิดเว็บ…" data-confirm="เปิดเว็บให้ผู้เข้าชมใช้งาน?">
                        @csrf
                        <span class="text-2">ปิดปรับปรุงเสร็จแล้ว เปิดเว็บให้ผู้เข้าชมเข้าได้ทันที</span>
                        <button class="btn primary">เปิดเว็บ</button>
                    </form>
                @else
                    <form method="POST" action="/_maintenance/down" data-busy="กำลังปิดเว็บ…" data-confirm="ปิดเว็บชั่วคราว? ผู้เข้าชมจะเข้าไม่ได้ แต่คุณยังใช้งานได้ผ่าน bypass cookie">
                        @csrf
                        <div class="form">
                            <div class="field">
                                <label for="m-message">ข้อความถึงผู้เข้าชม</label>
                                <input id="m-message" name="message" maxlength="200" placeholder="เช่น อัปเดตระบบ กลับมาเล่นได้ภายใน 30 นาที">
                            </div>
                            <div class="field">
                                <label for="m-retry">คาดว่ากลับมาใน</label>
                                <select id="m-retry" name="retry">
                                    <option value="">ไม่ระบุ</option>
                                    <option value="300">5 นาที</option>
                                    <option value="900">15 นาที</option>
                                    <option value="1800">30 นาที</option>
                                    <option value="3600">1 ชั่วโมง</option>
                                    <option value="10800">3 ชั่วโมง</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-foot">
                            <span class="muted" style="font-size: 13px">ไม่กรอกข้อความ ผู้เข้าชมจะเห็นข้อความมาตรฐาน</span>
                            <button class="btn danger">ปิดเว็บชั่วคราว</button>
                        </div>
                    </form>
                @endif
            </div>
        </section>

        {{-- คำสั่ง --}}
        <section id="commands">
            <div class="sec-head">
                <div>
                    <h2>คำสั่งดูแลระบบ</h2>
                    <p>กดทีละปุ่มตามลำดับ ผลลัพธ์แสดงที่ด้านบนของหน้า</p>
                </div>
            </div>
            @foreach ($actionGroups as $gkey => $glabel)
                @if ($actions->has($gkey))
                    <p class="cmd-group">{{ $glabel }}</p>
                    <div class="card rows">
                        @foreach ($actions[$gkey] as $action)
                            <form method="POST" action="/_maintenance/actions/{{ $action['key'] }}" class="cmd" data-busy="กำลังรัน…" @if ($action['confirm']) data-confirm="{{ $action['confirm'] }}" @endif>
                                @csrf
                                <div class="grow">
                                    <div class="t">{{ $action['title'] }}</div>
                                    <div class="d">{{ $action['hint'] }}</div>
                                </div>
                                <button class="btn sm">รัน</button>
                            </form>
                        @endforeach
                    </div>
                @endif
            @endforeach
            <p class="muted" style="font-size: 13px; margin: 12px 0 0">ใช้ใน terminal ได้เหมือนกัน: <code>php artisan devtrin:doctor --deep</code> (exit code 1 เมื่อมีรายการผิดปกติ)</p>
        </section>
    @endif

    <p class="foot">Devtrin v{{ $app['version'] }} · หน้านี้ไม่โหลดไฟล์ build ของเว็บ จึงเปิดได้แม้ส่วนอื่นเสีย</p>
</div>

<script>
    // กล่องยืนยันก่อนส่งทุกคำสั่ง/การติดตั้ง (แบบ SweetAlert) + ล็อกปุ่มกันกดซ้ำ
    var ICONS = {
        q: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
        w: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5"/><path d="M12 16.5h.01"/></svg>'
    };
    function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function askConfirm(opts) {
        return new Promise(function (resolve) {
            var back = document.createElement('div');
            back.className = 'swal-back';
            back.innerHTML = '<div class="swal" role="alertdialog" aria-modal="true" aria-labelledby="swal-t" aria-describedby="swal-d">'
                + '<div class="swal-icon ' + opts.tone + '">' + ICONS[opts.tone] + '</div>'
                + '<h3 id="swal-t">' + esc(opts.title) + '</h3>'
                + (opts.text ? '<p id="swal-d">' + esc(opts.text) + '</p>' : '')
                + '<div class="swal-actions"><button type="button" class="btn" data-no>ยกเลิก</button>'
                + '<button type="button" class="btn ' + (opts.tone === 'w' ? 'warn' : 'primary') + '" data-yes>' + esc(opts.ok) + '</button></div></div>';
            var last = document.activeElement;
            function close(result) {
                document.removeEventListener('keydown', onKey);
                back.classList.add('out');
                setTimeout(function () { back.remove(); if (last && last.focus) last.focus(); }, 150);
                resolve(result);
            }
            function onKey(e) { if (e.key === 'Escape') close(false); }
            back.addEventListener('click', function (e) { if (e.target === back) close(false); });
            back.querySelector('[data-no]').addEventListener('click', function () { close(false); });
            back.querySelector('[data-yes]').addEventListener('click', function () { close(true); });
            document.addEventListener('keydown', onKey);
            document.body.appendChild(back);
            back.querySelector('[data-yes]').focus();
        });
    }
    document.querySelectorAll('form[data-busy]').forEach(function (form) {
        var confirmed = false;
        form.addEventListener('submit', function (e) {
            var msg = form.getAttribute('data-confirm');
            var isCommand = form.classList.contains('cmd');
            // ปุ่มสลับค่า (เช่น บังคับอัปเดตแอป) ไม่ต้องถาม — คำสั่ง การติดตั้ง และเปิด/ปิดเว็บถามทุกครั้ง
            if (!confirmed && (msg || isCommand)) {
                e.preventDefault();
                var title = (form.querySelector('.t') || {}).textContent || (msg ? msg.split('?')[0] + '?' : 'ยืนยัน');
                var hint = (form.querySelector('.d') || {}).textContent || '';
                askConfirm({
                    tone: msg ? 'w' : 'q',
                    title: isCommand ? title.trim() + '?' : title.trim(),
                    text: msg ? (isCommand ? msg : (msg.split('?').slice(1).join('?').trim() || msg)) : hint.trim(),
                    ok: isCommand ? 'รันเลย' : (form.action.indexOf('/update') > -1 ? 'ติดตั้งเลย' : 'ยืนยัน')
                }).then(function (yes) {
                    if (!yes) return;
                    confirmed = true;
                    if (form.requestSubmit) form.requestSubmit(); else form.submit();
                });
                return;
            }
            var btn = form.querySelector('button');
            if (!btn) return;
            var busy = form.getAttribute('data-busy');
            setTimeout(function () { btn.disabled = true; if (busy) btn.textContent = busy; }, 0);
        });
    });
    document.querySelectorAll('[data-copy]').forEach(function (b) {
        b.addEventListener('click', function () {
            var el = document.querySelector(b.getAttribute('data-copy'));
            if (!el || !navigator.clipboard) return;
            navigator.clipboard.writeText(el.textContent.trim()).then(function () {
                var old = b.innerHTML; b.textContent = 'คัดลอกแล้ว'; setTimeout(function () { b.innerHTML = old; }, 1500);
            });
        });
    });
</script>
</body>
</html>
