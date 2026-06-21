#!/bin/zsh

cd "/Users/a24389/Documents/HKIPO-Dashboard" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

echo "正在运行港新账本同步诊断..."
echo

node scripts/diagnose-cloud-sync.mjs
RESULT=$?

echo
if [ "$RESULT" -eq 0 ]; then
  echo "诊断完成。请把上面的 1-6 步结果发给我，或在手机端搜索“同步测试”。"
else
  echo "诊断失败。请把上面的错误截图发给我。"
fi

echo
read -k 1 "?按任意键关闭..."
