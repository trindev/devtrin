<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * ไฟล์รูปที่อัปโหลดจากหลังบ้าน — เก็บใน storage/app/public แล้วเสิร์ฟผ่าน route /media/{path}
 *
 * ไม่ใช้ symlink public/storage เพราะตัวอัปเดต (SelfUpdater) สลับโฟลเดอร์ public/ ทั้งก้อนทุกครั้ง
 * ส่วน storage/ ไม่ถูกแตะ — รูปจึงอยู่รอดทุกการอัปเดต และไม่ต้องรัน storage:link บน shared host
 */
class Media
{
    public const DISK = 'public';

    /** กฎ validate รูป (ใช้ซ้ำในทุก request ที่รับรูป) — 8 MB, ตรวจจากเนื้อไฟล์ไม่ใช่นามสกุล */
    public const IMAGE_RULE = ['image', 'mimes:jpg,jpeg,png,webp,gif', 'max:8192'];

    private const EXTENSIONS = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];

    public static function store(UploadedFile $file, string $dir): string
    {
        $ext = self::EXTENSIONS[$file->getMimeType()] ?? 'jpg';

        return $file->storeAs($dir, now()->format('Ym').'-'.Str::random(20).'.'.$ext, self::DISK);
    }

    public static function delete(?string $path): void
    {
        if ($path && self::safe($path)) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    public static function url(?string $path): ?string
    {
        return $path ? '/media/'.$path : null;
    }

    /** กัน path ที่ออกนอกโฟลเดอร์ (../) หรือไฟล์ซ่อน */
    public static function safe(string $path): bool
    {
        return ! str_contains($path, '..') && ! str_starts_with($path, '/') && ! preg_match('#(^|/)\.#', $path);
    }

    public static function absolute(string $path): string
    {
        return Storage::disk(self::DISK)->path($path);
    }
}
