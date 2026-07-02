import type { SyncProvider, SyncProviderResult } from '../sync'

const disabledResult: SyncProviderResult = {
  added: 0,
  updated: 0,
  failed: 0,
  message: 'HKEX provider is registered but external sync is not enabled yet.',
}

export const hkexSyncProvider: SyncProvider = {
  name: 'hkex',
  async syncIPO() {
    return disabledResult
  },
  async syncHearing() {
    return disabledResult
  },
  async syncAllotment() {
    return disabledResult
  },
  async syncHistory() {
    return disabledResult
  },
}
