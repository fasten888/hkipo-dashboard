import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cleanupOldBackups,
  getStorageUsage,
  safeSetLocalStorageItem,
  STORAGE_KEYS,
} from '../src/services/storageManager.ts'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  private readonly quota: number

  constructor(quota = Number.POSITIVE_INFINITY) {
    this.quota = quota
  }

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    const next = new Map(this.values)
    next.set(key, value)
    const bytes = [...next].reduce(
      (total, [itemKey, itemValue]) => total + itemKey.length + itemValue.length,
      0,
    )
    if (bytes > this.quota) {
      throw Object.assign(new Error('quota exceeded'), {
        name: 'QuotaExceededError',
        code: 22,
      })
    }
    this.values = next
  }
}

function useStorage(storage: Storage) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage, dispatchEvent: () => true },
  })
}

function records(count: number, payloadSize = 0) {
  return Array.from({ length: count }, (_, index) => ({
    id: `record-${index}`,
    createdAt: new Date(2026, 0, count - index).toISOString(),
    data: { id: index, payload: 'x'.repeat(payloadSize) },
  }))
}

test('历史数据按 30/20/500 上限保留', () => {
  const storage = new MemoryStorage()
  useStorage(storage)
  storage.setItem(STORAGE_KEYS.dailyBackups, JSON.stringify(records(40)))
  storage.setItem(STORAGE_KEYS.versionSnapshots, JSON.stringify(records(25)))
  storage.setItem(STORAGE_KEYS.operationLogs, JSON.stringify(records(600)))

  cleanupOldBackups()

  assert.equal(JSON.parse(storage.getItem(STORAGE_KEYS.dailyBackups)!).length, 30)
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEYS.versionSnapshots)!).length, 20)
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEYS.operationLogs)!).length, 500)
})

test('超过容量阈值时只淘汰旧历史，不删除当前数据', () => {
  const storage = new MemoryStorage()
  useStorage(storage)
  const currentData = JSON.stringify({ accounts: [{ id: 'protected' }] })
  storage.setItem(STORAGE_KEYS.appData, currentData)
  storage.setItem(STORAGE_KEYS.dailyBackups, JSON.stringify(records(30, 180_000)))
  storage.setItem(STORAGE_KEYS.versionSnapshots, JSON.stringify(records(20, 180_000)))

  const result = cleanupOldBackups()

  assert.equal(storage.getItem(STORAGE_KEYS.appData), currentData)
  assert.ok(result.after.usedBytes <= 4 * 1024 * 1024)
  assert.ok(result.after.usedBytes < result.before.usedBytes)
})

test('配额不足时不会覆盖现有业务数据', () => {
  const storage = new MemoryStorage(1_000)
  useStorage(storage)
  const currentData = JSON.stringify({ payload: 'x'.repeat(700) })
  storage.setItem(STORAGE_KEYS.appData, currentData)

  const saved = safeSetLocalStorageItem(
    STORAGE_KEYS.appData,
    JSON.stringify({ payload: 'y'.repeat(1_200) }),
  )

  assert.equal(saved, false)
  assert.equal(storage.getItem(STORAGE_KEYS.appData), currentData)
})

test('清理后 data:v3 仍完整保留 12/45/401/73/59', () => {
  const storage = new MemoryStorage()
  useStorage(storage)
  const subscriptions = Array.from({ length: 401 }, (_, index) => ({
    id: `subscription-${index}`,
    accountId: `account-${index % 12}`,
    ipoId: `ipo-${index % 45}`,
    status: index < 73 ? 'won' : 'lost',
    allottedShares: index < 73 ? 100 : 0,
    allottedLots: index < 73 ? 1 : 0,
  }))
  storage.setItem(
    STORAGE_KEYS.appData,
    JSON.stringify({
      version: 3,
      accounts: Array.from({ length: 12 }, (_, id) => ({ id: `account-${id}` })),
      ipos: Array.from({ length: 45 }, (_, id) => ({ id: `ipo-${id}` })),
      subscriptions,
      sales: Array.from({ length: 59 }, (_, id) => ({
        id: `sale-${id}`,
        subscriptionId: `subscription-${id}`,
      })),
    }),
  )

  cleanupOldBackups()
  const data = JSON.parse(storage.getItem(STORAGE_KEYS.appData)!) as {
    accounts: unknown[]
    ipos: unknown[]
    subscriptions: Array<{ status: string }>
    sales: unknown[]
  }
  assert.deepEqual(
    {
      accounts: data.accounts.length,
      ipos: data.ipos.length,
      subscriptions: data.subscriptions.length,
      wins: data.subscriptions.filter((item) => item.status === 'won').length,
      sales: data.sales.length,
    },
    { accounts: 12, ipos: 45, subscriptions: 401, wins: 73, sales: 59 },
  )
  assert.ok(getStorageUsage().usedBytes > 0)
})
