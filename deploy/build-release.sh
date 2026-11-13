#!/usr/bin/env bash
# สร้างไฟล์ zip พร้อมอัปโหลดขึ้น shared host (มี vendor + public/build แล้ว ไม่ต้องใช้ composer/npm บน server)
# ใช้: bash deploy/build-release.sh   → ได้ build/devtrin-v<VERSION>-<commit>.zip
set -euo pipefail

cd "$(dirname "$0")/.."
if [ -n "$(git status --porcelain)" ]; then
    echo "มีไฟล์ที่ยังไม่ commit — commit ก่อนเพื่อให้ release ตรงกับ git" >&2
    exit 1
fi

COMMIT=$(git rev-parse --short HEAD)
VERSION=$(tr -d '[:space:]' < VERSION)
OUT="build/release-$COMMIT"
rm -rf "$OUT" && mkdir -p "$OUT"

git archive HEAD | tar -x -C "$OUT"
(
    cd "$OUT"
    composer install --no-dev --optimize-autoloader --no-interaction --quiet
    npm ci --silent
    npm run build --silent
    # เครื่องมือกู้เว็บที่ไม่ใช้ Laravel — มาพร้อมทุก release จึงใช้ได้ทันทีแม้ทุกหน้า 500 (ป้องกันด้วย MAINTENANCE_TOKEN)
    cp deploy/recover.php public/recover.php
    rm -rf node_modules tests .github deploy phpunit.xml .editorconfig
    mkdir -p storage/app/public storage/framework/{cache/data,sessions,views} storage/logs bootstrap/cache
    echo "$COMMIT" > REVISION
)
# checksum ทุกไฟล์ — ตัวอัปเดต/recover.php ตรวจก่อนสลับไฟล์ และหน้า doctor ตรวจไฟล์ที่ติดตั้งอยู่
php deploy/checksums.php "$OUT"

(cd "$OUT" && zip -qr "../devtrin-v$VERSION-$COMMIT.zip" . -x '.env')
rm -rf "$OUT"
echo "สร้างแล้ว: build/devtrin-v$VERSION-$COMMIT.zip"
