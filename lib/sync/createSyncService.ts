import { syncLogRepository } from '../database/syncLogRepository'
import { hkexSyncProvider } from '../hkex/provider'
import { SyncService } from './service'

export function createSyncService() {
  return new SyncService([hkexSyncProvider], syncLogRepository)
}
