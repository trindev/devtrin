@php
    $meta = $meta ?? [];
    $title = $meta['title'] ?? 'Devtrin';
    $description = $meta['description'] ?? '';
    $image = url(!empty($meta['image']) ? $meta['image'] : '/og-image.jpg');
@endphp
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0a0a0b">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script>
        // ตั้งธีมและขนาดตัวอักษรก่อนวาดหน้า กันจอกระพริบ (ค่าเดียวกับ resources/js/lib/prefs.ts)
        (function () {
            var d = document.documentElement, t = null, f = null;
            try { t = localStorage.getItem('dt-theme'); f = parseFloat(localStorage.getItem('dt-font')); } catch (e) {}
            if (t !== 'light' && t !== 'dark') {
                // ยังไม่เคยเลือก: หน้าบ้านใช้ธีมมืดตามดีไซน์ หลังบ้านตามระบบ
                t = location.pathname.indexOf('/admin') === 0 && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
            }
            d.dataset.theme = t;
            if (f >= 0.8 && f <= 1.6) d.style.fontSize = (f * 100) + '%';
        })();
    </script>
    {{-- meta สำหรับ social preview — ฝั่ง server เพราะ crawler ไม่รัน JavaScript --}}
    <title inertia>{{ $title }}</title>
    <meta name="description" content="{{ $description }}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{{ $title }}">
    <meta property="og:description" content="{{ $description }}">
    <meta property="og:url" content="{{ url()->current() }}">
    <meta property="og:image" content="{{ $image }}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" href="/favicon.ico" sizes="48x48">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
    @inertiaHead
</head>
<body class="antialiased">
    @inertia
</body>
</html>
