@php
    /*
     * หน้าปิดปรับปรุง — ไฟล์เดียวจบ (CSS/JS ในตัว) ไม่พึ่ง Vite build
     * ถูก render เก็บไว้ล่วงหน้าตอนกดปิดเว็บ (MaintenanceSwitch::down) แล้วส่งออกก่อน Laravel บูต
     * จึงใช้ได้แค่ข้อมูลที่รู้ ณ ตอนปิด: ข้อความ, เวลาที่คาดว่ากลับมา, ช่องทางติดต่อ
     */
    use App\Models\Setting;

    $site = rescue(fn () => Setting::values(), [], false);
    $name = $site['site_name'] ?? 'Devtrin';
    $message = rescue(fn () => cache('maintenance_message'), null, false);
    $retry = isset($retryAfter) && $retryAfter ? (int) $retryAfter : null;
    $eta = $retry ? now()->addSeconds($retry) : null;
    $contacts = array_filter([
        ! empty($site['email']) ? ['อีเมล', 'mailto:'.$site['email'], $site['email']] : null,
        ! empty($site['line_url']) ? ['LINE', $site['line_url'], 'LINE'] : null,
        ! empty($site['facebook_url']) ? ['Facebook', $site['facebook_url'], 'Facebook'] : null,
    ]);
@endphp
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <meta name="theme-color" content="#0a0a0b">
    <title>ปิดปรับปรุงชั่วคราว — {{ $name }}</title>
    <link rel="icon" href="/favicon.ico" sizes="48x48">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script>
        // ใช้ธีมเดียวกับที่ผู้เข้าชมเลือกไว้บนเว็บ (ไม่เคยเลือก = มืดตามดีไซน์)
        (function () { var t = null; try { t = localStorage.getItem('dt-theme'); } catch (e) {} document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark'; })();
    </script>
    <style>
        :root { --bg: #0a0a0b; --bg-2: #131316; --text: #f3f2ee; --mute: #8d8d96; --line: rgb(255 255 255 / .08); --lime: #c8ff3d; --a: #6d4dff; --b: #12a3a3; --on-lime: #0a0a0b; }
        [data-theme='light'] { --bg: #f5f4f0; --bg-2: #ecebe5; --text: #131315; --mute: #6b6b74; --line: rgb(0 0 0 / .08); --lime: #9ee000; --a: #a78bfa; --b: #5eead4; }
        * { box-sizing: border-box; margin: 0; }
        html, body { height: 100%; }
        body { background: var(--bg); color: var(--text); font: 16px/1.7 'IBM Plex Sans Thai', system-ui, sans-serif; -webkit-font-smoothing: antialiased; overflow: hidden; }

        /* พื้นหลัง: แสงเหนือ 3 ก้อนลอยช้า ๆ + เส้นตาราง + เกรน */
        .bg { position: fixed; inset: 0; overflow: hidden; }
        .blob { position: absolute; border-radius: 50%; filter: blur(110px); opacity: .55; will-change: transform; }
        .blob.a { width: 60vmax; height: 60vmax; left: -15vmax; top: -25vmax; background: var(--a); animation: drift 22s ease-in-out infinite; }
        .blob.b { width: 50vmax; height: 50vmax; right: -18vmax; bottom: -22vmax; background: var(--b); animation: drift 26s ease-in-out -8s infinite reverse; }
        .blob.c { width: 34vmax; height: 34vmax; right: 12vmax; top: -14vmax; background: var(--lime); opacity: .22; animation: drift 30s ease-in-out -15s infinite; }
        [data-theme='light'] .blob { opacity: .5; }
        .grid { position: absolute; inset: 0; background-image: linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px); background-size: 64px 64px; -webkit-mask-image: radial-gradient(ellipse at 50% 45%, #000 20%, transparent 72%); mask-image: radial-gradient(ellipse at 50% 45%, #000 20%, transparent 72%); }
        .grain { position: absolute; inset: 0; opacity: .07; mix-blend-mode: overlay; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
        @keyframes drift { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(7%, -6%) scale(1.12); } 66% { transform: translate(-6%, 7%) scale(.92); } }

        main { position: relative; z-index: 1; min-height: 100%; display: grid; grid-template-rows: auto 1fr auto; padding: clamp(20px, 4vw, 40px); }
        header, footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 13px; color: var(--mute); }
        .brand { font: 700 20px/1 'Bricolage Grotesque', sans-serif; color: var(--text); letter-spacing: -.02em; }
        .brand i { color: var(--lime); font-style: normal; }
        .status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; backdrop-filter: blur(8px); }
        .status b { width: 8px; height: 8px; border-radius: 50%; background: #f5a524; box-shadow: 0 0 0 0 rgb(245 165 36 / .6); animation: ping 1.8s ease-out infinite; }
        @keyframes ping { to { box-shadow: 0 0 0 10px rgb(245 165 36 / 0); } }

        .center { display: grid; place-items: center; text-align: center; padding: 24px 0; }
        .wrap { max-width: 760px; }

        /* โลโก้ + วงแหวนหมุน */
        .mark { position: relative; width: 112px; height: 112px; margin: 0 auto 36px; cursor: default; -webkit-tap-highlight-color: transparent; user-select: none; }
        .mark svg.logo { position: absolute; inset: 16px; width: 80px; height: 80px; border-radius: 22px; box-shadow: 0 20px 50px -12px rgb(0 0 0 / .5); }
        .ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed color-mix(in srgb, var(--text) 28%, transparent); animation: spin 14s linear infinite; }
        .ring::after { content: ''; position: absolute; top: -5px; left: 50%; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%; background: var(--lime); box-shadow: 0 0 14px var(--lime); }
        .ring.two { inset: -14px; border-style: solid; border-color: var(--line); animation-duration: 22s; animation-direction: reverse; }
        .ring.two::after { width: 6px; height: 6px; margin-left: -3px; top: -3.5px; background: var(--text); box-shadow: none; opacity: .6; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .eyebrow { font: 500 12px/1 'IBM Plex Mono', monospace; letter-spacing: .28em; text-transform: uppercase; color: var(--mute); margin-bottom: 20px; }
        h1 { font: 700 clamp(2.4rem, 7.5vw, 5.25rem)/1.12 'Bricolage Grotesque', 'IBM Plex Sans Thai', sans-serif; letter-spacing: -.03em; text-wrap: balance; padding-top: .12em; }
        h1 span { background: linear-gradient(100deg, var(--text) 20%, var(--lime) 50%, var(--text) 80%); background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: shine 5s ease-in-out infinite; }
        @keyframes shine { 0%, 100% { background-position: 110% 0; } 50% { background-position: -10% 0; } }
        .msg { margin: 22px auto 0; max-width: 34em; font-size: clamp(1rem, 2.2vw, 1.2rem); color: color-mix(in srgb, var(--text) 72%, transparent); text-wrap: pretty; }

        /* แถบความคืบหน้าแบบวิ่งวน */
        .bar { position: relative; width: min(320px, 70vw); height: 4px; margin: 36px auto 0; border-radius: 99px; background: var(--line); overflow: hidden; }
        .bar::after { content: ''; position: absolute; inset: 0; width: 40%; border-radius: inherit; background: linear-gradient(90deg, transparent, var(--lime), transparent); animation: slide 1.8s ease-in-out infinite; }
        @keyframes slide { from { transform: translateX(-110%); } to { transform: translateX(280%); } }

        .chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 28px; }
        .chip { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--line); background: color-mix(in srgb, var(--bg-2) 70%, transparent); backdrop-filter: blur(10px); color: var(--text); font-size: 14px; text-decoration: none; transition: border-color .2s, transform .2s; }
        a.chip:hover { border-color: var(--lime); transform: translateY(-1px); }
        a.chip:focus-visible { outline: 2px solid var(--lime); outline-offset: 3px; }
        .chip.eta { border-color: color-mix(in srgb, var(--lime) 45%, transparent); }
        .chip.eta b { font-weight: 600; }

        @media (prefers-reduced-motion: reduce) { .blob, .ring, .bar::after, h1 span, .status b { animation: none !important; } }
        @media (max-height: 620px) { .mark { transform: scale(.75); margin-bottom: 12px; } body { overflow: auto; } }
    </style>
</head>
<body>
<div class="bg" aria-hidden="true">
    <div class="blob a"></div><div class="blob b"></div><div class="blob c"></div>
    <div class="grid"></div><div class="grain"></div>
</div>
<main>
    <header>
        <span class="brand">{{ strtolower($name) }}<i>.</i></span>
        <span class="status"><b></b>กำลังปรับปรุง</span>
    </header>

    <div class="center">
        <div class="wrap">
            {{-- แตะโลโก้ 5 ครั้ง = ไปหน้า login หลังบ้าน (ทางลับแบบเดียวกับ footer ของหน้าเว็บ) --}}
            <div class="mark" id="mark" aria-hidden="true">
                <div class="ring two"></div><div class="ring"></div>
                <svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0a0a0b"/><circle cx="205" cy="288" r="96" fill="none" stroke="#f3f2ee" stroke-width="56"/><rect x="273" y="100" width="56" height="312" rx="28" fill="#f3f2ee"/><circle cx="397" cy="378" r="34" fill="#c8ff3d"/></svg>
            </div>
            <p class="eyebrow">Maintenance</p>
            <h1><span>เดี๋ยวกลับมา</span><br>ดีกว่าเดิม</h1>
            <p class="msg">{{ $message ?: 'เรากำลังอัปเดตระบบและปรับปรุงเว็บไซต์ ใช้เวลาไม่นาน ขอบคุณที่รอนะครับ' }}</p>
            <div class="bar" role="progressbar" aria-label="กำลังปรับปรุง"></div>
            <div class="chips">
                @if ($eta)
                    <span class="chip eta" id="eta" data-eta="{{ $eta->toIso8601String() }}">คาดว่ากลับมา <b>{{ $eta->timezone('Asia/Bangkok')->format('H:i') }} น.</b></span>
                @endif
                @foreach ($contacts as [$label, $href, $text])
                    <a class="chip" href="{{ $href }}" @if (! str_starts_with($href, 'mailto:')) target="_blank" rel="noopener noreferrer" @endif>{{ $text }}</a>
                @endforeach
            </div>
        </div>
    </div>

    <footer>
        <span>© {{ date('Y') }} {{ $name }}</span>
        <span id="auto">หน้านี้จะเปิดเว็บให้เองเมื่อพร้อม</span>
    </footer>
</main>
<script>
    (function () {
        // เช็กทุก 20 วินาทีว่าเว็บกลับมาหรือยัง (ไม่ได้ 503 แล้ว) → โหลดหน้าใหม่ให้เอง
        var check = function () {
            fetch(location.href, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' })
                .then(function (r) { if (r.status !== 503) location.reload(); })
                .catch(function () {});
        };
        setInterval(function () { if (document.visibilityState === 'visible') check(); }, 20000);
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });

        // นับถอยหลังถึงเวลาที่คาดไว้
        var eta = document.getElementById('eta');
        if (eta) {
            var at = new Date(eta.dataset.eta).getTime(), label = eta.innerHTML;
            var tick = function () {
                var min = Math.round((at - Date.now()) / 60000);
                eta.innerHTML = min > 0 ? label + ' · อีกประมาณ ' + (min >= 60 ? Math.floor(min / 60) + ' ชม. ' + (min % 60) + ' นาที' : min + ' นาที') : 'ใกล้เสร็จแล้ว อีกสักครู่';
            };
            tick(); setInterval(tick, 30000);
        }

        // ทางลับ: แตะโลโก้ 5 ครั้งใน 3 วินาที → หน้า login หลังบ้าน (เข้าได้แม้ปิดเว็บ)
        var taps = [];
        document.getElementById('mark').addEventListener('click', function () {
            var now = Date.now();
            taps = taps.filter(function (t) { return now - t < 3000; }); taps.push(now);
            if (taps.length >= 5) location.href = '/admin/login';
        });
    })();
</script>
</body>
</html>
