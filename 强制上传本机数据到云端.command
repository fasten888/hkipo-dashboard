#!/bin/zsh

cd "/Users/a24389/Documents/HKIPO-Dashboard" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

echo "正在把电脑本机数据强制上传到云端..."
echo "不会删除本机数据。"
echo

node scripts/force-upload-local-data-to-cloud.mjs
RESULT=$?

echo
if [ "$RESULT" -eq 0 ]; then
  echo "完成。请在手机端重新打开网页，登录同一账号后选择：使用云端数据。"
else
  echo "上传没有完成。请把上面的错误截图发给我。"
fi

echo
read -k 1 "?按任意键关闭..."
