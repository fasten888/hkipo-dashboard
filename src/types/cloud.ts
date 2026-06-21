import type { AppData } from './store'

export interface CloudUser {
  id: string
  email: string
}

export interface CloudSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: CloudUser
}

export interface CloudSnapshot {
  data: AppData
  updatedAt: string
  rowId?: string
}

export interface CloudFetchDebug {
  userId: string
  query: string
  rowCount: number
  rows: {
    rowId: string
    updatedAt: string
  }[]
  selectedRowId: string | null
  selectedUpdatedAt: string | null
}

export interface CloudDataCounts {
  accounts: number
  ipos: number
  subscriptions: number
  allotments: number
  sales: number
}

export interface CloudRemoteSummary {
  counts: CloudDataCounts
  updatedAt: string | null
  rowId: string | null
  checkedAt: string
}

export interface CloudSyncTimes {
  lastUploadedAt: string | null
  lastDownloadedAt: string | null
}

export interface CloudUploadReport {
  startedAt: string
  completedAt?: string
  beforeCounts: CloudDataCounts | null
  localCounts: CloudDataCounts
  returnedCounts: CloudDataCounts | null
  confirmedCounts: CloudDataCounts | null
  writtenCounts: CloudDataCounts | null
  supabaseUpdatedAt: string | null
  supabaseReturnedRows: number
  status: 'running' | 'success' | 'failed'
  error?: string
}

export type CloudSyncStatus =
  | 'disabled'
  | 'signed_out'
  | 'loading'
  | 'synced'
  | 'syncing'
  | 'offline'
  | 'conflict'
  | 'error'
  | 'auth_expired'

export interface CloudConflict {
  local: AppData
  remote: AppData
  remoteUpdatedAt: string
}

export interface CloudDiagnosticStep {
  name: string
  status: 'pending' | 'success' | 'failed'
  detail: string
}

export interface CloudDiagnosticResult {
  testRecordId: string
  tableName: string
  startedAt: string
  completedAt?: string
  lostAt?: string
  steps: CloudDiagnosticStep[]
}
