import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ClassicLevel } from '/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/browser/scripts/node_modules/classic-level/index.js'

const ORIGIN = 'https://hkipo-dashboard.vercel.app'
const DATA_KEY = 'hkipo-dashboard:data:v3'
const SESSION_KEY = 'hkipo-dashboard:supabase-session:v1'
const SUPABASE_URL = 'https://ffiouukcirgberzmuzwu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wxlsy8Hy4p_b1djUgdmJmw_-FL3GLq-'
const TABLE_NAME = 'public.user_data'

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

function printStep(index, title, result) {
  console.log(`${index}. ${title}`)
  console.log(`   ${result}`)
}

async function readBrowserData() {
  const source = path.join(
    os.homedir(),
    'Library/Application Support/Google/Chrome/Default/Local Storage/leveldb',
  )
  const target = path.join(os.tmpdir(), `hkipo-sync-diagnose-${Date.now()}`)
  fs.cpSync(source, target, { recursive: true })
  const db = new ClassicLevel(target, {
    keyEncoding: 'buffer',
    valueEncoding: 'buffer',
    readOnly: true,
  })
  await db.open()
  try {
    const data = JSON.parse(
      decodeLocalStorageValue(await db.get(localStorageKey(DATA_KEY))),
    )
    const session = JSON.parse(
      decodeLocalStorageValue(await db.get(localStorageKey(SESSION_KEY))),
    )
    return { data, session }
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
      result.error_description ?? result.msg ?? '刷新登录状态失败',
    )
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

async function writeSupabase(session, data) {
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
  if (!response.ok) throw new Error(text || `写入失败：${response.status}`)
  return JSON.parse(text)[0]
}

async function readSupabase(session) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/user_data?select=data,updated_at&user_id=eq.${encodeURIComponent(
      session.user.id,
    )}&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )
  const text = await response.text()
  if (!response.ok) throw new Error(text || `读取失败：${response.status}`)
  return JSON.parse(text)[0]
}

let lostAt = ''
let testRecordId = ''

try {
  const { data, session } = await readBrowserData()
  if (!session?.accessToken || !session?.refreshToken || !session?.user?.id) {
    throw new Error('没有找到有效同步登录状态')
  }

  const before = summarize(data)
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  testRecordId = `sync-test-${crypto.randomUUID()}`
  const testRecord = {
    id: testRecordId,
    name: `同步测试-${now.slice(5, 16).replace('T', ' ')}`,
    stockCode: 'SYNC',
    issuePrice: 0.01,
    lotSize: 1,
    subscriptionDate: today,
    listingDate: today,
    industry: '同步诊断',
    createdAt: now,
    updatedAt: now,
  }
  const nextData = { ...data, ipos: [testRecord, ...(data.ipos ?? [])] }
  const after = summarize(nextData)

  printStep(
    1,
    '电脑新增一条测试记录',
    `成功。记录ID：${testRecordId}；新增前 ${before.ipos} 只新股，新增后 ${after.ipos} 只新股。`,
  )

  const activeSession = await refreshSessionIfNeeded(session)
  lostAt = '写入 Supabase'
  const saved = await writeSupabase(activeSession, nextData)
  const savedHasRecord = saved.data?.ipos?.some(
    (item) => item.id === testRecordId,
  )
  if (!savedHasRecord) throw new Error('Supabase 返回结果中没有测试记录')
  printStep(
    2,
    '检查是否成功写入 Supabase',
    `成功。updated_at：${saved.updated_at}`,
  )

  printStep(3, 'Supabase 表名', TABLE_NAME)
  printStep(4, '新增记录ID', testRecordId)

  lostAt = '读取 Supabase'
  const fetched = await readSupabase(activeSession)
  const remote = fetched.data
  const remoteHasRecord = remote?.ipos?.some(
    (item) => item.id === testRecordId,
  )
  if (!remoteHasRecord) throw new Error('Supabase 读回数据中没有测试记录')
  printStep(
    5,
    '手机端查询同一条记录的云端依据',
    `云端可读到该记录。云端当前：${remote.accounts.length} 账户 / ${remote.ipos.length} 新股 / ${remote.subscriptions.length} 申购 / ${remote.sales.length} 卖出。手机若仍看不到，丢失点在手机读取后未覆盖本机缓存。`,
  )
  printStep(6, '在哪一步丢失', '未在电脑写入或云端读回阶段丢失。')
} catch (error) {
  console.log('')
  console.log('检查失败')
  console.log(`记录ID：${testRecordId || '尚未生成'}`)
  console.log(`丢失步骤：${lostAt || '读取电脑本机数据/登录状态'}`)
  console.log(`错误：${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
