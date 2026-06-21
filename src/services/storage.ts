import type { Account } from '../types/account'
import type { AppBackup } from '../types/backup'
import type { Ipo } from '../types/ipo'
import type { ExchangeRecord, FxRateSettings } from '../types/exchange'
import { EMPTY_FX_RATES } from '../types/exchange'
import type { Holding } from '../types/holding'
import type { Sale } from '../types/sale'
import type { AppData } from '../types/store'
import type {
  SellPlan,
  Subscription,
  SubscriptionMethod,
  SubscriptionStatus,
} from '../types/subscription'
import { createId } from '../utils/id'
import { normalizeIndustry } from '../utils/industry'
import { normalizeSubscriptionMethod } from '../utils/subscriptionMethod'

export const APP_STORAGE_KEY = 'hkipo-dashboard:data:v3'
export const AUTO_BACKUP_KEY = 'hkipo-dashboard:auto-backup:v3'
const PREVIOUS_BACKUP_KEY = 'hkipo-dashboard:previous-backup:v3'
const IMPORT_BACKUP_HISTORY_KEY = 'hkipo-dashboard:import-backups:v3'
const V2_STORAGE_KEY = 'hkipo-dashboard:data:v2'

const LEGACY_KEYS = {
  accounts: 'hkipo-dashboard:accounts:v1',
  ipos: 'hkipo-dashboard:ipos:v1',
  subscriptions: 'hkipo-dashboard:subscriptions:v1',
}

interface LegacyAccount extends Partial<Account> {
  historicalParticipationCount?: number
  historicalWinCount?: number
  participationCount?: number
  winCount?: number
}

interface LegacySubscription extends Partial<Subscription> {
  financingMultiple?: number
  allotmentStatus?: 'pending' | 'announced' | 'won' | 'lost'
  sellPrice?: number | null
  sellDate?: string
}

interface LegacyData {
  accounts?: LegacyAccount[]
  ipos?: Partial<Ipo>[]
  subscriptions?: LegacySubscription[]
  sales?: Partial<Sale>[]
  withdrawals?: AppData['withdrawals']
  exchangeRecords?: Partial<ExchangeRecord>[]
  fxRates?: Partial<FxRateSettings>
  holdings?: Partial<Holding>[]
}

export interface ImportBackupEntry {
  id: string
  createdAt: string
  backup: AppBackup
}

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

function normalizeAccount(account: LegacyAccount): Account {
  const now = new Date().toISOString()
  return {
    id: account.id ?? createId(),
    name: account.name ?? '',
    accountSuffix: account.accountSuffix ?? '',
    phone: account.phone ?? '',
    brokerName: account.brokerName ?? '',
    securitiesAccount: account.securitiesAccount ?? '',
    initialDeposit: account.initialDeposit ?? 0,
    currentAssets: account.currentAssets ?? 0,
    cashBalance: account.cashBalance ?? account.currentAssets ?? 0,
    exchangeRecordId: account.exchangeRecordId ?? '',
    defaultSubscriptionMethod:
      normalizeSubscriptionMethod(account.defaultSubscriptionMethod),
    legacyParticipationCount:
      account.legacyParticipationCount ??
      account.historicalParticipationCount ??
      account.participationCount ??
      0,
    legacyWinCount:
      account.legacyWinCount ??
      account.historicalWinCount ??
      account.winCount ??
      0,
    remarks: account.remarks ?? '',
    createdAt: account.createdAt ?? now,
    updatedAt: account.updatedAt ?? now,
  }
}

function normalizeIpo(ipo: Partial<Ipo>): Ipo {
  const now = new Date().toISOString()
  return {
    id: ipo.id ?? createId(),
    name: ipo.name ?? '',
    stockCode: ipo.stockCode ?? '',
    issuePrice: Number(ipo.issuePrice) || 0,
    lotSize: Number(ipo.lotSize) || 0,
    subscriptionDate: ipo.subscriptionDate ?? '',
    listingDate: ipo.listingDate ?? '',
    industry: normalizeIndustry(ipo.industry, ipo.tags),
    tags: undefined,
    createdAt: ipo.createdAt ?? now,
    updatedAt: ipo.updatedAt ?? now,
  }
}

function methodFromLegacy(item: LegacySubscription): SubscriptionMethod {
  if (item.method) return normalizeSubscriptionMethod(item.method)
  const multiple = item.financingMultiple ?? 10
  if (multiple === 0 || multiple === 1) return 'cash'
  return '10x'
}

function statusFromLegacy(item: LegacySubscription): SubscriptionStatus {
  if (item.status) return item.status
  if (item.allotmentStatus === 'pending') return 'applied'
  return item.allotmentStatus ?? 'applied'
}

function normalizeSubscription(
  item: LegacySubscription,
  ipos: Ipo[],
  accounts: Account[],
): Subscription {
  const now = new Date().toISOString()
  const ipo = ipos.find((candidate) => candidate.id === item.ipoId)
  const account = accounts.find((candidate) => candidate.id === item.accountId)
  const rawMethod =
    item.subscriptionMethod ??
    item.method ??
    account?.defaultSubscriptionMethod
  const resolvedMethod =
    rawMethod === undefined
      ? methodFromLegacy(item)
      : normalizeSubscriptionMethod(rawMethod)
  return {
    id: item.id ?? createId(),
    accountId: item.accountId ?? '',
    ipoId: item.ipoId ?? '',
    method: resolvedMethod,
    subscriptionMethod: resolvedMethod,
    subscriptionAmount: Number(item.subscriptionAmount) || 0,
    fee: Number(item.fee) || 0,
    subscriptionDate: item.subscriptionDate ?? ipo?.subscriptionDate ?? '',
    remarks: item.remarks ?? '',
    status: statusFromLegacy(item),
    allottedShares: Number(item.allottedShares) || 0,
    allottedLots: Number(item.allottedLots) || 0,
    sellPlan: (item.sellPlan as SellPlan | undefined) ?? 'hold',
    fundingSource:
      item.fundingSource === 'cash' ||
      item.fundingSource === 'financing' ||
      item.fundingSource === 'collateral' ||
      item.fundingSource === 'mixed'
        ? item.fundingSource
        : resolvedMethod === 'cash'
          ? 'cash'
          : 'financing',
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  }
}

function normalizeSale(sale: Partial<Sale>): Sale {
  const now = new Date().toISOString()
  return {
    id: sale.id ?? createId(),
    subscriptionId: sale.subscriptionId ?? '',
    price: Number(sale.price) || 0,
    date: sale.date ?? '',
    shares: Number(sale.shares) || 0,
    method:
      sale.method === 'grey_market' || sale.method === 'first_day'
        ? sale.method
        : 'held_sale',
    commission: Number(sale.commission) || 0,
    remarks: sale.remarks ?? '',
    createdAt: sale.createdAt ?? now,
    updatedAt: sale.updatedAt ?? now,
  }
}

function normalizeExchangeRecord(
  record: Partial<ExchangeRecord>,
): ExchangeRecord {
  const now = new Date().toISOString()
  const sourceAmountCny = Number(record.sourceAmountCny) || 0
  const sourceAmount = Number(record.sourceAmount) || sourceAmountCny
  const targetAmount = Number(record.targetAmount) || 0
  const sourceCurrency =
    record.sourceCurrency === 'USD' || record.sourceCurrency === 'HKD'
      ? record.sourceCurrency
      : 'CNY'
  return {
    id: record.id ?? createId(),
    accountId: record.accountId ?? '',
    date: record.date ?? '',
    sourceCurrency,
    sourceAmount,
    sourceAmountCny,
    targetCurrency: record.targetCurrency === 'USD' ? 'USD' : 'HKD',
    targetAmount,
    exchangeRate:
      Number(record.exchangeRate) ||
      (sourceAmount > 0 ? targetAmount / sourceAmount : 0),
    manualRate:
      Number(record.manualRate) > 0 ? Number(record.manualRate) : null,
    originalCostCny:
      Number(record.originalCostCny) ||
      (sourceCurrency === 'CNY' ? sourceAmount : sourceAmountCny),
    feeCny: Number(record.feeCny) || 0,
    channel:
      record.channel === 'boc_hk' ||
      record.channel === 'za_bank' ||
      record.channel === 'futu' ||
      record.channel === 'chief' ||
      record.channel === 'cash'
        ? record.channel
        : 'other',
    remarks: record.remarks ?? '',
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

function normalizeHolding(holding: Partial<Holding>): Holding {
  const now = new Date().toISOString()
  return {
    id: holding.id ?? createId(),
    accountId: holding.accountId ?? '',
    stockCode: holding.stockCode ?? '',
    stockName: holding.stockName ?? '',
    quantity: Number(holding.quantity) || 0,
    cost: Number(holding.cost) || 0,
    marketValue: Number(holding.marketValue) || 0,
    collateralRate: Math.min(
      100,
      Math.max(0, Number(holding.collateralRate) || 0),
    ),
    remarks: holding.remarks ?? '',
    createdAt: holding.createdAt ?? now,
    updatedAt: holding.updatedAt ?? now,
  }
}

export function normalizeAppData(data: LegacyData): AppData {
  const ipos = (data.ipos ?? []).map(normalizeIpo)
  const accounts = (data.accounts ?? []).map(normalizeAccount)
  return {
    version: 3,
    accounts,
    ipos,
    subscriptions: (data.subscriptions ?? []).map((item) =>
      normalizeSubscription(item, ipos, accounts),
    ),
    sales: (data.sales ?? []).map(normalizeSale),
    withdrawals: data.withdrawals ?? [],
    exchangeRecords: (data.exchangeRecords ?? []).map(
      normalizeExchangeRecord,
    ),
    fxRates: {
      HKD: Number(data.fxRates?.HKD) || EMPTY_FX_RATES.HKD,
      USD: Number(data.fxRates?.USD) || EMPTY_FX_RATES.USD,
      updatedAt: data.fxRates?.updatedAt ?? '',
    },
    holdings: (data.holdings ?? []).map(normalizeHolding),
  }
}

function migrateV1(): AppData {
  const accounts = readJson<LegacyAccount[]>(LEGACY_KEYS.accounts) ?? []
  const ipos = (readJson<Partial<Ipo>[]>(LEGACY_KEYS.ipos) ?? []).map(
    normalizeIpo,
  )
  const oldSubscriptions =
    readJson<LegacySubscription[]>(LEGACY_KEYS.subscriptions) ?? []
  const sales: Sale[] = []
  const normalizedAccounts = accounts.map(normalizeAccount)
  const subscriptions = oldSubscriptions.map((item) => {
    const subscription = normalizeSubscription(item, ipos, normalizedAccounts)
    if (
      item.sellPrice &&
      item.sellDate &&
      subscription.allottedShares > 0
    ) {
      sales.push(
        normalizeSale({
          subscriptionId: subscription.id,
          price: item.sellPrice,
          date: item.sellDate,
          shares: subscription.allottedShares,
          method: 'held_sale',
          remarks: '由旧版记录自动迁移',
        }),
      )
    }
    return subscription
  })
  return {
    version: 3,
    accounts: normalizedAccounts,
    ipos,
    subscriptions,
    sales,
    withdrawals: [],
    exchangeRecords: [],
    fxRates: EMPTY_FX_RATES,
    holdings: [],
  }
}

export function loadAppData(): AppData {
  const current = readJson<LegacyData>(APP_STORAGE_KEY)
  if (current) return normalizeAppData(current)

  const hasBrokenCurrent = window.localStorage.getItem(APP_STORAGE_KEY) !== null
  if (hasBrokenCurrent) {
    const backup = readJson<AppBackup>(AUTO_BACKUP_KEY)
    if (backup) return importBackup(backup)
  }

  const backup = readJson<AppBackup>(AUTO_BACKUP_KEY)
  if (backup) return importBackup(backup)

  const previous = readJson<LegacyData>(V2_STORAGE_KEY)
  if (previous) {
    const migrated = normalizeAppData(previous)
    saveAppData(migrated)
    return migrated
  }

  const migrated = migrateV1()
  saveAppData(migrated)
  return migrated
}

export function saveAppData(data: AppData) {
  try {
    const serialized = JSON.stringify(data)
    const nextBackup = createBackup(data)
    const currentBackup = readJson<AppBackup>(AUTO_BACKUP_KEY)
    if (
      currentBackup &&
      JSON.stringify({
        ...currentBackup,
        exportedAt: '',
      }) !==
        JSON.stringify({
          ...nextBackup,
          exportedAt: '',
        })
    ) {
      window.localStorage.setItem(
        PREVIOUS_BACKUP_KEY,
        JSON.stringify(currentBackup),
      )
    }
    window.localStorage.setItem(APP_STORAGE_KEY, serialized)
    window.localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(nextBackup))
  } catch {
    // Keep the UI usable if browser storage is unavailable or full.
  }
}

export function createBackup(data: AppData): AppBackup {
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    accounts: data.accounts,
    ipos: data.ipos,
    subscriptions: data.subscriptions,
    allotments: data.subscriptions.map((subscription) => {
      const ipo = data.ipos.find((item) => item.id === subscription.ipoId)
      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        allottedShares: subscription.allottedShares,
        allottedLots: subscription.allottedLots,
        issuePrice: ipo?.issuePrice ?? 0,
        listingDate: ipo?.listingDate ?? '',
        sellPlan: subscription.sellPlan,
      }
    }),
    sellRecords: data.sales,
    withdrawals: data.withdrawals,
    exchangeRecords: data.exchangeRecords,
    fxRates: data.fxRates,
    holdings: data.holdings,
  }
}

export function importBackup(backup: AppBackup): AppData {
  if (
    !Array.isArray(backup.accounts) ||
    !Array.isArray(backup.ipos) ||
    !Array.isArray(backup.subscriptions) ||
    !Array.isArray(backup.allotments) ||
    !Array.isArray(backup.sellRecords)
  ) {
    throw new Error('备份文件结构不完整')
  }

  const allotments = new Map(
    backup.allotments.map((item) => [item.subscriptionId, item]),
  )
  const subscriptions = backup.subscriptions.map((subscription) => {
    const allotment = allotments.get(subscription.id)
    return {
      ...subscription,
      status: allotment?.status ?? subscription.status,
      allottedShares:
        allotment?.allottedShares ?? subscription.allottedShares ?? 0,
      allottedLots: allotment?.allottedLots ?? subscription.allottedLots ?? 0,
      sellPlan: allotment?.sellPlan ?? subscription.sellPlan ?? 'hold',
    }
  })

  return normalizeAppData({
    accounts: backup.accounts,
    ipos: backup.ipos,
    subscriptions,
    sales: backup.sellRecords,
    withdrawals: backup.withdrawals ?? [],
    exchangeRecords: backup.exchangeRecords ?? [],
    fxRates: backup.fxRates ?? EMPTY_FX_RATES,
    holdings: backup.holdings ?? [],
  })
}

export function loadAutoBackup(): AppData | null {
  const backup =
    readJson<AppBackup>(PREVIOUS_BACKUP_KEY) ??
    readJson<AppBackup>(AUTO_BACKUP_KEY)
  return backup ? importBackup(backup) : null
}

export function getAutoBackupTime() {
  return (
    readJson<AppBackup>(PREVIOUS_BACKUP_KEY)?.exportedAt ??
    readJson<AppBackup>(AUTO_BACKUP_KEY)?.exportedAt ??
    null
  )
}

export function backupBeforeImport(data: AppData) {
  try {
    const backup = createBackup(data)
    window.localStorage.setItem(
      PREVIOUS_BACKUP_KEY,
      JSON.stringify(backup),
    )
    const history =
      readJson<ImportBackupEntry[]>(IMPORT_BACKUP_HISTORY_KEY) ?? []
    const entry: ImportBackupEntry = {
      id: createId(),
      createdAt: new Date().toISOString(),
      backup,
    }
    window.localStorage.setItem(
      IMPORT_BACKUP_HISTORY_KEY,
      JSON.stringify([entry, ...history].slice(0, 20)),
    )
  } catch {
    // Import can continue even if browser storage cannot create another copy.
  }
}

export function getImportBackups() {
  return readJson<ImportBackupEntry[]>(IMPORT_BACKUP_HISTORY_KEY) ?? []
}

export function restoreImportBackup(id: string) {
  const entry = getImportBackups().find((item) => item.id === id)
  return entry ? importBackup(entry.backup) : null
}

export function deleteImportBackup(id: string) {
  try {
    const next = getImportBackups().filter((item) => item.id !== id)
    window.localStorage.setItem(
      IMPORT_BACKUP_HISTORY_KEY,
      JSON.stringify(next),
    )
    return next
  } catch {
    return getImportBackups()
  }
}
