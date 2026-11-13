/**
 * ย่อรูปในเบราว์เซอร์ก่อนอัปโหลด (ด้านยาวสุด maxSize px, แปลงเป็น WebP) — อัปโหลดเร็วขึ้นและไม่ต้องใช้ GD บน server
 * ถ้าย่อไม่ได้ (เบราว์เซอร์เก่า/ไฟล์แปลก) ส่งไฟล์เดิม ให้ server validate ต่อ
 */
export async function prepareImage(file: File, maxSize = 2200, quality = 0.86): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
        if (!blob || blob.size >= file.size) return file;
        return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
    } catch {
        return file;
    }
}
