#!/bin/zsh

cd "/Users/a24389/Documents/HKIPO-Dashboard" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

echo "正在启动港新账本..."
echo "启动成功后请访问：http://localhost:5173"
echo "此窗口保持开启时，本地网址可以正常访问。"
echo

npm run dev -- --host 0.0.0.0 --port 5173 &
server_pid=$!

sleep 3
open "http://localhost:5173/#/dashboard"

wait "$server_pid"
