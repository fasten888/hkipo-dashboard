const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024
const CLEANUP_THRESHOLD_BYTES = 4 * 1024 * 1024

const DAILY_BACKUPS_KEY = 'hkipo-dashboard:daily-backups:v1'
const VERSION_SNAPSHOTS_KEY = 'hkipo-dashboard:version-snapshots:v1'
const OPERATION_LOGS_KEY = 'hkipo-dashboard:operation-logs:v1'
const AUTO_BACKUP_KEY = 'hkipo-dashboard:auto-backup:v3'
const PREVIOUS_BACKUP_KEY = 'hkipo-dashboard:previous-backup:v3'

export interface StorageUsage {
  usedBytes: number
  usedMB: number
  percent: number
}

export interface StorageCleanupResult {
  before: StorageUsage
  after: StorageUsage
  cleaned: boolean
}

export function getStorageUsage(): StorageUsage {
  if (typeof window === 'undefined') {
    return { usedBytes: 0, usedMB: 0, percent: 0 }
  }

  let usedBytes = 0
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key) continue
    usedBytes += byteLength(key)
    usedBytes += byteLength(window.localStorage.getItem(key) ?? '')
  }

  return {
    usedBytes,
    usedMB: Number((usedBytes / 1024 / 1024).toFixed(2)),
    percent: Math.min(100, Math.round((usedBytes / STORAGE_LIMIT_BYTES) * 100)),
  }
}

export function cleanupOldBackups(): StorageCleanupResult {
  const before = getStorageUsage()
  if (typeof window === 'undefined') {
    return { before, after: before, cleaned: false }
  }

  trimArrayKey(DAILY_BACKUPS_KEY, 10)
  trimArrayKey(VERSION_SNAPSHOTS_KEY, 10)
  trimArrayKey(OPERATION_LOGS_KEY, 500)
  trimArrayKey(AUTO_BACKUP_KEY, 1)
  trimArrayKey(PREVIOUS_BACKUP_KEY, 1)

  const after = getStorageUsage()
  return {
    before,
    after,
    cleaned: after.usedBytes < before.usedBytes,
  }
}

export function clearOperationLogs() {
  if (typeof window === 'undefined') return getStorageUsage()
  window.localStorage.setItem(OPERATION_LOGS_KEY, '[]')
  return getStorageUsage()
}

export function safeSetLocalStorageItem(key: string, value: string) {
  if (typeof window === 'undefined') return

  if (getStorageUsage().usedBytes > CLEANUP_THRESHOLD_BYTES) {
    cleanupOldBackups()
  }

  try {
    window.localStorage.setItem(key, value)
  } catch (error) {
    if (!isQuotaError(error)) throw error
    cleanupOldBackups()
    window.localStorage.setItem(key, value)
  }
}

function trimArrayKey(key: string, limit: number) {
  const raw = window.localStorage.getItem(key)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return
    window.localStorage.setItem(key, JSON.stringify(parsed.slice(0, limit)))
  } catch {
    // Broken backup/log JSON should not block app startup or syncing.
  }
}

function byteLength(value: string) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length
  }
  return value.length * 2
}

function isQuotaError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014)
  )
}
