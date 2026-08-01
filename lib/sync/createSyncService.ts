import { syncLogRepository } from '../database/syncLogRepository.js'
import { hkexSyncProvider } from '../hkex/provider.js'
import { aastocksSyncProvider } from '../providers/aastocks/index.js'
import { SyncService } from './service.js'

export function createSyncService() {
  return new SyncService([aastocksSyncProvider, hkexSyncProvider], syncLogRepository)
}
