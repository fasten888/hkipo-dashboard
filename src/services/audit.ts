import type {
  DailyBackup,
  DataSnapshot,
  OperationLog,
} from '../types/audit'
import type { AppData } from '../types/store'
import { createId } from '../utils/id'
import { safeSetLocalStorageItem } from './storageMaintenance'

const LOG_KEY = 'hkipo-dashboard:operation-logs:v1'
const SNAPSHOT_KEY = 'hkipo-dashboard:version-snapshots:v1'
const DAILY_BACKUP_KEY = 'hkipo-dashboard:daily-backups:v1'

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    safeSetLocalStorageItem(key, JSON.stringify(value))
  } catch {
    // Business data remains usable if local audit storage is full.
  }
}

export function getOperationLogs() {
  return readJson<OperationLog[]>(LOG_KEY, [])
}

export function addOperationLog(
  entry: Omit<OperationLog, 'id' | 'createdAt'>,
) {
  const next: OperationLog = {
    ...entry,
    id: createId(),
    createdAt: new Date().toISOString(),
  }
  writeJson(LOG_KEY, [next, ...getOperationLogs()].slice(0, 500))
  return next
}

export function getVersionSnapshots() {
  return readJson<DataSnapshot[]>(SNAPSHOT_KEY, [])
}

export function createVersionSnapshot(data: AppData, reason: string) {
  const snapshot: DataSnapshot = {
    id: createId(),
    createdAt: new Date().toISOString(),
    reason,
    data,
  }
  writeJson(
    SNAPSHOT_KEY,
    [snapshot, ...getVersionSnapshots()].slice(0, 10),
  )
  return snapshot
}

export function getDailyBackups() {
  return readJson<DailyBackup[]>(DAILY_BACKUP_KEY, [])
}

export function ensureDailyBackup(data: AppData) {
  const date = new Date().toISOString().slice(0, 10)
  const backups = getDailyBackups()
  if (backups.some((backup) => backup.date === date)) return backups
  const backup: DailyBackup = {
    id: createId(),
    date,
    createdAt: new Date().toISOString(),
    reason: '每日自动备份',
    data,
  }
  const next = [backup, ...backups].slice(0, 10)
  writeJson(DAILY_BACKUP_KEY, next)
  return next
}

export function deleteDailyBackup(id: string) {
  const next = getDailyBackups().filter((backup) => backup.id !== id)
  writeJson(DAILY_BACKUP_KEY, next)
  return next
}

export function downloadDailyBackup(backup: DailyBackup) {
  const blob = new Blob([JSON.stringify(backup.data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `港股打新每日备份-${backup.date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function describeChanges(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
) {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ])
  return [...keys]
    .filter(
      (key) =>
        !['id', 'createdAt', 'updatedAt'].includes(key) &&
        JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]),
    )
    .map((key) => ({
      field: key,
      before: before?.[key],
      after: after?.[key],
    }))
}
