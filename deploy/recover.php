<?php

/**
 * Devtrin recovery — ซ่อมแอปบน shared host เมื่อ Laravel บูตไม่ขึ้น (เช่น vendor/ เสียหรือไม่ครบ)
 * ไม่ใช้ Laravel เลย: อ่าน .env เอง, ดาวน์โหลด GitHub Release เอง, แตก zip ด้วย PHP, ตรวจไฟล์ครบก่อนสลับเข้าที่
 *
 * ตั้งแต่ v1.0.11 ไฟล์นี้มากับทุก release ที่ public/recover.php (build-release.sh คัดลอกให้) — ไม่ต้องอัปโหลดเอง
 * ป้องกันด้วย MAINTENANCE_TOKEN: ไม่มี token ใน .env หรือ key ไม่ตรง → 404
 *
 * วิธีใช้ (https://<โดเมน>/recover.php?key=<MAINTENANCE_TOKEN ใน .env>&action=...):
 *   (ไม่ใส่ action)   ตรวจอย่างเดียว — ไฟล์หาย/เนื้อหาไม่ตรง CHECKSUMS.json
 *   &action=diagnose  บูต Laravel แล้วแสดง error จริง (ใช้เมื่อไฟล์ครบแต่ทุกหน้า 500)
 *   &action=clear     ล้าง bootstrap/cache + compiled views + OPcache (OPcache ของ host เคยเสียจนโค้ดเพี้ยน)
 *   &action=install   ติดตั้ง release ล่าสุดจาก GitHub ใหม่ทั้งชุด (หรือ &tag=v1.0.10 เพื่อเลือกเวอร์ชัน;
 *                     ถ้าวางไฟล์ devtrin-*.zip ไว้ที่โฟลเดอร์โปรเจกต์ จะใช้ไฟล์นั้นแทนการดาวน์โหลด)
 * เวอร์ชันก่อน v1.0.11 ไม่มีไฟล์นี้ — อัปโหลด deploy/recover.php ไปที่ <โปรเจกต์>/public/recover.php
 */

declare(strict_types=1);

header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex');
@set_time_limit(600);
ignore_user_abort(true);

$base = dirname(__DIR__);
$env = parseEnv("{$base}/.env");
date_default_timezone_set($env['APP_TIMEZONE'] ?? 'Asia/Bangkok');

$key = (string) ($env['MAINTENANCE_TOKEN'] ?? '');
if ($key === '' || ! hash_equals($key, (string) ($_GET['key'] ?? ''))) {
    http_response_code(404);
    exit("Not Found\n");
}

$action = $_GET['action'] ?? 'check';
say('Devtrin recovery — '.date('Y-m-d H:i:s'));
say("โปรเจกต์: {$base}");
say('PHP '.PHP_VERSION.' · ZipArchive: '.(class_exists(ZipArchive::class) ? 'มี' : 'ไม่มี').' · curl: '.(function_exists('curl_init') ? 'มี' : 'ไม่มี'));
say('เวอร์ชันที่ติดตั้ง: '.trim((string) @file_get_contents("{$base}/VERSION")));
say('');

$problems = checkInstall($base);
say('== ตรวจไฟล์ ==');
say($problems ? 'พบปัญหา '.count($problems).' รายการ:' : 'ไฟล์ครบ ✓');
foreach (array_slice($problems, 0, 20) as $p) {
    say("  - {$p}");
}
if (count($problems) > 20) {
    say('  ... และอีก '.(count($problems) - 20).' รายการ');
}

if ($action === 'diagnose') {
    diagnose($base);
    exit;
}

if ($action === 'clear') {
    clearCaches($base);
    say('');
    say('เปิดเว็บอีกครั้ง — ถ้ายังไม่ได้ ใช้ &action=diagnose ดูสาเหตุ');
    exit;
}

if ($action !== 'install') {
    say('');
    say($problems
        ? 'แก้ได้ด้วย: เพิ่ม &action=install ต่อท้าย URL'
        : 'ไฟล์ของ release ไม่มีปัญหา — ถ้าเว็บยังเปิดไม่ได้: &action=diagnose ดูสาเหตุ, &action=clear ล้าง cache ของแอปและ OPcache');
    exit;
}

try {
    say('');
    say('== ติดตั้ง ==');
    $work = "{$base}/storage/app/recover/".date('YmdHis');
    mkdirp($work);

    $zip = localZip($base) ?? download($env, $_GET['tag'] ?? null, "{$work}/release.zip");
    say('ไฟล์ release: '.basename($zip).' ('.round(filesize($zip) / 1048576, 1).' MB)');

    $extracted = "{$work}/files";
    extractZip($zip, $extracted);
    $version = trim((string) @file_get_contents("{$extracted}/VERSION"));
    say("แตกไฟล์แล้ว: v{$version}");

    $bad = checkInstall($extracted);
    if ($bad) {
        throw new RuntimeException('ไฟล์ใน release ไม่ครบ ('.count($bad).') เช่น '.$bad[0].' — ยกเลิก ไม่แตะไฟล์ที่ใช้งานอยู่');
    }
    say('ตรวจไฟล์ใน release: ครบ ✓');

    // ปิดเว็บระหว่างสลับ (หน้า 503 แบบง่าย)
    mkdirp("{$base}/storage/framework");
    file_put_contents("{$base}/storage/framework/down", json_encode(['status' => 503, 'retry' => 60, 'template' => null, 'except' => [], 'redirect' => null, 'refresh' => null, 'secret' => null]));

    $backup = "{$base}/storage/app/recover/backup-".date('YmdHis');
    mkdirp($backup);
    foreach (array_diff(scandir($extracted), ['.', '..', '.env', 'storage']) as $item) {
        if (file_exists("{$base}/{$item}")) {
            move("{$base}/{$item}", "{$backup}/{$item}");
        }
        move("{$extracted}/{$item}", "{$base}/{$item}");
        say("  สลับ {$item}");
    }

    // ล้าง cache ที่อาจชี้ไปไฟล์เก่า (Laravel สร้างใหม่ให้เอง)
    foreach (glob("{$base}/bootstrap/cache/*.php") ?: [] as $f) {
        @unlink($f);
    }
    @unlink("{$base}/storage/framework/down");
    @unlink("{$base}/storage/framework/maintenance.php");
    // ทิ้งโค้ดที่ compile ค้างในหน่วยความจำ — อาจเป็นของไฟล์ที่เสีย
    if (function_exists('opcache_reset')) {
        @opcache_reset();
    }

    $after = checkInstall($base);
    say($after ? 'หลังสลับยังพบปัญหา: '.implode(', ', array_slice($after, 0, 5)) : 'หลังสลับ: ไฟล์ครบ ✓');
    say("ของเดิมเก็บไว้ที่: {$backup}");
    removeDir($work);
    if (str_starts_with($zip, $base.'/devtrin-')) {
        say('ลบไฟล์ '.basename($zip).' ที่อัปโหลดไว้ได้แล้ว');
    }
    say('');
    say('เสร็จ — ขั้นต่อไป: เปิด /_maintenance แล้วกด "รัน migration" และ "cache config/route/view"');
    say(is_file("{$base}/public/recover.php")
        ? '(recover.php ตัวที่มากับ release นี้พร้อมใช้ที่ /recover.php แล้ว)'
        : '(release นี้เก่ากว่า v1.0.11 จึงไม่มี recover.php — ถ้าต้องใช้อีกให้อัปโหลด deploy/recover.php)');
} catch (Throwable $e) {
    @unlink("{$base}/storage/framework/down");
    http_response_code(500);
    say('ล้มเหลว: '.$e->getMessage());
}

// ─────────────────────────────────────────────────────────────

/**
 * บูต Laravel แล้วเรียก /up ภายใน — แสดง error จริงที่ทำให้ทุกหน้าตอบ 500 ว่างเปล่า
 * (เช่น cache ใน bootstrap/cache เสีย ซึ่ง checksum ไม่ได้ตรวจเพราะ server สร้างเอง)
 */
function diagnose(string $base): void
{
    say('');
    say('== ลองบูตแอป ==');
    // error ร้ายแรงที่ catch ไม่ได้ (เช่น หน่วยความจำไม่พอ) — แสดงตอนจบสคริปต์
    register_shutdown_function(function () {
        $error = error_get_last();
        if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
            say("FATAL: {$error['message']}");
            say("  ที่ {$error['file']}:{$error['line']}");
        }
    });

    foreach (glob("{$base}/bootstrap/cache/*.php") ?: [] as $file) {
        say('cache: '.basename($file).' ('.filesize($file).' bytes, '.date('Y-m-d H:i', (int) filemtime($file)).')');
    }
    say('storage เขียนได้: '.(is_writable("{$base}/storage/logs") && is_writable("{$base}/storage/framework") ? 'ได้' : 'ไม่ได้ ✗'));
    say('bootstrap/cache เขียนได้: '.(is_writable("{$base}/bootstrap/cache") ? 'ได้' : 'ไม่ได้ ✗'));
    $opcache = function_exists('opcache_get_status') ? opcache_get_status(false) : false;
    say('OPcache: '.($opcache && ($opcache['opcache_enabled'] ?? false) ? 'เปิด' : 'ปิด'));

    try {
        require "{$base}/vendor/autoload.php";
        $app = require "{$base}/bootstrap/app.php";
        $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
        $response = $kernel->handle(Illuminate\Http\Request::create('/up', 'GET'));
        say('/up ตอบ HTTP '.$response->getStatusCode());
        // Laravel แปลง exception เป็นหน้า 500 — ดึงตัว exception จริงมาแสดง
        if (isset($response->exception) && $response->exception instanceof Throwable) {
            describe($response->exception);
        } elseif ($response->getStatusCode() < 400) {
            say('บูตได้ปกติจากสคริปต์นี้ — ถ้าหน้าเว็บยัง 500 ลอง &action=clear (OPcache ของเว็บอาจค้างโค้ดเสีย)');
        }
    } catch (Throwable $e) {
        describe($e);
    }
}

function describe(Throwable $e): void
{
    say('ERROR '.get_class($e).': '.$e->getMessage());
    say("  ที่ {$e->getFile()}:{$e->getLine()}");
    foreach (array_slice(explode("\n", $e->getTraceAsString()), 0, 8) as $line) {
        say("  {$line}");
    }
    if ($e->getPrevious()) {
        say('สาเหตุก่อนหน้า:');
        describe($e->getPrevious());
    }
}

/** ลบ cache ที่ Laravel สร้างเอง (สร้างใหม่ให้อัตโนมัติ) + ล้าง OPcache — ไม่แตะ .env และข้อมูล */
function clearCaches(string $base): void
{
    say('');
    say('== ล้าง cache ==');
    foreach (array_merge(glob("{$base}/bootstrap/cache/*.php") ?: [], glob("{$base}/storage/framework/views/*.php") ?: []) as $file) {
        say((@unlink($file) ? 'ลบ ' : 'ลบไม่ได้ ✗ ').str_replace("{$base}/", '', $file));
    }
    if (function_exists('opcache_reset')) {
        say('OPcache: '.(@opcache_reset() ? 'ล้างแล้ว' : 'host ไม่อนุญาตให้ล้าง (ให้ host restart PHP)'));
    }
}

function say(string $line): void
{
    echo $line, "\n";
    @ob_flush();
    @flush();
}

function parseEnv(string $file): array
{
    $values = [];
    foreach (@file($file, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        if (preg_match('/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/', $line, $m)) {
            $values[$m[1]] = trim($m[2], " \t\"'");
        }
    }

    return $values;
}

/** ไฟล์สำคัญ + ทุกไฟล์ใน composer classmap ต้องมีอยู่จริง */
function checkInstall(string $dir): array
{
    $problems = [];
    foreach (['artisan', 'VERSION', 'vendor/autoload.php', 'public/index.php', 'public/build/manifest.json', 'bootstrap/app.php',
        'vendor/laravel/framework/src/Illuminate/Routing/Matching/SchemeValidator.php'] as $file) {
        if (! is_file("{$dir}/{$file}")) {
            $problems[] = "ไม่มี {$file}";
        }
    }
    $classmap = "{$dir}/vendor/composer/autoload_classmap.php";
    if (is_file($classmap)) {
        // ไฟล์นี้คำนวณ path จาก __DIR__ ของตัวเอง จึงได้ path ในโฟลเดอร์ที่ตรวจอยู่เสมอ
        $map = (static fn () => require $classmap)();
        foreach ($map as $class => $file) {
            if (! is_file($file)) {
                $problems[] = "ไม่มีไฟล์ของคลาส {$class}";
            }
        }
    }
    $static = @file_get_contents("{$dir}/vendor/composer/autoload_static.php");
    if ($static !== false && preg_match_all("~__DIR__ \\. '/\\.\\.' \\. '([^']+\\.php)'~", $static, $m)) {
        foreach (array_unique($m[1]) as $path) {
            if (! is_file("{$dir}/vendor{$path}")) {
                $problems[] = "autoload_static ชี้ไปไฟล์ที่ไม่มี: vendor{$path}";
            }
        }
    }

    // เนื้อหาทุกไฟล์ต้องตรงกับตอน build (CHECKSUMS.json มีตั้งแต่ v1.0.7) — ไฟล์บน host เคยเพี้ยนทีละตัวอักษร
    $manifest = json_decode((string) @file_get_contents("{$dir}/CHECKSUMS.json"), true);
    foreach ($manifest['files'] ?? [] as $relative => $hash) {
        $path = "{$dir}/{$relative}";
        if (is_file($path) && hash_file($manifest['algo'] ?? 'xxh128', $path) !== $hash) {
            $problems[] = "เนื้อหาไม่ตรงกับ release: {$relative}";
        }
    }

    return $problems;
}

function localZip(string $base): ?string
{
    $zips = glob("{$base}/devtrin-*.zip") ?: [];
    rsort($zips);

    return $zips[0] ?? null;
}

function download(array $env, ?string $tag, string $to): string
{
    $repo = $env['GITHUB_REPO'] ?? 'trindev/devtrin';
    $token = $env['GITHUB_TOKEN'] ?? '';
    if ($token === '') {
        throw new RuntimeException('ไม่มี GITHUB_TOKEN ใน .env — ตั้งค่า หรือวางไฟล์ devtrin-*.zip ไว้ที่โฟลเดอร์โปรเจกต์แทน');
    }
    $api = "https://api.github.com/repos/{$repo}/releases/".($tag ? 'tags/'.rawurlencode($tag) : 'latest');
    $release = json_decode(http($api, $token, 'application/vnd.github+json'), true);
    $asset = null;
    foreach ($release['assets'] ?? [] as $a) {
        if (preg_match('/^devtrin-.*\.zip$/', $a['name'])) {
            $asset = $a;
        }
    }
    if (! $asset) {
        throw new RuntimeException('ไม่พบไฟล์ zip ใน release '.($release['tag_name'] ?? $tag ?? 'latest'));
    }
    say('ดาวน์โหลด '.$release['tag_name'].' ...');
    file_put_contents($to, http($asset['url'], $token, 'application/octet-stream'));

    return $to;
}

function http(string $url, string $token, string $accept): string
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 300,
        CURLOPT_USERAGENT => 'devtrin-recover',
        CURLOPT_HTTPHEADER => ["Authorization: Bearer {$token}", "Accept: {$accept}", 'X-GitHub-Api-Version: 2022-11-28'],
        // curl ไม่ส่ง Authorization ต่อเมื่อ redirect ไป host อื่น (ไฟล์จริงอยู่บน S3 ที่ใช้ signed URL)
        CURLOPT_UNRESTRICTED_AUTH => false,
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($body === false || $status >= 400) {
        throw new RuntimeException("GitHub ตอบ HTTP {$status} {$error}");
    }

    return $body;
}

function extractZip(string $zipPath, string $to): void
{
    $zip = new ZipArchive;
    if ($zip->open($zipPath) !== true) {
        throw new RuntimeException('เปิดไฟล์ zip ไม่ได้');
    }
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        if (str_contains($name, '..') || str_starts_with($name, '/')) {
            throw new RuntimeException("พบ path ไม่ปลอดภัยใน zip: {$name}");
        }
    }
    mkdirp($to);
    if (! $zip->extractTo($to)) {
        throw new RuntimeException('แตก zip ไม่สำเร็จ');
    }
    $zip->close();
}

function move(string $from, string $to): void
{
    if (! @rename($from, $to)) {
        throw new RuntimeException("ย้าย {$from} → {$to} ไม่ได้ (สิทธิ์ไฟล์?)");
    }
}

function removeDir(string $dir): void
{
    if (! is_dir($dir)) {
        return;
    }
    $items = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($items as $item) {
        $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
    }
    @rmdir($dir);
}

function mkdirp(string $dir): void
{
    if (! is_dir($dir) && ! @mkdir($dir, 0775, true) && ! is_dir($dir)) {
        throw new RuntimeException("สร้างโฟลเดอร์ {$dir} ไม่ได้");
    }
}
