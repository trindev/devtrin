// Devtrin service worker v{{ $version }} ({{ $revision }}) — รับ Web Push (แชท) และเปิดหน้าเมื่อกดแจ้งเตือน
// ไม่ cache หน้าเว็บ: หน้าเว็บอัปเดตบ่อยและไม่ต้องใช้ออฟไลน์
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
    const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/';
    event.waitUntil(self.registration.showNotification(data.title || 'Devtrin', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/favicon-96x96.png',
        tag: data.tag || 'devtrin',
        renotify: true,
        data: { url },
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
        const win = wins.find((w) => w.url.startsWith(self.location.origin));
        if (win) return win.focus().then(() => win.navigate(url));
        return self.clients.openWindow(url);
    }));
});
