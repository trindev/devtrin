<?php

namespace App\Http\Controllers;

use App\Support\Media;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** เสิร์ฟรูปที่อัปโหลด (storage/app/public) — ดูเหตุผลที่ไม่ใช้ symlink ใน App\Support\Media */
class MediaController extends Controller
{
    public function __invoke(string $path): BinaryFileResponse
    {
        abort_unless(Media::safe($path), 404);
        $file = Media::absolute($path);
        abort_unless(is_file($file), 404);

        return response()->file($file, [
            'Cache-Control' => 'public, max-age=31536000, immutable', // ชื่อไฟล์สุ่มใหม่ทุกครั้งที่อัปโหลด จึง cache ได้ยาว
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
