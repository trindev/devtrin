<?php

namespace App\Support;

/**
 * เวอร์ชันของแอปที่ติดตั้งอยู่
 * - VERSION: เลขเวอร์ชัน (แก้มือก่อน tag release เช่น 1.2.0)
 * - REVISION: commit ที่ build (deploy/build-release.sh เขียนให้ — ไม่มีในเครื่องนักพัฒนา)
 */
class AppVersion
{
    public static function version(?string $basePath = null): string
    {
        return self::read(($basePath ?? base_path()).'/VERSION') ?? '0.0.0';
    }

    public static function revision(?string $basePath = null): string
    {
        return self::read(($basePath ?? base_path()).'/REVISION') ?? 'dev';
    }

    public static function toArray(): array
    {
        return ['version' => self::version(), 'revision' => self::revision()];
    }

    private static function read(string $path): ?string
    {
        $value = is_file($path) ? trim((string) file_get_contents($path)) : '';

        return $value === '' ? null : $value;
    }
}
