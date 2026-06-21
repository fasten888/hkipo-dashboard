import fs from 'node:fs'
import path from 'node:path'
import { ClassicLevel } from '/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/browser/scripts/node_modules/classic-level/index.js'

const [databasePath, recoveryFile] = process.argv.slice(2)

if (!databasePath || !recoveryFile) {
  throw new Error('缺少浏览器数据库或恢复文件路径')
}

const data = JSON.parse(fs.readFileSync(recoveryFile, 'utf8'))
const origin = 'https://hkipo-dashboard.vercel.app'
const key = (name) =>
  Buffer.from(`_${origin}\u0000\u0001${name}`, 'utf8')
const value = (input) =>
  Buffer.concat([
    Buffer.from([0]),
    Buffer.from(JSON.stringify(input), 'utf16le'),
  ])

const database = new ClassicLevel(databasePath, {
  keyEncoding: 'buffer',
  valueEncoding: 'buffer',
})

await database.open()
await database.put(key('hkipo-dashboard:data:v3'), value(data))
await database.del(key('hkipo-dashboard:supabase-session:v1'))
await database.del(key('hkipo-dashboard:supabase-sync-meta:v1'))
await database.close()

const verification = new ClassicLevel(databasePath, {
  keyEncoding: 'buffer',
  valueEncoding: 'buffer',
  readOnly: true,
})
await verification.open()
const stored = await verification.get(key('hkipo-dashboard:data:v3'))
await verification.close()

const restored = JSON.parse(stored.subarray(1).toString('utf16le'))
console.log(
  JSON.stringify({
    accounts: restored.accounts.length,
    ipos: restored.ipos.length,
    subscriptions: restored.subscriptions.length,
    sales: restored.sales.length,
  }),
)
