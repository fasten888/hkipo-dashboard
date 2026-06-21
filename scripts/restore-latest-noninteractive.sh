#!/bin/zsh

set -e

PROJECT="/Users/a24389/Documents/HKIPO-Dashboard"
CHROME_DATA="$HOME/Library/Application Support/Google/Chrome/Default/Local Storage/leveldb"
RECOVERY="$PROJECT/recovery/HKIPO_RECOVERED_APP_DATA.json"
STAMP="$(date +%Y%m%d-%H%M%S)"
SAFETY_COPY="$PROJECT/recovery/before-restore-$STAMP"

osascript -e 'tell application "Google Chrome" to quit' >/dev/null 2>&1 || true

for _ in {1..20}; do
  if ! lsof "$CHROME_DATA/LOCK" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if lsof "$CHROME_DATA/LOCK" >/dev/null 2>&1; then
  echo "Chrome 尚未完全关闭，请手动关闭 Chrome 后重试。"
  exit 1
fi

mkdir -p "$SAFETY_COPY"
cp -R "$CHROME_DATA/." "$SAFETY_COPY/"

/usr/local/bin/node "$PROJECT/scripts/restore-browser-data.mjs" \
  "$CHROME_DATA" \
  "$RECOVERY"

open -a "Google Chrome" "https://hkipo-dashboard.vercel.app"
