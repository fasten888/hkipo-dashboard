export type SyncTask = 'ipo' | 'hearing' | 'allotment' | 'history'

export type SyncStatus = 'idle' | 'running' | 'success' | 'failed'

export type SyncProviderResult = {
  added: number
  updated: number
  failed: number
  message?: string
}

export type SyncContext = {
  provider: string
  task: SyncTask
  startedAt: Date
}

export type SyncProvider = {
  name: string
  syncIPO: (context: SyncContext) => Promise<SyncProviderResult>
  syncHearing: (context: SyncContext) => Promise<SyncProviderResult>
  syncAllotment: (context: SyncContext) => Promise<SyncProviderResult>
  syncHistory: (context: SyncContext) => Promise<SyncProviderResult>
}

export type SyncLogEntry = {
  id: string
  provider: string
  status: string
  startTime: Date
  endTime: Date | null
  added: number
  updated: number
  failed: number
  message: string | null
}

export type SyncLogCreateInput = {
  provider: string
  status: SyncStatus
  startTime: Date
  added: number
  updated: number
  failed: number
  message?: string
}

export type SyncLogUpdateInput = {
  status: SyncStatus
  endTime: Date
  added: number
  updated: number
  failed: number
  message?: string
}

export type SyncLogStore = {
  create: (input: SyncLogCreateInput) => Promise<SyncLogEntry>
  update: (id: string, input: SyncLogUpdateInput) => Promise<SyncLogEntry>
  latest: (limit?: number) => Promise<SyncLogEntry[]>
  transaction: <T>(operation: () => Promise<T>) => Promise<T>
}

export type SyncRunSummary = {
  provider: string
  status: SyncStatus
  startTime: Date
  endTime: Date
  added: number
  updated: number
  failed: number
  message: string
}

export type SyncState = {
  status: SyncStatus
  lastSyncTime: Date | null
  added: number
  updated: number
  failed: number
  logs: SyncLogEntry[]
}
