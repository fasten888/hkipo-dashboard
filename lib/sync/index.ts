export type SyncSummary = {
  lastSyncAt: Date | null
  inserted: number
  updated: number
  failed: number
}

export async function syncHKEX(): Promise<SyncSummary> {
  return {
    lastSyncAt: null,
    inserted: 0,
    updated: 0,
    failed: 0,
  }
}

export async function syncHearing(): Promise<SyncSummary> {
  return {
    lastSyncAt: null,
    inserted: 0,
    updated: 0,
    failed: 0,
  }
}

export async function syncAllotment(): Promise<SyncSummary> {
  return {
    lastSyncAt: null,
    inserted: 0,
    updated: 0,
    failed: 0,
  }
}
