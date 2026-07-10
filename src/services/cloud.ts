import type {
  CloudFetchDebug,
  CloudSession,
  CloudSnapshot,
  CloudUser,
} from '../types/cloud'
import type { AppData } from '../types/store'
import { normalizeAppData } from './storage'
import { safeSetLocalStorageItem } from './storageMaintenance'

const SESSION_KEY = 'hkipo-dashboard:supabase-session:v1'
const SYNC_META_KEY = 'hkipo-dashboard:supabase-sync-meta:v1'

const DEFAULT_SUPABASE_URL = 'https://ffiouukcirgberzmuzwu.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_wxlsy8Hy4p_b1djUgdmJmw_-FL3GLq-'

const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ?? DEFAULT_SUPABASE_URL
).replace(/\/$/, '')
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  DEFAULT_SUPABASE_PUBLISHABLE_KEY

interface AuthResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: {
    id: string
    email?: string
  }
  error_description?: string
  msg?: string
}

interface SyncMeta {
  lastSyncAt: string
  rowId: string | null
  updatedAt: string
}

export class CloudAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CloudAuthError'
  }
}

export function isCloudAuthError(error: unknown) {
  return error instanceof CloudAuthError
}

export function isCloudConfigured() {
  return Boolean(supabaseUrl && supabaseKey)
}

export function loadCloudSession(): CloudSession | null {
  try {
    const value = window.localStorage.getItem(SESSION_KEY)
    return value ? (JSON.parse(value) as CloudSession) : null
  } catch {
    return null
  }
}

export function saveCloudSession(session: CloudSession | null) {
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY)
    return
  }
  safeSetLocalStorageItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSyncMeta(userId: string) {
  void userId
  try {
    const value = window.localStorage.getItem(SYNC_META_KEY)
    const meta = value ? (JSON.parse(value) as SyncMeta) : null
    return meta?.updatedAt ? meta : null
  } catch {
    return null
  }
}

export function saveSyncMeta(
  userId: string,
  remoteUpdatedAt: string,
  data: AppData,
  event?: 'upload' | 'download',
  rowId?: string | null,
) {
  void userId
  void data
  void event
  const now = new Date().toISOString()
  const meta: SyncMeta = {
    lastSyncAt: now,
    rowId: rowId ?? null,
    updatedAt: remoteUpdatedAt,
  }
  safeSetLocalStorageItem(SYNC_META_KEY, JSON.stringify(meta))
  return meta
}

export function clearSyncMeta() {
  window.localStorage.removeItem(SYNC_META_KEY)
}

export function hashAppData(data: AppData) {
  return stableStringify(data)
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map(
      (key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`,
    )
    .join(',')}}`
}

export function isEmptyAppData(data: AppData) {
  return (
    data.accounts.length === 0 &&
    data.ipos.length === 0 &&
    data.subscriptions.length === 0 &&
    data.sales.length === 0 &&
    data.withdrawals.length === 0 &&
    (data.exchangeRecords?.length ?? 0) === 0 &&
    (data.holdings?.length ?? 0) === 0
  )
}

export async function signInWithPassword(email: string, password: string) {
  const response = await authRequest(
    '/auth/v1/token?grant_type=password',
    { email, password },
  )
  return sessionFromAuthResponse(response)
}

export async function signUpWithPassword(email: string, password: string) {
  const response = await authRequest('/auth/v1/signup', { email, password })
  if (!response.access_token || !response.refresh_token || !response.user) {
    return {
      session: null,
      message: '注册成功，请检查邮箱并完成验证后再登录。',
    }
  }
  return {
    session: sessionFromAuthResponse(response),
    message: '注册并登录成功。',
  }
}

export async function refreshCloudSession(session: CloudSession) {
  const response = await authRequest(
    '/auth/v1/token?grant_type=refresh_token',
    { refresh_token: session.refreshToken },
  )
  return sessionFromAuthResponse(response)
}

export async function ensureValidSession(session: CloudSession) {
  if (session.expiresAt > Date.now() + 60_000) return session
  const refreshed = await refreshCloudSession(session)
  saveCloudSession(refreshed)
  return refreshed
}

export async function signOutCloud(session: CloudSession) {
  try {
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: 'POST',
      headers: requestHeaders(session.accessToken),
    })
  } finally {
    saveCloudSession(null)
    clearSyncMeta()
  }
}

export async function fetchCloudSnapshot(session: CloudSession) {
  const currentSession = await ensureValidSession(session)
  // Mobile in-app browsers can reuse old authenticated REST GET responses.
  // Use a valid, changing PostgREST filter to force a fresh read without
  // relying on unsupported arbitrary query params.
  const cacheBustBefore = encodeURIComponent(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  )
  const query = `/rest/v1/user_data?select=user_id,data,updated_at&user_id=eq.${encodeURIComponent(
    currentSession.user.id,
  )}&updated_at=lte.${cacheBustBefore}&order=updated_at.desc&limit=10`
  const response = await fetch(
    `${supabaseUrl}${query}`,
    {
      cache: 'no-store',
      headers: {
        ...requestHeaders(currentSession.accessToken),
        Prefer: 'count=exact',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    },
  )
  if (!response.ok) throw await responseError(response)
  const rows = (await response.json()) as {
    user_id: string
    data: AppData
    updated_at: string
  }[]
  const contentRange = response.headers.get('content-range')
  const exactCount = contentRange?.split('/')[1]
  const rowCount =
    exactCount && exactCount !== '*'
      ? Number.parseInt(exactCount, 10)
      : rows.length
  const row = rows[0]
  const debug: CloudFetchDebug = {
    userId: currentSession.user.id,
    query,
    rowCount: Number.isFinite(rowCount) ? rowCount : rows.length,
    rows: rows.map((item) => ({
      rowId: item.user_id,
      updatedAt: item.updated_at,
    })),
    selectedRowId: row?.user_id ?? null,
    selectedUpdatedAt: row?.updated_at ?? null,
  }
  console.info('[HKIPO Cloud] fetchCloudSnapshot', debug)
  console.info(
    '[HKIPO Cloud] fetchCloudSnapshot selected data',
    row ? summarizeCloudData(row.data) : null,
  )
  return {
    session: currentSession,
    snapshot: row
      ? {
          data: normalizeAppData(row.data),
          updatedAt: row.updated_at,
          rowId: row.user_id,
        }
      : null,
    debug,
  }
}

export async function saveCloudSnapshot(
  session: CloudSession,
  data: AppData,
): Promise<{ session: CloudSession; snapshot: CloudSnapshot }> {
  const currentSession = await ensureValidSession(session)
  const payload = {
    user_id: currentSession.user.id,
    data,
    updated_at: new Date().toISOString(),
  }
  console.info('[HKIPO Cloud] upsert payload', {
    userId: payload.user_id,
    updatedAt: payload.updated_at,
    uploadDataKeys: Object.keys(payload.data),
    lengths: summarizeCloudData(payload.data),
  })
  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_data?on_conflict=user_id`,
    {
      method: 'POST',
      cache: 'no-store',
      headers: {
        ...requestHeaders(currentSession.accessToken),
        Prefer: 'resolution=merge-duplicates,return=representation',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) throw await responseError(response)
  const rows = (await response.json()) as {
    user_id?: string
    data: AppData
    updated_at: string
  }[]
  const row = rows[0]
  if (!row) throw new Error('云端没有返回保存结果')
  console.info('[HKIPO Cloud] upsert response', {
    returnedRows: rows.length,
    recordId: row.user_id ?? currentSession.user.id,
    updatedAt: row.updated_at,
    lengths: summarizeCloudData(row.data),
  })
  const normalizedData = normalizeAppData(row.data)
  return {
    session: currentSession,
    snapshot: {
      data: normalizedData,
      updatedAt: row.updated_at,
      rowId: row.user_id,
    },
  }
}

async function authRequest(path: string, body: Record<string, string>) {
  if (!isCloudConfigured()) throw new Error('尚未配置 Supabase 环境变量')
  const response = await fetch(`${supabaseUrl}${path}`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const result = (await response.json()) as AuthResponse
  if (!response.ok) {
    const detail =
      result.error_description ?? result.msg ?? 'Supabase 登录请求失败'
    if (
      path.includes('refresh_token') &&
      /refresh token|invalid refresh|not found/i.test(detail)
    ) {
      throw new CloudAuthError(
        `同步登录已过期，请重新登录。（${detail}）`,
      )
    }
    throw new Error(
      detail,
    )
  }
  return result
}

function sessionFromAuthResponse(response: AuthResponse): CloudSession {
  if (
    !response.access_token ||
    !response.refresh_token ||
    !response.user?.id
  ) {
    throw new Error('Supabase 没有返回有效登录会话')
  }
  const user: CloudUser = {
    id: response.user.id,
    email: response.user.email ?? '',
  }
  const session: CloudSession = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
    user,
  }
  saveCloudSession(session)
  return session
}

function requestHeaders(accessToken: string) {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

function summarizeCloudData(data: unknown) {
  const record = data as Record<string, unknown>
  return {
    accounts: getArrayLength(record.accounts),
    ipos: getArrayLength(record.ipos),
    subscriptions: getArrayLength(record.subscriptions),
    applications: getArrayLength(record.applications),
    subscriptionRecords: getArrayLength(record.subscriptionRecords),
    allotments: getArrayLength(record.allotments),
    results: getArrayLength(record.results),
    winningRecords: getArrayLength(record.winningRecords),
    sales: getArrayLength(record.sales),
    sellRecords: getArrayLength(record.sellRecords),
  }
}

function getArrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : null
}

async function responseError(response: Response) {
  let detail = ''
  try {
    const result = (await response.json()) as {
      message?: string
      msg?: string
      error_description?: string
    }
    detail = result.message ?? result.msg ?? result.error_description ?? ''
  } catch {
    detail = await response.text()
  }
  if (
    response.status === 401 ||
    response.status === 403 ||
    /jwt|token|unauthorized|forbidden/i.test(detail)
  ) {
    return new CloudAuthError(
      `同步登录无效，请重新登录。（${detail || response.status}）`,
    )
  }
  return new Error(detail || `云同步请求失败（${response.status}）`)
}
