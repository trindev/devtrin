<?php

use App\Support\ReleaseIntegrity;

// สร้าง CHECKSUMS.json ให้โฟลเดอร์ release — เรียกจาก deploy/build-release.sh และ CI
// ใช้: php deploy/checksums.php <โฟลเดอร์ release>

require __DIR__.'/../app/Support/ReleaseIntegrity.php';

$dir = $argv[1] ?? '';
if (! is_dir($dir)) {
    fwrite(STDERR, "ใช้: php deploy/checksums.php <โฟลเดอร์ release>\n");
    exit(1);
}

$count = ReleaseIntegrity::write($dir);
echo "CHECKSUMS.json: {$count} ไฟล์\n";
