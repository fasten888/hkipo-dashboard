#!/bin/zsh

set -e

PROJECT="/Users/a24389/Documents/HKIPO-Dashboard"
CHROME_DATA="$HOME/Library/Application Support/Google/Chrome/Default/Local Storage/leveldb"
RECOVERY="$PROJECT/recovery/HKIPO_RECOVERED_APP_DATA.json"
STAMP="$(date +%Y%m%d-%H%M%S)"
SAFETY_COPY="$PROJECT/recovery/before-restore-$STAMP"

cd "$PROJECT"
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

echo "即将恢复：12 个账户、19 只新股、163 条申购、24 条卖出。"
echo "正在关闭 Chrome，并创建恢复前保险副本..."

osascript -e 'tell application "Google Chrome" to quit' >/dev/null 2>&1 || true

for _ in {1..20}; do
  if ! lsof "$CHROME_DATA/LOCK" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if lsof "$CHROME_DATA/LOCK" >/dev/null 2>&1; then
  echo "Chrome 尚未完全关闭，请关闭 Chrome 后重新双击此文件。"
  read -k 1 "?按任意键关闭..."
  exit 1
fi

mkdir -p "$SAFETY_COPY"
cp -R "$CHROME_DATA/." "$SAFETY_COPY/"

node "$PROJECT/scripts/restore-browser-data.mjs" "$CHROME_DATA" "$RECOVERY"

echo
echo "恢复成功。云同步已暂时退出，避免旧云端再次覆盖。"
echo "正在重新打开港新账本..."
open -a "Google Chrome" "https://hkipo-dashboard.vercel.app"
read -k 1 "?按任意键关闭..."
