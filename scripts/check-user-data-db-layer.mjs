import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ClassicLevel } from '/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/browser/scripts/node_modules/classic-level/index.js'

const ORIGIN = 'https://hkipo-dashboard.vercel.app'
const DATA_KEY = 'hkipo-dashboard:data:v3'
const SESSION_KEY = 'hkipo-dashboard:supabase-session:v1'
const SUPABASE_URL = 'https://ffiouukcirgberzmuzwu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wxlsy8Hy4p_b1djUgdmJmw_-FL3GLq-'
const USER_ID = '14b8533d-8246-4469-906b-bb6df57bcb6c'
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
  const target = path.join(os.tmpdir(), `hkipo-db-layer-${Date.now()}`)
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

function countWins(data) {
  return data?.subscriptions?.filter((item) => item.status === 'won').length ?? 0
}

function countHuajianWins(data) {
  const targetIpoIds = new Set(
    (data?.ipos ?? [])
      .filter((ipo) => ipo.name?.includes(TARGET_NAME))
      .map((ipo) => ipo.id),
  )
  return (data?.subscriptions ?? []).filter(
    (item) => targetIpoIds.has(item.ipoId) && item.status === 'won',
  ).length
}

function countRows(data) {
  return {
    keys: data ? Object.keys(data) : [],
    ipos: data?.ipos?.length ?? 0,
    subscriptions: data?.subscriptions?.length ?? 0,
    applications: Array.isArray(data?.applications)
      ? data.applications.length
      : null,
    subscriptionRecords: Array.isArray(data?.subscriptionRecords)
      ? data.subscriptionRecords.length
      : null,
    wins: countWins(data),
    huajianWins: countHuajianWins(data),
    sales: data?.sales?.length ?? 0,
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

function authHeaders(session) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
  }
}

async function queryUserDataRows(session) {
  const selectWithId = 'id,user_id,data,updated_at'
  const selectWithoutId = 'user_id,data,updated_at'
  const buildUrl = (select) =>
    `${SUPABASE_URL}/rest/v1/user_data?select=${select}&user_id=eq.${encodeURIComponent(
      USER_ID,
    )}&order=updated_at.desc`

  let response = await fetch(buildUrl(selectWithId), {
    cache: 'no-store',
    headers: {
      ...authHeaders(session),
      Prefer: 'count=exact',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  })
  let text = await response.text()
  let hasIdColumn = true

  if (!response.ok && /column .*id|does not exist|42703/i.test(text)) {
    hasIdColumn = false
    response = await fetch(buildUrl(selectWithoutId), {
      cache: 'no-store',
      headers: {
        ...authHeaders(session),
        Prefer: 'count=exact',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })
    text = await response.text()
  }

  if (!response.ok) {
    throw new Error(text || `查询 user_data 失败：${response.status}`)
  }

  const rows = JSON.parse(text)
  const contentRange = response.headers.get('content-range')
  const exactCount = contentRange?.split('/')[1]
  return {
    hasIdColumn,
    rowCount:
      exactCount && exactCount !== '*'
        ? Number.parseInt(exactCount, 10)
        : rows.length,
    rows,
  }
}

async function uploadCurrentData(session, data) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/user_data?on_conflict=user_id`,
    {
      method: 'POST',
      cache: 'no-store',
      headers: {
        ...authHeaders(session),
        Prefer: 'resolution=merge-duplicates,return=representation',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      body: JSON.stringify({
        user_id: USER_ID,
        data,
        updated_at: new Date().toISOString(),
      }),
    },
  )
  const text = await response.text()
  if (!response.ok) {
    throw new Error(text || `上传失败：${response.status}`)
  }
  return JSON.parse(text)
}

function printableRows(rows, hasIdColumn) {
  return rows.map((row, index) => ({
    order: index + 1,
    recordId: hasIdColumn ? row.id : row.user_id,
    userId: row.user_id,
    updatedAt: row.updated_at,
    databaseCounts: countRows(row.data),
  }))
}

function print(title, value) {
  console.log(`\n=== ${title} ===`)
  console.log(JSON.stringify(value, null, 2))
}

const { data, session: storedSession } = await readBrowserLocalStorage()

if (storedSession.user?.id !== USER_ID) {
  console.log(`当前浏览器登录用户ID：${storedSession.user?.id}`)
  console.log(`脚本检查用户ID：${USER_ID}`)
  throw new Error('浏览器登录用户和脚本检查用户不一致，停止上传。')
}

const session = await refreshSessionIfNeeded(storedSession)

print('0. 上传前本机 payload', {
  userId: USER_ID,
  uploadDataKeys: Object.keys(data),
  uploadDataLengths: countRows(data),
})

const before = await queryUserDataRows(session)
const beforeRows = printableRows(before.rows, before.hasIdColumn)
const beforeSelected = before.rows[0] ?? null

print('1. 上传前数据库记录', {
  userId: USER_ID,
  actualRecordCount: before.rowCount,
  hasIdColumn: before.hasIdColumn,
  rows: beforeRows,
  selectedReadRecordId: beforeRows[0]?.recordId ?? null,
  selectedReadUpdatedAt: beforeRows[0]?.updatedAt ?? null,
  selectedDatabaseWinCount: beforeSelected ? countWins(beforeSelected.data) : null,
})

const uploadedRows = await uploadCurrentData(session, data)
const uploadedRow = uploadedRows[0] ?? null

print('2. 上传接口返回记录', {
  returnedRows: uploadedRows.length,
  updatedRecordId:
    uploadedRow?.id ?? uploadedRow?.user_id ?? '(返回中没有 id/user_id)',
  updatedAt: uploadedRow?.updated_at ?? null,
  returnedDatabaseCounts: uploadedRow ? countRows(uploadedRow.data) : null,
})

const after = await queryUserDataRows(session)
const afterRows = printableRows(after.rows, after.hasIdColumn)
const afterSelected = after.rows[0] ?? null

print('3. 上传后数据库记录', {
  userId: USER_ID,
  actualRecordCount: after.rowCount,
  hasIdColumn: after.hasIdColumn,
  rows: afterRows,
  selectedReadRecordId: afterRows[0]?.recordId ?? null,
  selectedReadUpdatedAt: afterRows[0]?.updatedAt ?? null,
  selectedDatabaseWinCount: afterSelected ? countWins(afterSelected.data) : null,
})

print('4. A/B 记录判断', {
  uploadedRecordId:
    uploadedRow?.id ?? uploadedRow?.user_id ?? '(返回中没有 id/user_id)',
  readRecordId: afterRows[0]?.recordId ?? null,
  uploadedAndReadSameRecord:
    (uploadedRow?.id ?? uploadedRow?.user_id ?? null) ===
    (afterRows[0]?.recordId ?? null),
  beforeDatabaseWinCount: beforeSelected ? countWins(beforeSelected.data) : null,
  afterDatabaseWinCount: afterSelected ? countWins(afterSelected.data) : null,
  expectedUploadedWinCount: countWins(data),
  huajianWinsInAfterDatabase: afterSelected
    ? countHuajianWins(afterSelected.data)
    : null,
})
