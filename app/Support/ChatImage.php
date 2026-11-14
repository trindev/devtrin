<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * รูปแนบในแชท — แชทเป็นเรื่องส่วนตัว จึงไม่เก็บใน storage/app/public (/media เปิดได้ทุกคน)
 * เก็บที่ storage/app/private/chat แล้วเสิร์ฟผ่าน /chat/image/{message} ที่ตรวจสิทธิ์ก่อน
 */
class ChatImage
{
    public const DISK = 'local';

    public static function store(UploadedFile $file): string
    {
        $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'][$file->getMimeType()] ?? 'jpg';

        return $file->storeAs('chat/'.now()->format('Ym'), Str::random(32).'.'.$ext, self::DISK);
    }

    public static function delete(?string $path): void
    {
        if ($path && Media::safe($path)) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    public static function absolute(string $path): string
    {
        return Storage::disk(self::DISK)->path($path);
    }
}
