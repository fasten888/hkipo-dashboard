import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ClassicLevel } from '/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/browser/scripts/node_modules/classic-level/index.js'

const ORIGIN = 'https://hkipo-dashboard.vercel.app'
const DATA_KEY = 'hkipo-dashboard:data:v3'
const SESSION_KEY = 'hkipo-dashboard:supabase-session:v1'
const SUPABASE_URL = 'https://ffiouukcirgberzmuzwu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wxlsy8Hy4p_b1djUgdmJmw_-FL3GLq-'

function localStorageKey(name) {
  return Buffer.from(`_${ORIGIN}\u0000\u0001${name}`, 'utf8')
}

function decodeLocalStorageValue(value) {
  if (value[0] === 0) return value.subarray(1).toString('utf16le')
  if (value[0] === 1) return value.subarray(1).toString('utf8')
  return value.toString('utf8')
}

function summarize(data) {
  return {
    accounts: data.accounts?.length ?? 0,
    ipos: data.ipos?.length ?? 0,
    subscriptions: data.subscriptions?.length ?? 0,
    sales: data.sales?.length ?? 0,
  }
}

async function readBrowserLocalStorage() {
  const source = path.join(
    os.homedir(),
    'Library/Application Support/Google/Chrome/Default/Local Storage/leveldb',
  )
  const target = path.join(
    os.tmpdir(),
    `hkipo-cloud-upload-${Date.now()}`,
    'leveldb',
  )
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.cpSync(source, target, { recursive: true })

  const db = new ClassicLevel(target, {
    keyEncoding: 'buffer',
    valueEncoding: 'buffer',
    readOnly: true,
  })
  await db.open()
  try {
    const [dataValue, sessionValue] = await Promise.all([
      db.get(localStorageKey(DATA_KEY)),
      db.get(localStorageKey(SESSION_KEY)),
    ])
    return {
      data: JSON.parse(decodeLocalStorageValue(dataValue)),
      session: JSON.parse(decodeLocalStorageValue(sessionValue)),
    }
  } finally {
    await db.close()
  }
}

async function refreshSessionIfNeeded(session) {
  if (session.expiresAt > Date.now() + 60_000) return session

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    },
  )
  const result = await response.json()
  if (!response.ok) {
    throw new Error(
      result.error_description ?? result.msg ?? '刷新同步登录状态失败',
    )
  }
  if (!result.access_token || !result.refresh_token || !result.user?.id) {
    throw new Error('Supabase 没有返回有效登录会话')
  }
  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000,
    user: {
      id: result.user.id,
      email: result.user.email ?? session.user?.email ?? '',
    },
  }
}

async function uploadData(session, data) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/user_data?on_conflict=user_id`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        user_id: session.user.id,
        data,
        updated_at: new Date().toISOString(),
      }),
    },
  )
  const text = await response.text()
  if (!response.ok) {
    throw new Error(text || `上传失败（${response.status}）`)
  }
  return JSON.parse(text)
}

const { data, session } = await readBrowserLocalStorage()
const counts = summarize(data)

if (!session?.accessToken || !session?.refreshToken || !session?.user?.id) {
  throw new Error('没有找到有效的云同步登录状态，请先在网页里登录同步账号。')
}

console.log('准备上传电脑本机数据到云端：')
console.log(`账户 ${counts.accounts}`)
console.log(`新股 ${counts.ipos}`)
console.log(`申购 ${counts.subscriptions}`)
console.log(`卖出 ${counts.sales}`)
console.log('')

const activeSession = await refreshSessionIfNeeded(session)
const rows = await uploadData(activeSession, data)
const updatedAt = rows?.[0]?.updated_at ?? new Date().toISOString()

console.log('上传成功。')
console.log(`云端更新时间：${new Date(updatedAt).toLocaleString('zh-CN')}`)
console.log('现在手机端重新打开网页，登录同一账号后选择“使用云端数据”。')
