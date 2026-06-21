import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ClassicLevel } from '/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/browser/scripts/node_modules/classic-level/index.js'

const ORIGIN = 'https://hkipo-dashboard.vercel.app'
const DATA_KEY = 'hkipo-dashboard:data:v3'
const SESSION_KEY = 'hkipo-dashboard:supabase-session:v1'
const SUPABASE_URL = 'https://ffiouukcirgberzmuzwu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wxlsy8Hy4p_b1djUgdmJmw_-FL3GLq-'
const TARGET_NAME = '华健未来-B'

function localStorageKey(name) {
  return Buffer.from(`_${ORIGIN}\u0000\u0001${name}`, 'utf8')
}

function decodeLocalStorageValue(value) {
  if (value[0] === 0) return value.subarray(1).toString('utf16le')
  if (value[0] === 1) return value.subarray(1).toString('utf8')
  return value.toString('utf8')
}

async function readBrowserLocalStorage() {
  const source = path.join(
    os.homedir(),
    'Library/Application Support/Google/Chrome/Default/Local Storage/leveldb',
  )
  const target = path.join(os.tmpdir(), `hkipo-trace-huajian-${Date.now()}`)
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

function summarize(data) {
  return {
    accounts: data.accounts?.length ?? 0,
    ipos: data.ipos?.length ?? 0,
    subscriptions: data.subscriptions?.length ?? 0,
    wonSubscriptions:
      data.subscriptions?.filter((item) => item.status === 'won').length ?? 0,
    sales: data.sales?.length ?? 0,
  }
}

function findTarget(data) {
  const ipos = data.ipos ?? []
  const subscriptions = data.subscriptions ?? []
  const targetIpos = ipos.filter((ipo) => ipo.name?.includes(TARGET_NAME))
  const targetIpoIds = new Set(targetIpos.map((ipo) => ipo.id))
  const targetSubscriptions = subscriptions.filter((subscription) =>
    targetIpoIds.has(subscription.ipoId),
  )
  const targetWinningSubscriptions = targetSubscriptions.filter(
    (subscription) => subscription.status === 'won',
  )
  return {
    exists: targetIpos.length > 0,
    ipos: targetIpos.map((ipo) => ({
      id: ipo.id,
      name: ipo.name,
      stockCode: ipo.stockCode,
      listingDate: ipo.listingDate,
      updatedAt: ipo.updatedAt,
    })),
    subscriptions: targetSubscriptions.map((subscription) => ({
      id: subscription.id,
      accountId: subscription.accountId,
      ipoId: subscription.ipoId,
      status: subscription.status,
      allottedShares: subscription.allottedShares,
      allottedLots: subscription.allottedLots,
      updatedAt: subscription.updatedAt,
    })),
    winningCount: targetWinningSubscriptions.length,
  }
}

function printSection(title, data) {
  console.log(`\n=== ${title} ===`)
  console.log(JSON.stringify(data, null, 2))
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

async function readSupabase(session) {
  const query = `/rest/v1/user_data?select=user_id,data,updated_at&user_id=eq.${encodeURIComponent(
    session.user.id,
  )}&order=updated_at.desc&limit=10`
  const response = await fetch(`${SUPABASE_URL}${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
    },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(text || `读取 Supabase 失败：${response.status}`)
  const rows = JSON.parse(text)
  const contentRange = response.headers.get('content-range')
  const exactCount = contentRange?.split('/')[1]
  return {
    query,
    rowCount:
      exactCount && exactCount !== '*'
        ? Number.parseInt(exactCount, 10)
        : rows.length,
    rows,
    selected: rows[0] ?? null,
  }
}

const { data: localData, session: localSession } = await readBrowserLocalStorage()

printSection('1. 本地数据', {
  counts: summarize(localData),
  target: findTarget(localData),
})

const uploadPayload = {
  user_id: localSession.user?.id,
  data: localData,
  updated_at: new Date().toISOString(),
}

printSection('2. 上传 payload', {
  userId: uploadPayload.user_id,
  updatedAt: uploadPayload.updated_at,
  counts: summarize(uploadPayload.data),
  target: findTarget(uploadPayload.data),
  containsAllotmentsArray: Array.isArray(uploadPayload.data.allotments),
  containsResultsArray: Array.isArray(uploadPayload.data.results),
  containsWinningRecordsArray: Array.isArray(uploadPayload.data.winningRecords),
})

try {
  const session = await refreshSessionIfNeeded(localSession)
  const remote = await readSupabase(session)
  const remoteData = remote.selected?.data
  printSection('3. Supabase 数据', {
    userId: session.user.id,
    query: remote.query,
    rowCount: remote.rowCount,
    rows: remote.rows.map((row) => ({
      user_id: row.user_id,
      updated_at: row.updated_at,
      counts: summarize(row.data),
      targetExists: findTarget(row.data).exists,
      targetWinningCount: findTarget(row.data).winningCount,
    })),
    selectedRecordId: remote.selected?.user_id ?? null,
    selectedUpdatedAt: remote.selected?.updated_at ?? null,
    selectedCounts: remoteData ? summarize(remoteData) : null,
    target: remoteData ? findTarget(remoteData) : null,
    containsIpos: Array.isArray(remoteData?.ipos),
    containsSubscriptions: Array.isArray(remoteData?.subscriptions),
    containsAllotmentsArray: Array.isArray(remoteData?.allotments),
    containsResultsArray: Array.isArray(remoteData?.results),
    containsWinningRecordsArray: Array.isArray(remoteData?.winningRecords),
  })
} catch (error) {
  printSection('3. Supabase 数据', {
    error: error instanceof Error ? error.message : String(error),
    note: '如果这里是网络错误，请在 Mac 终端运行：node scripts/trace-huajian-sync.mjs',
  })
}
