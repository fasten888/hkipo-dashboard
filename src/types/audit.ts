import type { AppData } from './store'

export interface OperationLog {
  id: string
  createdAt: string
  action: string
  objectType: string
  objectName: string
  before?: unknown
  after?: unknown
}

export interface DataSnapshot {
  id: string
  createdAt: string
  reason: string
  data: AppData
}

export interface DailyBackup extends DataSnapshot {
  date: string
}
