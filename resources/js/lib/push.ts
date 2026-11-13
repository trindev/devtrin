import { sendJson } from '@/lib/http';
import { useEffect, useState } from 'react';

/** Web Push ฝั่งเบราว์เซอร์: เปิด/ปิดรับแจ้งเตือนบนเครื่องนี้ (ดัดแปลงจาก lawquest-web) */
export const pushSupported = () =>
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** iPhone/iPad รับ push ได้เฉพาะตอนเปิดจากไอคอนบนหน้าจอโฮม (iOS 16.4+) */
export const needsInstallForPush = () =>
    /iP(hone|ad|od)/.test(navigator.userAgent) && !(window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone);

export function registerServiceWorker() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

const urlBase64ToUint8Array = (base64: string) => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export async function currentPushSubscription(): Promise<PushSubscription | null> {
    if (!pushSupported()) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return (await reg?.pushManager.getSubscription()) ?? null;
}

/** ขอสิทธิ์แจ้งเตือน แล้วส่ง subscription ไปเก็บที่ server — คืน false ถ้าผู้ใช้ไม่อนุญาต */
export async function enablePush(publicKey: string): Promise<boolean> {
    if (!pushSupported()) return false;
    if ((await Notification.requestPermission()) !== 'granted') return false;
    registerServiceWorker();
    const reg = await navigator.serviceWorker.ready;
    const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
    const json = sub.toJSON();
    await sendJson('/push/subscribe', {
        endpoint: json.endpoint,
        keys: json.keys,
        contentEncoding: (PushManager as unknown as { supportedContentEncodings?: string[] }).supportedContentEncodings?.[0] ?? 'aes128gcm',
    });
    return true;
}

export async function disablePush(): Promise<void> {
    const sub = await currentPushSubscription();
    if (!sub) return;
    await sendJson('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
}

/** สถานะ push ของเครื่องนี้ + ปุ่มเปิด/ปิด */
export function usePush(publicKey: string | null) {
    const [state, setState] = useState<'unsupported' | 'install' | 'off' | 'on' | 'denied' | 'busy'>('off');

    useEffect(() => {
        if (!pushSupported() || !publicKey) return setState(needsInstallForPush() ? 'install' : 'unsupported');
        if (Notification.permission === 'denied') return setState('denied');
        currentPushSubscription().then((s) => setState(s ? 'on' : 'off'));
    }, [publicKey]);

    const toggle = async () => {
        if (!publicKey) return;
        const was = state;
        setState('busy');
        try {
            if (was === 'on') {
                await disablePush();
                setState('off');
            } else {
                setState((await enablePush(publicKey)) ? 'on' : Notification.permission === 'denied' ? 'denied' : 'off');
            }
        } catch {
            setState(was);
        }
    };

    return { state, toggle };
}
