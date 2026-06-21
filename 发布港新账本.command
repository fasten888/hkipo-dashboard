#!/bin/zsh

cd "/Users/a24389/Documents/HKIPO-Dashboard" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

echo "正在检查并发布港新账本线上版本..."
echo

LOG_FILE="vercel-deploy-latest.log"
INFO_FILE="vercel-deployment-info.txt"
rm -f "$LOG_FILE" "$INFO_FILE"

npm run build || {
  echo
  echo "构建失败，线上版本未修改。"
  read -k 1 "?按任意键关闭..."
  exit 1
}

npm run lint || {
  echo
  echo "代码检查失败，线上版本未修改。"
  read -k 1 "?按任意键关闭..."
  exit 1
}

npx --yes vercel@latest --prod --yes 2>&1 | tee "$LOG_FILE"
DEPLOY_STATUS=${pipestatus[1]}
if [ "$DEPLOY_STATUS" -ne 0 ]; then
  echo
  echo "发布失败，请检查网络或 Vercel 登录状态。"
  read -k 1 "?按任意键关闭..."
  exit 1
fi

PRODUCTION_URL=$(grep -Eo 'https://[^ ]+vercel\.app' "$LOG_FILE" | tail -1)
INSPECT_URL=$(grep -Eo 'https://vercel\.com/[^ ]+' "$LOG_FILE" | head -1)

{
  echo "projectName=hkipo-dashboard"
  echo "projectId=prj_ezKcS2TVTxHgfcqmyw0QDvGuys4a"
  echo "orgId=team_qigFoOGjOh3v0HwaDgf9c09d"
  echo "productionUrl=${PRODUCTION_URL:-https://hkipo-dashboard.vercel.app}"
  echo "inspectUrl=${INSPECT_URL}"
  echo
  echo "vercel output:"
  cat "$LOG_FILE"
} > "$INFO_FILE"

if [ -n "$PRODUCTION_URL" ]; then
  echo
  echo "正在读取 deployment id..."
  npx --yes vercel@latest inspect "$PRODUCTION_URL" 2>&1 | tee -a "$INFO_FILE"
fi

echo
echo "发布完成：https://hkipo-dashboard.vercel.app"
echo "部署记录：/Users/a24389/Documents/HKIPO-Dashboard/$INFO_FILE"
open "https://hkipo-dashboard.vercel.app"
read -k 1 "?按任意键关闭..."
