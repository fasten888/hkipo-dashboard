import type {
  DailyBackup,
  DataSnapshot,
  OperationLog,
} from '../types/audit'
import type { AppData } from '../types/store'
import { createId } from '../utils/id'
import {
  compressData,
  readStorageJson,
  safeSetLocalStorageItem,
  STORAGE_KEYS,
} from './storageManager'

const operationLogs = readStorageJson<OperationLog[]>(STORAGE_KEYS.operationLogs) ?? []
const versionSnapshots = readStorageJson<DataSnapshot[]>(STORAGE_KEYS.versionSnapshots) ?? []
const dailyBackups = readStorageJson<DailyBackup[]>(STORAGE_KEYS.dailyBackups) ?? []

function persist<T>(key: string, entries: T[]) {
  safeSetLocalStorageItem(key, compressData(entries))
}

export function getOperationLogs() {
  return operationLogs
}

export function addOperationLog(
  entry: Omit<OperationLog, 'id' | 'createdAt'>,
) {
  const next: OperationLog = {
    ...entry,
    id: createId(),
    createdAt: new Date().toISOString(),
  }
  operationLogs.unshift(next)
  operationLogs.splice(500)
  persist(STORAGE_KEYS.operationLogs, operationLogs)
  return next
}

export function getVersionSnapshots() {
  return versionSnapshots
}

export function createVersionSnapshot(data: AppData, reason: string) {
  const snapshot: DataSnapshot = {
    id: createId(),
    createdAt: new Date().toISOString(),
    reason,
    data,
  }
  versionSnapshots.unshift(snapshot)
  versionSnapshots.splice(20)
  persist(STORAGE_KEYS.versionSnapshots, versionSnapshots)
  return snapshot
}

export function getDailyBackups() {
  return dailyBackups
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
  dailyBackups.unshift(backup)
  dailyBackups.splice(30)
  persist(STORAGE_KEYS.dailyBackups, dailyBackups)
  return dailyBackups
}

export function deleteDailyBackup(id: string) {
  const index = dailyBackups.findIndex((backup) => backup.id === id)
  if (index >= 0) dailyBackups.splice(index, 1)
  persist(STORAGE_KEYS.dailyBackups, dailyBackups)
  return dailyBackups
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
