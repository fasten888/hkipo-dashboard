export const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024
export const CLEANUP_THRESHOLD_BYTES = 4 * 1024 * 1024
export const STORAGE_WARNING_EVENT = 'hkipo-storage-warning'

export const STORAGE_KEYS = {
  appData: 'hkipo-dashboard:data:v3',
  dailyBackups: 'hkipo-dashboard:daily-backups:v1',
  versionSnapshots: 'hkipo-dashboard:version-snapshots:v1',
  operationLogs: 'hkipo-dashboard:operation-logs:v1',
  autoBackup: 'hkipo-dashboard:auto-backup:v3',
  previousBackup: 'hkipo-dashboard:previous-backup:v3',
  importBackups: 'hkipo-dashboard:import-backups:v3',
} as const

const RETENTION_LIMITS: Record<string, number> = {
  [STORAGE_KEYS.dailyBackups]: 30,
  [STORAGE_KEYS.versionSnapshots]: 20,
  [STORAGE_KEYS.operationLogs]: 500,
  [STORAGE_KEYS.importBackups]: 20,
}

const CLEANUP_ORDER = [
  STORAGE_KEYS.dailyBackups,
  STORAGE_KEYS.versionSnapshots,
  STORAGE_KEYS.importBackups,
  STORAGE_KEYS.operationLogs,
]

const PURPOSES: Record<string, { purpose: string; clearable: boolean }> = {
  [STORAGE_KEYS.appData]: { purpose: '当前有效业务数据', clearable: false },
  [STORAGE_KEYS.dailyBackups]: { purpose: '每日历史备份', clearable: true },
  [STORAGE_KEYS.versionSnapshots]: { purpose: '操作版本快照', clearable: true },
  [STORAGE_KEYS.operationLogs]: { purpose: '操作日志', clearable: true },
  [STORAGE_KEYS.autoBackup]: { purpose: '最新自动备份', clearable: false },
  [STORAGE_KEYS.previousBackup]: { purpose: '上一次有效备份', clearable: false },
  [STORAGE_KEYS.importBackups]: { purpose: '导入前历史备份', clearable: true },
}

export interface StorageUsage {
  usedBytes: number
  usedMB: number
  percent: number
}

export interface StorageBreakdownItem {
  key: string
  sizeBytes: number
  sizeMB: number
  purpose: string
  clearable: boolean
}

export interface StorageCleanupResult {
  before: StorageUsage
  after: StorageUsage
  cleaned: boolean
}

export type StorageLevel = 'normal' | 'attention' | 'danger' | 'critical'

export function calculateSize(value: string) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length
  }
  return value.length * 2
}

export function compressData(value: unknown) {
  return JSON.stringify(value)
}

export function getStorageUsage(): StorageUsage {
  const storage = getStorage()
  if (!storage) return { usedBytes: 0, usedMB: 0, percent: 0 }

  let usedBytes = 0
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key) continue
    usedBytes += calculateSize(key)
    usedBytes += calculateSize(storage.getItem(key) ?? '')
  }

  return createUsage(usedBytes)
}

export function getStorageBreakdown(): StorageBreakdownItem[] {
  const storage = getStorage()
  if (!storage) return []

  const items: StorageBreakdownItem[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key?.startsWith('hkipo-dashboard:')) continue
    const sizeBytes = calculateSize(key) + calculateSize(storage.getItem(key) ?? '')
    const known = PURPOSES[key]
    items.push({
      key,
      sizeBytes,
      sizeMB: Number((sizeBytes / 1024 / 1024).toFixed(3)),
      purpose: known?.purpose ?? inferPurpose(key),
      clearable: known?.clearable ?? !key.includes('data:v3'),
    })
  }
  return items.sort((left, right) => right.sizeBytes - left.sizeBytes)
}

export function getStorageLevel(percent: number): StorageLevel {
  if (percent > 95) return 'critical'
  if (percent > 90) return 'danger'
  if (percent >= 70) return 'attention'
  return 'normal'
}

export function checkQuota(key: string, value: string) {
  return projectedSize(key, value) <= STORAGE_LIMIT_BYTES
}

export function cleanupOldBackups(): StorageCleanupResult {
  const storage = getStorage()
  const before = getStorageUsage()
  if (!storage) return { before, after: before, cleaned: false }

  for (const [key, limit] of Object.entries(RETENTION_LIMITS)) {
    const items = readArray(storage, key)
    if (!items) continue
    writeRaw(storage, key, compressData(normalizeHistory(key, items, limit)))
  }

  while (getStorageUsage().usedBytes > CLEANUP_THRESHOLD_BYTES) {
    let removed = false
    for (const key of CLEANUP_ORDER) {
      const items = readArray(storage, key)
      const minimum = key === STORAGE_KEYS.operationLogs ? 0 : 1
      if (!items || items.length <= minimum) continue
      items.pop()
      writeRaw(storage, key, compressData(items))
      removed = true
      if (getStorageUsage().usedBytes <= CLEANUP_THRESHOLD_BYTES) break
    }
    if (!removed) break
  }

  const after = getStorageUsage()
  return { before, after, cleaned: after.usedBytes < before.usedBytes }
}

export function clearOperationLogs() {
  const storage = getStorage()
  if (storage) writeRaw(storage, STORAGE_KEYS.operationLogs, '[]')
  return getStorageUsage()
}

export function safeSetLocalStorageItem(key: string, rawValue: string) {
  const storage = getStorage()
  if (!storage) return false

  let value = normalizeManagedValue(key, rawValue)
  if (projectedSize(key, value) > CLEANUP_THRESHOLD_BYTES) {
    cleanupOldBackups()
    value = fitManagedValue(key, value)
  }

  if (!checkQuota(key, value)) {
    notifyStorageWarning()
    return false
  }

  try {
    storage.setItem(key, value)
    return true
  } catch (error) {
    if (!isQuotaError(error)) throw error
    cleanupOldBackups()
    value = fitManagedValue(key, value)
    try {
      storage.setItem(key, value)
      return true
    } catch (retryError) {
      if (!isQuotaError(retryError)) throw retryError
      notifyStorageWarning()
      return false
    }
  }
}

export function safeRemoveLocalStorageItem(key: string) {
  getStorage()?.removeItem(key)
}

export function readStorageJson<T>(key: string): T | null {
  const raw = getStorage()?.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function normalizeManagedValue(key: string, value: string) {
  const limit = RETENTION_LIMITS[key]
  if (!limit) return value
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? compressData(normalizeHistory(key, parsed, limit))
      : value
  } catch {
    return value
  }
}

function fitManagedValue(key: string, value: string) {
  if (!RETENTION_LIMITS[key]) return value
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return value
    const minimum = key === STORAGE_KEYS.operationLogs ? 0 : 1
    while (
      parsed.length > minimum &&
      projectedSize(key, compressData(parsed)) > CLEANUP_THRESHOLD_BYTES
    ) {
      parsed.pop()
    }
    return compressData(parsed)
  } catch {
    return value
  }
}

function normalizeHistory(key: string, items: unknown[], limit: number) {
  const limited = items.slice(0, limit)
  if (key === STORAGE_KEYS.operationLogs) return limited

  const seen = new Set<string>()
  return limited.filter((item) => {
    const fingerprint = backupFingerprint(item)
    if (seen.has(fingerprint)) return false
    seen.add(fingerprint)
    return true
  })
}

function backupFingerprint(item: unknown) {
  if (!item || typeof item !== 'object') return compressData(item)
  const record = item as Record<string, unknown>
  return compressData(record.data ?? record.backup ?? item)
}

function projectedSize(key: string, value: string) {
  const storage = getStorage()
  if (!storage) return 0
  const current = storage.getItem(key)
  return (
    getStorageUsage().usedBytes -
    (current === null ? 0 : calculateSize(key) + calculateSize(current)) +
    calculateSize(key) +
    calculateSize(value)
  )
}

function readArray(storage: Storage, key: string): unknown[] | null {
  const raw = storage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeRaw(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value)
  } catch (error) {
    if (!isQuotaError(error)) throw error
  }
}

function getStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

function createUsage(usedBytes: number): StorageUsage {
  return {
    usedBytes,
    usedMB: Number((usedBytes / 1024 / 1024).toFixed(2)),
    percent: Math.min(100, Math.round((usedBytes / STORAGE_LIMIT_BYTES) * 100)),
  }
}

function inferPurpose(key: string) {
  if (key.includes('preference') || key.includes('sort')) return '界面偏好'
  if (key.includes('privacy')) return '隐私设置'
  if (key.includes('sync')) return '同步元数据缓存'
  return '应用缓存'
}

function notifyStorageWarning() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(STORAGE_WARNING_EVENT, {
      detail: { message: '当前数据空间不足，请导出备份' },
    }),
  )
}

function isQuotaError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { name?: string; code?: number }
  return (
    candidate.name === 'QuotaExceededError' ||
    candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    candidate.code === 22 ||
    candidate.code === 1014
  )
}
