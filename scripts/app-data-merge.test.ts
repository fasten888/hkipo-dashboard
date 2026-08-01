import assert from 'node:assert/strict'
import test from 'node:test'
import type { Account } from '../src/types/account.ts'
import type { Ipo } from '../src/types/ipo.ts'
import type { Sale } from '../src/types/sale.ts'
import type { AppData } from '../src/types/store.ts'
import type { Subscription } from '../src/types/subscription.ts'
import { mergeAppData } from '../src/utils/appDataMerge.ts'

const older = '2026-07-01T00:00:00.000Z'
const newer = '2026-08-01T00:00:00.000Z'

function account(id: string, updatedAt = older): Account {
  return {
    id,
    name: `账户${id}`,
    accountSuffix: id.padStart(4, '0').slice(-4),
    phone: '',
    brokerName: '',
    securitiesAccount: '',
    initialDeposit: 0,
    currentAssets: 0,
    defaultSubscriptionMethod: '10x',
    legacyParticipationCount: 0,
    legacyWinCount: 0,
    remarks: '',
    createdAt: older,
    updatedAt,
  }
}

function ipo(id: string, updatedAt = older): Ipo {
  return {
    id,
    name: `新股${id}`,
    stockCode: id.padStart(5, '0').slice(-5),
    issuePrice: 1,
    lotSize: 100,
    subscriptionDate: '2026-07-01',
    listingDate: '2026-07-10',
    industry: '',
    createdAt: older,
    updatedAt,
  }
}

function subscription(id: string): Subscription {
  return {
    id,
    accountId: 'account-0',
    ipoId: 'ipo-0',
    method: '10x',
    subscriptionMethod: '10x',
    subscriptionAmount: 0,
    fee: 100,
    subscriptionDate: '2026-07-01',
    remarks: '',
    status: 'applied',
    allottedShares: 0,
    allottedLots: 0,
    sellPlan: 'hold',
    fundingSource: 'financing',
    createdAt: older,
    updatedAt: older,
  }
}

function sale(id: string): Sale {
  return {
    id,
    subscriptionId: 'subscription-0',
    price: 1,
    date: '2026-07-10',
    shares: 100,
    method: 'first_day',
    commission: 0,
    remarks: '',
    createdAt: older,
    updatedAt: older,
  }
}

function appData(counts = { accounts: 0, ipos: 0, subscriptions: 0, sales: 0 }): AppData {
  return {
    version: 3,
    accounts: Array.from({ length: counts.accounts }, (_, index) => account(`account-${index}`)),
    ipos: Array.from({ length: counts.ipos }, (_, index) => ipo(`ipo-${index}`)),
    subscriptions: Array.from(
      { length: counts.subscriptions },
      (_, index) => subscription(`subscription-${index}`),
    ),
    sales: Array.from({ length: counts.sales }, (_, index) => sale(`sale-${index}`)),
    withdrawals: [],
    exchangeRecords: [],
    holdings: [],
    fxRates: { HKD: 0, USD: 0, updatedAt: '' },
  }
}

test('空云端不能覆盖已有本地业务数据', () => {
  const local = appData({ accounts: 12, ipos: 45, subscriptions: 401, sales: 59 })
  const merged = mergeAppData(local, appData())

  assert.equal(merged.accounts.length, 12)
  assert.equal(merged.ipos.length, 45)
  assert.equal(merged.subscriptions.length, 401)
  assert.equal(merged.sales.length, 59)
})

test('云端数量落后时保留本地独有记录', () => {
  const local = appData({ accounts: 12, ipos: 45, subscriptions: 401, sales: 59 })
  const remote = appData({ accounts: 12, ipos: 44, subscriptions: 400, sales: 58 })
  const merged = mergeAppData(local, remote)

  assert.equal(merged.ipos.length, 45)
  assert.equal(merged.subscriptions.length, 401)
  assert.equal(merged.sales.length, 59)
})

test('相同 ID 按 updatedAt 采用较新的记录', () => {
  const local = appData()
  const remote = appData()
  local.accounts = [{ ...account('account-1'), name: '本地旧名称' }]
  remote.accounts = [{ ...account('account-1', newer), name: '云端新名称' }]

  const merged = mergeAppData(local, remote)

  assert.equal(merged.accounts.length, 1)
  assert.equal(merged.accounts[0]?.name, '云端新名称')
})
