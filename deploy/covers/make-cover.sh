#!/usr/bin/env bash
# ทำรูปปกโปรเจกต์จากหน้าเว็บจริง: ถ่ายหน้าจอ (จอคอม + มือถือ) ด้วย Chrome headless แล้วจัดวางเป็นปก 1600x1000 (.webp)
# ใช้: bash deploy/covers/make-cover.sh <slug> <สีประจำโปรเจกต์ #rrggbb> [url]
#   เช่น bash deploy/covers/make-cover.sh staycool '#16a3a3'
# ผลลัพธ์: covers/<slug>.webp → อัปโหลดที่ /admin/projects ปุ่ม "อัปโหลดปกหลายรูป" (ชื่อไฟล์ = slug)
# ต้องมี: Google Chrome และ cwebp (brew install webp)
set -euo pipefail

SLUG="${1:?ใส่ slug}"; ACCENT="${2:?ใส่สี #rrggbb}"; URL="${3:-https://$SLUG.devtrin.com}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${TMPDIR:-/tmp}/devtrin-covers"; mkdir -p "$WORK/profile" "$ROOT/covers"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
MOBILE_UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"

shoot() { # width height scale out [user-agent]
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir="$WORK/profile" \
        --window-size="$1,$2" --force-device-scale-factor="$3" --virtual-time-budget=9000 --lang=th-TH \
        ${5:+--user-agent="$5"} --screenshot="$4" "$URL" >/dev/null 2>&1
}
shoot 1440 900 1.5 "$WORK/$SLUG-desktop.png"
shoot 390 844 3 "$WORK/$SLUG-mobile.png" "$MOBILE_UA"

HOST="$(echo "$URL" | sed -E 's#^https?://##; s#/.*$##')"
sed -e "s|{{ACCENT}}|$ACCENT|g" -e "s|{{HOST}}|$HOST|g" \
    -e "s|{{DESKTOP}}|file://$WORK/$SLUG-desktop.png|g" -e "s|{{MOBILE}}|file://$WORK/$SLUG-mobile.png|g" \
    "$ROOT/deploy/covers/cover.tpl.html" > "$WORK/$SLUG.html"

"$CHROME" --headless=new --hide-scrollbars --user-data-dir="$WORK/profile" --allow-file-access-from-files \
    --window-size=1600,1000 --force-device-scale-factor=1 --virtual-time-budget=3000 \
    --screenshot="$WORK/$SLUG-cover.png" "file://$WORK/$SLUG.html" >/dev/null 2>&1
cwebp -quiet -q 84 "$WORK/$SLUG-cover.png" -o "$ROOT/covers/$SLUG.webp"
echo "$ROOT/covers/$SLUG.webp ($(du -h "$ROOT/covers/$SLUG.webp" | cut -f1))"
