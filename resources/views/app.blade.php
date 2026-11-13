@php
    $meta = $meta ?? [];
    $title = $meta['title'] ?? 'Devtrin';
    $description = $meta['description'] ?? '';
    $image = !empty($meta['image']) ? url($meta['image']) : null;
@endphp
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0a0a0b">
    {{-- meta สำหรับ social preview — ฝั่ง server เพราะ crawler ไม่รัน JavaScript --}}
    <title inertia>{{ $title }}</title>
    <meta name="description" content="{{ $description }}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{{ $title }}">
    <meta property="og:description" content="{{ $description }}">
    <meta property="og:url" content="{{ url()->current() }}">
    @if ($image)
        <meta property="og:image" content="{{ $image }}">
        <meta name="twitter:card" content="summary_large_image">
    @endif
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
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
