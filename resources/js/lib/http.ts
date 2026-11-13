/** fetch แบบ JSON + CSRF ของ Laravel — ใช้กับ endpoint ที่ไม่ใช่หน้า Inertia (แชท, push) */
const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

export async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    return res.json();
}

export async function sendJson<T>(url: string, body: unknown, method = 'POST'): Promise<T> {
    const res = await fetch(url, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw Object.assign(new Error(data.message || `HTTP ${res.status}`), { status: res.status });
    }
    return res.json();
}
