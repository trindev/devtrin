# Deploy ขึ้น shared host — devtrin.com

แอปนี้ build ทุกอย่างบน GitHub Actions (หรือบนเครื่องเรา) แล้วอัปโหลดเป็น zip
บน server ไม่ต้องมี composer, npm หรือ SSH ใช้แค่ PHP 8.2 กับ MySQL ก็พอ

โครงสร้างบน host:

```
/domains/devtrin.com/public_html/
├── .htaccess          ← ส่ง devtrin.com เข้าแอป (deploy/public_html.htaccess)
├── devtrin/           ← แอปนี้ (แตก zip ที่นี่)
│   ├── .env
│   ├── public/        ← หน้าเว็บจริง
│   └── storage/       ← รูปที่อัปโหลด + log (ไม่ถูกแตะตอนอัปเดต)
├── law-quest/  staycool-82/  raya/  ...   ← subdomain เดิม ไม่เกี่ยวกัน
```

DirectAdmin ล็อก document root ของโดเมนหลักไว้ที่ `public_html` จึงใช้ `.htaccess` ส่งเฉพาะ request ของ `devtrin.com`
เข้า `devtrin/public` ส่วน subdomain ยังเข้าโฟลเดอร์ของตัวเองตามเดิม

## ติดตั้งครั้งแรก

1. **เตรียม host** ใน DirectAdmin
   - PHP 8.2 ของ devtrin.com ตั้งไว้แล้ว และต้องเปิด extension `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `zip`
   - MySQL Management → สร้างฐานข้อมูลและผู้ใช้ใหม่ (เช่น `devtrinc_site`)
   - **ไม่ต้องสร้าง subdomain `www`** — `www.devtrin.com` ใช้ docroot เดียวกับโดเมนหลักอยู่แล้ว และ `.htaccess` จะ redirect ไป `devtrin.com` ให้

2. **ดาวน์โหลด zip** จาก GitHub → repo `trindev/devtrin` → Actions → run ล่าสุดของ `main` → Artifacts → `devtrin-release`
   (หรือจากหน้า Releases ถ้า push tag แล้ว หรือ build เองด้วย `bash deploy/build-release.sh`)

3. **อัปโหลดและแตก zip** ด้วย File Manager
   - สร้างโฟลเดอร์ `public_html/devtrin` แล้วแตก zip ลงไปในนั้น
   - ตรวจว่ามีไฟล์ `public_html/devtrin/artisan` และ `public_html/devtrin/public/index.php`

4. **สร้าง `.env`** ที่ `public_html/devtrin/.env` จาก `.env.production.example` แล้วเติมค่า
   - `APP_KEY`: สร้างบนเครื่องตัวเองด้วย `php artisan key:generate --show`
   - `DB_*`: ใช้ค่าจากข้อ 1
   - `MAINTENANCE_TOKEN`: สุ่มด้วย `openssl rand -hex 32` (ใช้กับ recover.php และ uptime monitor)
   - ตั้งสิทธิ์ให้ `storage/` และ `bootstrap/cache/` เขียนได้ (755)

5. **สำรองหน้าเว็บเดิม แล้ววาง `.htaccess`**
   - ดาวน์โหลด `public_html/index.html`, `css/`, `js/`, `images/`, `fonts/` เก็บไว้ก่อน (หลังจากนี้จะไม่ถูกใช้แล้ว)
   - ถ้ามี `public_html/.htaccess` อยู่แล้ว ให้ดาวน์โหลดเก็บไว้ด้วย
   - อัปโหลด `deploy/public_html.htaccess` ไปเป็น `public_html/.htaccess`
   - ถ้ายังมีโฟลเดอร์ที่ต้องเปิดผ่าน `devtrin.com/<ชื่อโฟลเดอร์>` ให้เพิ่มชื่อลงในบรรทัด `REQUEST_URI` ของไฟล์นี้
     (ตอนนี้ยกเว้น `me`, `linepic`, `webmail`, `cgi-bin`, `.well-known` และไฟล์ยืนยัน Google ไว้แล้ว)

6. **รัน migration และสร้าง admin** — ใช้ Terminal ของ host ถ้ามี หรือตั้ง Cron Job ให้รันครั้งเดียวแล้วลบออก
   ```bash
   cd ~/domains/devtrin.com/public_html/devtrin && php artisan migrate --force --seed
   php artisan devtrin:make-admin you@example.com --name="Trin"
   ```
   - `--seed` ใส่โปรเจกต์ตั้งต้น 12 รายการจาก subdomain ที่มี (รันซ้ำได้ ไม่ทับของที่แก้แล้ว)
   - คำสั่ง make-admin จะแสดงรหัสผ่านสุ่ม**ครั้งเดียว** ให้จดไว้ แล้วเปลี่ยนได้ที่ `/admin/account`
   - ถ้ารันผ่าน Cron ให้ต่อท้ายด้วย `> storage/logs/setup.txt 2>&1` แล้วเปิดไฟล์นั้นอ่านรหัสผ่าน จากนั้น**ลบไฟล์ทิ้ง**

7. **ตรวจที่ `https://devtrin.com/_maintenance`** (ต้อง login เป็น admin ก่อน)
   - กด **Cache config/route/view**
   - ทุกรายการควรเป็น "ปกติ" — ดู APP_DEBUG, Document root และ Migration เป็นพิเศษ
   - กด **ตรวจละเอียด** เพื่อเทียบไฟล์กับ release และเช็กว่าเว็บของทุกโปรเจกต์ยังออนไลน์

8. **ใส่เนื้อหา** ที่ `/admin`
   - **ตั้งค่าเว็บ:** ข้อความหน้าแรกและช่องทางติดต่อ
   - **โปรเจกต์:** ใส่รูปปก แกลเลอรี และคำอธิบาย ส่วนดาว ★ ใช้เลือกผลงานเด่นที่แสดงในส่วนเลื่อนแนวนอน
   - โปรเจกต์ที่ยังไม่รู้รายละเอียด (NeeYung, Pliew, Staffix, ...) seed ไว้แค่ชื่อกับลิงก์ ให้เติมหรือซ่อนเอง

## ออกเวอร์ชันใหม่ (นักพัฒนา)

```bash
echo "1.0.1" > VERSION && git commit -am "Release 1.0.1"
git tag v1.0.1 && git push origin main --tags
```

GitHub Actions จะรัน test แล้วสร้าง Release `v1.0.1` พร้อมไฟล์ `devtrin-v1.0.1.zip`
(tag ต้องตรงกับไฟล์ `VERSION` ไม่งั้น CI จะไม่ปล่อย release)

## อัปเดตบน server

### แบบกดปุ่ม (แนะนำ)

1. ครั้งแรกครั้งเดียว: สร้าง GitHub token
   - GitHub → Settings → Developer settings → Fine-grained tokens
   - Repository access: เฉพาะ `trindev/devtrin`
   - Permissions: Contents = Read-only
   - ใส่ `GITHUB_TOKEN=...` ใน `.env` บน server แล้วกด "ล้าง cache ทั้งหมด"
2. backup ฐานข้อมูลก่อน (phpMyAdmin → Export)
3. `/_maintenance` → ส่วน "เวอร์ชันแอป" → กด **อัปเดต**
   - ระบบจะปิดเว็บ → ดาวน์โหลด → ตรวจ checksum → สลับไฟล์ → migrate → cache → เปิดเว็บ
   - ไฟล์เดิมเก็บไว้ที่ `storage/app/update-backups/` (2 รุ่นล่าสุด) ถ้ามีปัญหาก็กด **ย้อนกลับ** ได้
   - `.env` และ `storage/` (รวมรูปที่อัปโหลด) จะไม่ถูกแตะ

### แบบอัปโหลดเอง

1. `/_maintenance` → **ปิดเว็บชั่วคราว**
2. แตก zip ใหม่ทับ `public_html/devtrin` (ใน zip ไม่มี `.env` และไม่มีรูปที่อัปโหลด จึงทับได้)
3. `/_maintenance` → **รัน migration** → **Cache config/route/view** → **เปิดเว็บ**

## กู้ระบบเมื่อเว็บพังทั้งเว็บ

ถ้าทุกหน้าได้ 500 รวมถึง `/_maintenance` ให้ใช้ `recover.php` ซึ่งมากับทุก release และไม่ต้องพึ่ง Laravel

1. `https://devtrin.com/recover.php?key=<MAINTENANCE_TOKEN>&action=clear` — ล้าง OPcache และ cache (ลองข้อนี้ก่อน)
2. `…&action=diagnose` — บูต Laravel แล้วแสดง error จริง
3. `…&action=install` — ติดตั้ง release ล่าสุดใหม่ทั้งชุด (ต้องมี `GITHUB_TOKEN` หรือวาง `devtrin-*.zip` ไว้ในโฟลเดอร์แอป)

ถ้าเว็บเพี้ยนเพราะ OPcache ของ host (เคยเกิดกับ law-quest บน host เดียวกัน) แอปจะล้าง OPcache แล้วลองใหม่ให้เอง
ดูประวัติได้ที่ `/_maintenance` ในแถว "กู้คืน OPcache อัตโนมัติ"

## Uptime monitor (ไม่บังคับ)

```
GET https://devtrin.com/_maintenance?format=json
Header: X-Maintenance-Token: <MAINTENANCE_TOKEN>
```

ถ้าได้ 200 แปลว่าปกติหรือมีรายการควรดู ถ้าได้ 503 แปลว่ามีรายการผิดปกติ
