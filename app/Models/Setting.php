<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * ข้อความบนหน้าเว็บที่แก้ได้จากหลังบ้าน (/admin/settings) — เก็บแบบ key/value
 */
class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    private const CACHE_KEY = 'site-settings';

    /** ค่าเริ่มต้นเมื่อยังไม่เคยบันทึก — key ที่ไม่อยู่ในนี้จะบันทึกไม่ได้ */
    public const DEFAULTS = [
        'site_name' => 'Devtrin',
        'hero_eyebrow' => 'Web · Mobile · IoT · AI',
        'hero_title' => 'เราสร้างซอฟต์แวร์ที่ใช้งานได้จริง',
        'hero_subtitle' => 'รวมผลงานเว็บแอป ระบบหลังบ้าน แอปมือถือ และ IoT ที่ออกแบบ พัฒนา และดูแลเองตั้งแต่ต้นจนจบ',
        'about' => 'Devtrin คือสตูดิโอพัฒนาซอฟต์แวร์ขนาดเล็กที่เน้นงานที่ใช้งานได้จริงในธุรกิจ ตั้งแต่ระบบจองโรงแรมสัตว์เลี้ยง เกมเรียนกฎหมาย ไปจนถึงอุปกรณ์ IoT — ทุกโปรเจกต์ดูแลครบตั้งแต่ออกแบบ เขียนโค้ด deploy และดูแลหลังขึ้นระบบ',
        'availability' => 'เปิดรับงานใหม่',
        'contact_title' => 'มีไอเดียอยากทำให้เป็นจริง?',
        'email' => '',
        'phone' => '',
        'line_url' => '',
        'github_url' => '',
        'facebook_url' => '',
        'location' => 'Bangkok, Thailand',
        'seo_description' => 'Devtrin — รวมผลงานพัฒนาเว็บแอป ระบบหลังบ้าน แอปมือถือ และ IoT',
    ];

    /** @return array<string, string> */
    public static function values(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $saved = static::query()->pluck('value', 'key')->all();

            return array_map(fn ($v) => (string) $v, array_merge(self::DEFAULTS, array_intersect_key($saved, self::DEFAULTS)));
        });
    }

    public static function get(string $key): string
    {
        return self::values()[$key] ?? '';
    }

    /** @param  array<string, ?string>  $values */
    public static function put(array $values): void
    {
        foreach (array_intersect_key($values, self::DEFAULTS) as $key => $value) {
            static::updateOrCreate(['key' => $key], ['value' => $value ?? '']);
        }
        Cache::forget(self::CACHE_KEY);
    }
}
