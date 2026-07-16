import { execFile } from 'node:child_process'
import process from 'node:process'

const baseUrl = process.env.APP_URL ?? 'https://hkipo-dashboard.vercel.app'
const url = new URL('/clear-sw-cache.html', baseUrl).toString()
const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]

execFile(command, args, (error) => {
  if (error) {
    console.error(`无法自动打开 ${url}`)
    process.exitCode = 1
    return
  }
  console.log(`已打开缓存清理页：${url}`)
})
