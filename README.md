# devtrin.com

เว็บรวมผลงาน (portfolio) ของ Devtrin — Laravel 12 + Inertia 2 + React 19 + Tailwind 4
หน้าบ้านใช้ GSAP ScrollTrigger + Lenis ส่วนหลังบ้าน (`/admin`) ใช้จัดการโปรเจกต์ รูป และข้อความบนเว็บ
และมีศูนย์ดูแลระบบ (`/_maintenance`) ที่ดัดแปลงมาจาก lawquest-web / staycoolv3

## พัฒนาในเครื่อง

```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
php artisan devtrin:make-admin you@example.com --password=รหัสผ่าน
npm run dev          # อีกหน้าต่าง: php artisan serve
```

- หน้าเว็บ: `/` และ `/projects/{slug}`
- หลังบ้าน: `/admin` (โปรเจกต์, ตั้งค่าเว็บ, บัญชี)
- doctor: `/_maintenance` หรือรัน `php artisan devtrin:doctor --deep`
- test: `php artisan test`

## โครงสร้างที่ควรรู้

| ส่วน | ไฟล์ |
|---|---|
| หน้าแรก / หน้าโปรเจกต์ | `resources/js/Pages/Home.tsx`, `ProjectShow.tsx` |
| แอนิเมชัน (GSAP, Lenis, ตัดคำไทย) | `resources/js/lib/motion.ts`, `components/site/*` |
| หลังบ้าน | `resources/js/Pages/Admin/*`, `app/Http/Controllers/Admin/*` |
| รูปที่อัปโหลด | `App\Support\Media` → `storage/app/public` เสิร์ฟผ่าน `/media/{path}` (ไม่ใช้ symlink) |
| ข้อความบนเว็บ | `App\Models\Setting::DEFAULTS` |
| doctor / อัปเดต / กู้ระบบ | `App\Services\Doctor`, `SelfUpdater`, `deploy/recover.php` |

Deploy ขึ้น shared host ดูได้ที่ [DEPLOY.md](DEPLOY.md)
