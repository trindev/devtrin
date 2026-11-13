<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <link rel="icon" href="/favicon.ico" sizes="48x48">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <title>ปิดปรับปรุงชั่วคราว — Devtrin</title>
    <style>
        :root { --bg: #f4f3ef; --text: #111; --muted: #666; --accent: #7c5cff; }
        @media (prefers-color-scheme: dark) { :root { --bg: #0b0b0d; --text: #f3f2ee; --muted: #9a9aa3; --accent: #a993ff; } }
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px; background: var(--bg); color: var(--text);
               font: 16px/1.7 'IBM Plex Sans Thai', system-ui, sans-serif; }
        main { max-width: 440px; text-align: center; }
        .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--accent); margin: 0 auto 24px; animation: pulse 1.6s ease-in-out infinite; }
        h1 { font-size: 28px; line-height: 1.3; margin: 0 0 8px; letter-spacing: -0.01em; }
        p { color: var(--muted); margin: 0; }
        @keyframes pulse { 50% { transform: scale(1.6); opacity: .4; } }
        @media (prefers-reduced-motion: reduce) { .dot { animation: none; } }
    </style>
</head>
<body>
<main>
    <div class="dot"></div>
    <h1>กำลังปรับปรุงเว็บไซต์</h1>
    <p>{{ cache('maintenance_message') ?: 'เรากำลังอัปเดตระบบ กลับมาใหม่ในอีกไม่กี่นาที' }}</p>
</main>
</body>
</html>
