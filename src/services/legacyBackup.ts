import type { Account } from '../types/account'
import type { Ipo } from '../types/ipo'
import type { Sale, SaleMethod } from '../types/sale'
import type { AppData } from '../types/store'
import type {
  SellPlan,
  Subscription,
  SubscriptionMethod,
  SubscriptionStatus,
} from '../types/subscription'
import { createId } from '../utils/id'
import { normalizeIndustry } from '../utils/industry'
import { EMPTY_FX_RATES } from '../types/exchange'

type LegacyObject = Record<string, unknown>
export type LegacyImportMode = 'replace' | 'merge'

export interface LegacyImportSummary {
  legacyAccountCount: number
  legacyIpoCount: number
  legacyRecordCount: number
  legacyPartCount: number
  accountCount: number
  ipoCount: number
  subscriptionCount: number
  saleCount: number
  totalAccountCount: number
  totalIpoCount: number
  totalSubscriptionCount: number
  totalSaleCount: number
}

export interface LegacyImportResult {
  data: AppData
  summary: LegacyImportSummary
}

interface LegacyBackup {
  accounts: LegacyObject[]
  ipos: LegacyObject[]
  records: LegacyObject[]
  parts: LegacyObject[]
  state?: LegacyObject
}

export async function readLegacyBackup(
  file: File,
  current: AppData,
  mode: LegacyImportMode,
): Promise<LegacyImportResult> {
  const parsed = parseJson(await file.text())
  const backup = validateLegacyBackup(parsed)
  const imported = convertLegacyBackup(backup)
  const data =
    mode === 'replace' ? imported : mergeImportedData(current, imported)

  return {
    data,
    summary: {
      legacyAccountCount: backup.accounts.length,
      legacyIpoCount: backup.ipos.length,
      legacyRecordCount: backup.records.length,
      legacyPartCount: backup.parts.length,
      accountCount: imported.accounts.length,
      ipoCount: imported.ipos.length,
      subscriptionCount: imported.subscriptions.length,
      saleCount: imported.sales.length,
      totalAccountCount: data.accounts.length,
      totalIpoCount: data.ipos.length,
      totalSubscriptionCount: data.subscriptions.length,
      totalSaleCount: data.sales.length,
    },
  }
}

export function convertLegacyBackupObject(
  value: unknown,
  current: AppData,
  mode: LegacyImportMode,
): LegacyImportResult {
  const backup = validateLegacyBackup(value)
  const imported = convertLegacyBackup(backup)
  const data =
    mode === 'replace' ? imported : mergeImportedData(current, imported)

  return {
    data,
    summary: {
      legacyAccountCount: backup.accounts.length,
      legacyIpoCount: backup.ipos.length,
      legacyRecordCount: backup.records.length,
      legacyPartCount: backup.parts.length,
      accountCount: imported.accounts.length,
      ipoCount: imported.ipos.length,
      subscriptionCount: imported.subscriptions.length,
      saleCount: imported.sales.length,
      totalAccountCount: data.accounts.length,
      totalIpoCount: data.ipos.length,
      totalSubscriptionCount: data.subscriptions.length,
      totalSaleCount: data.sales.length,
    },
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('旧版备份文件不是有效的 JSON')
  }
}

function validateLegacyBackup(value: unknown): LegacyBackup {
  if (!isObject(value)) throw new Error('旧版备份文件结构无效')

  const accounts = asObjectArray(value.accounts)
  const ipos = asObjectArray(value.ipos)
  const records = asObjectArray(value.records)
  const parts = asObjectArray(value.parts)

  if (!accounts || !ipos || !records || !parts) {
    throw new Error('旧版备份必须包含 accounts、ipos、records 和 parts')
  }

  return {
    accounts,
    ipos,
    records,
    parts,
    state: isObject(value.state) ? value.state : undefined,
  }
}

function convertLegacyBackup(backup: LegacyBackup): AppData {
  const now = new Date().toISOString()
  const accountIdMap = new Map<string, string>()
  const ipoIdMap = new Map<string, string>()
  const partSubscriptionIdMap = new Map<string, string>()
  const stateAccounts = asObjectArray(backup.state?.accounts) ?? []
  const stateAccountMap = new Map(
    stateAccounts.map((account) => [text(account, ['id']), account]),
  )

  const accounts = backup.accounts.map<Account>((source) => {
    const sourceId = text(source, ['id', 'accountId', '账户ID'])
    const stateAccount = stateAccountMap.get(sourceId)
    const id = createId()
    register(accountIdMap, sourceId, id)
    register(
      accountIdMap,
      text(source, ['holderName', 'name', 'accountName', '账户名称']),
      id,
    )
    const securitiesAccount =
      text(source, [
        'accountNo',
        'securitiesAccount',
        'accountNumber',
        '证券账号',
      ]) ||
      text(stateAccount ?? {}, ['accountNo', 'securitiesAccount'])
    const name =
      text(source, ['holderName', 'name', 'accountName', '账户名称']) ||
      text(stateAccount ?? {}, ['name'])
    const accountSuffix =
      digits(
        text(source, ['accountSuffix', 'last4', '账号后四位']) ||
          securitiesAccount,
      ).slice(-4) || suffixFromName(name)
    register(
      accountIdMap,
      accountSuffix,
      id,
    )
    const initialDeposit = number(source, [
      'initCapital',
      'initialDeposit',
      'deposit',
      '初始入金',
    ])

    return {
      id,
      name: name || '未命名账户',
      accountSuffix,
      phone: text(source, ['phone', 'mobile', '手机号']),
      brokerName:
        text(source, ['brokerName', 'broker', '券商名称']) ||
        text(stateAccount ?? {}, ['broker', 'brokerName']),
      securitiesAccount,
      initialDeposit,
      currentAssets:
        number(source, ['currentAssets', 'assets', '当前资产']) ||
        initialDeposit,
      defaultSubscriptionMethod: subscriptionMethod(source),
      legacyParticipationCount: 0,
      legacyWinCount: 0,
      remarks:
        text(source, ['notes', 'remarks', 'remark', '备注']) ||
        text(stateAccount ?? {}, ['note', 'notes']),
      createdAt: dateTime(source, ['createdAt', '创建时间']) || now,
      updatedAt: dateTime(source, ['updatedAt', '更新时间']) || now,
    }
  })

  const ipos = backup.ipos.map<Ipo>((source) => {
    const sourceId = text(source, ['id', 'ipoId', 'stockId', '新股ID'])
    const id = createId()
    register(ipoIdMap, sourceId, id)
    register(ipoIdMap, text(source, ['name', 'ipoName', '新股名称']), id)
    register(ipoIdMap, text(source, ['stockCode', 'code', '股票代码']), id)

    return {
      id,
      name: text(source, ['name', 'ipoName', '新股名称']) || '未命名新股',
      stockCode: text(source, ['stockCode', 'code', '股票代码']),
      issuePrice: number(source, ['issuePrice', 'price', '发行价']),
      lotSize: integer(source, ['lotSize', 'sharesPerLot', '一手股数']),
      subscriptionDate: date(source, [
        'subDate',
        'subscriptionDate',
        'applyDate',
        '申购日期',
      ]),
      listingDate: date(source, ['listDate', 'listingDate', '上市日期']),
      industry: normalizeIndustry(
        text(source, ['industry', 'sector', 'category', '行业', '赛道']),
        source.tags,
      ),
      createdAt: dateTime(source, ['createdAt', '创建时间']) || now,
      updatedAt: dateTime(source, ['updatedAt', '更新时间']) || now,
    }
  })

  const subscriptions = backup.parts.map<Subscription>((source) => {
    const sourceId = text(source, ['id', 'partId', '记录ID'])
    const id = createId()
    register(partSubscriptionIdMap, sourceId, id)

    const accountId = resolveReference(
      accountIdMap,
      source,
      ['accountId', '账户ID'],
      ['accountName', 'account', '账户名称', '账户'],
      ['accountSuffix', 'last4', '账号后四位'],
    )
    const ipoId = resolveReference(
      ipoIdMap,
      source,
      ['ipoId', 'stockId', '新股ID'],
      ['ipoName', 'stockName', 'newStockName', '新股名称', '新股'],
      ['stockCode', 'code', '股票代码'],
    )
    const status = subscriptionStatus(source)
    const ipo = ipos.find((item) => item.id === ipoId)
    const allottedShares = integer(source, [
      'hitShares',
      'allottedShares',
      'winShares',
      '中签股数',
    ])
    const salePrice = number(source, ['sellPrice', 'price', '卖出价格'])
    const fee = legacyPartFee(source, ipo, allottedShares, salePrice)

    const method = subscriptionMethod(source)
    return {
      id,
      accountId,
      ipoId,
      method,
      subscriptionMethod: method,
      subscriptionAmount:
        number(source, ['subscriptionAmount', 'amount', '申购金额']) ||
        (ipo?.issuePrice ?? 0) * (ipo?.lotSize ?? 0),
      fee,
      subscriptionDate:
        date(source, ['subDate', 'subscriptionDate', 'applyDate', '申购日期']) ||
        ipo?.subscriptionDate ||
        '',
      remarks: text(source, ['notes', 'remarks', 'remark', '备注']),
      status,
      allottedShares,
      allottedLots:
        integer(source, ['allottedLots', 'winLots', '中签手数']) ||
        (ipo?.lotSize
          ? Math.ceil(allottedShares / ipo.lotSize)
          : 0),
      sellPlan: sellPlan(source),
      fundingSource:
        subscriptionMethod(source) === 'cash' ? 'cash' : 'financing',
      createdAt: dateTime(source, ['createdAt', '创建时间']) || now,
      updatedAt: dateTime(source, ['updatedAt', '更新时间']) || now,
    }
  })

  const subscriptionKeys = new Set(
    subscriptions.map((item) => `${item.accountId}|${item.ipoId}`),
  )

  backup.records.forEach((source) => {
    const ipoId = resolveRecordIpoId(source, ipoIdMap)
    const ipo = ipos.find((item) => item.id === ipoId)
    const entries = asObjectArray(source.accountEntries) ?? []

    entries.forEach((entry) => {
      const accountId = resolveReference(
        accountIdMap,
        entry,
        ['accountId', '账户ID'],
        ['accountName', 'account', '账户名称', '账户'],
        [],
      )
      const key = `${accountId}|${ipoId}`
      if (!accountId || !ipoId || subscriptionKeys.has(key)) return

      const lots = integer(entry, ['lots', 'applicationLots', '申购手数']) || 1
      const method = subscriptionMethod(entry)
      subscriptions.push({
        id: createId(),
        accountId,
        ipoId,
        method,
        subscriptionMethod: method,
        subscriptionAmount:
          lots * (ipo?.lotSize ?? 0) * (ipo?.issuePrice ?? 0),
        fee: number(entry, ['marginFee', 'fee', 'handlingFee', '手续费']),
        subscriptionDate:
          date(source, ['subDate', 'subscriptionDate', 'applyDate', '申购日期']) ||
          ipo?.subscriptionDate ||
          '',
        remarks: text(source, ['notes', 'remarks', 'remark', '备注']),
        status: subscriptionStatus(source),
        allottedShares: 0,
        allottedLots: 0,
        sellPlan: sellPlan(source),
        fundingSource:
          subscriptionMethod(source) === 'cash' ? 'cash' : 'financing',
        createdAt: dateTime(source, ['createdAt', '创建时间']) || now,
        updatedAt: dateTime(source, ['updatedAt', '更新时间']) || now,
      })
      subscriptionKeys.add(key)
    })
  })

  const sales = backup.parts
    .map<Sale | null>((source) => {
      const linkedId =
        partSubscriptionIdMap.get(
          normalizeKey(text(source, ['id', 'partId', '记录ID'])),
        ) || ''
      const price = number(source, ['sellPrice', 'price', '卖出价格'])
      const shares = integer(source, [
        'hitShares',
        'sellShares',
        'shares',
        'quantity',
        '卖出股数',
      ])
      if (!linkedId || price <= 0 || shares <= 0) return null

      return {
        id: createId(),
        subscriptionId: linkedId,
        price,
        date: date(source, ['sellDate', 'date', '卖出日期']),
        shares,
        method: saleMethod(source),
        remarks: text(source, ['notes', 'remarks', 'remark', '备注']),
        createdAt: dateTime(source, ['createdAt', '创建时间']) || now,
        updatedAt: dateTime(source, ['updatedAt', '更新时间']) || now,
      }
    })
    .filter((sale): sale is Sale => sale !== null)

  return {
    version: 3,
    accounts,
    ipos,
    subscriptions,
    sales,
    withdrawals: [],
    exchangeRecords: [],
    fxRates: EMPTY_FX_RATES,
    holdings: [],
  }
}

function mergeImportedData(current: AppData, imported: AppData): AppData {
  const accountMap = new Map<string, string>()
  const ipoMap = new Map<string, string>()
  const subscriptionMap = new Map<string, string>()

  const accounts = current.accounts.filter(
    (account) => !isBrokenLegacyPlaceholder(account),
  )
  const validCurrentAccountIds = new Set(accounts.map((account) => account.id))
  const validCurrentIpoIds = new Set(current.ipos.map((ipo) => ipo.id))
  const validCurrentSubscriptions = current.subscriptions.filter(
    (subscription) =>
      validCurrentAccountIds.has(subscription.accountId) &&
      validCurrentIpoIds.has(subscription.ipoId),
  )
  const validCurrentSubscriptionIds = new Set(
    validCurrentSubscriptions.map((subscription) => subscription.id),
  )

  imported.accounts.forEach((account) => {
    const existingIndex = accounts.findIndex(
      (item) =>
        (item.name.trim() === account.name.trim() &&
          item.accountSuffix === account.accountSuffix) ||
        (account.securitiesAccount &&
          item.securitiesAccount === account.securitiesAccount),
    )
    if (existingIndex >= 0) {
      const existing = accounts[existingIndex]
      accounts[existingIndex] = {
        ...account,
        id: existing.id,
        createdAt: existing.createdAt,
      }
      accountMap.set(account.id, existing.id)
    } else {
      accounts.push(account)
      accountMap.set(account.id, account.id)
    }
  })

  const ipos = [...current.ipos]
  imported.ipos.forEach((ipo) => {
    const existingIndex = ipos.findIndex(
      (item) =>
        (ipo.stockCode && item.stockCode === ipo.stockCode) ||
        (item.name.trim() === ipo.name.trim() &&
          item.listingDate === ipo.listingDate),
    )
    if (existingIndex >= 0) {
      const existing = ipos[existingIndex]
      ipos[existingIndex] = {
        ...ipo,
        id: existing.id,
        createdAt: existing.createdAt,
      }
      ipoMap.set(ipo.id, existing.id)
    } else {
      ipos.push(ipo)
      ipoMap.set(ipo.id, ipo.id)
    }
  })

  const subscriptions = [...validCurrentSubscriptions]
  imported.subscriptions.forEach((subscription) => {
    const next = {
      ...subscription,
      accountId: accountMap.get(subscription.accountId) ?? subscription.accountId,
      ipoId: ipoMap.get(subscription.ipoId) ?? subscription.ipoId,
    }
    const existingIndex = subscriptions.findIndex(
      (item) =>
        item.accountId === next.accountId &&
        item.ipoId === next.ipoId &&
        item.subscriptionDate === next.subscriptionDate,
    )
    if (existingIndex >= 0) {
      const existing = subscriptions[existingIndex]
      subscriptions[existingIndex] = {
        ...next,
        id: existing.id,
        createdAt: existing.createdAt,
      }
      subscriptionMap.set(subscription.id, existing.id)
    } else {
      subscriptions.push(next)
      subscriptionMap.set(subscription.id, next.id)
    }
  })

  const sales = current.sales.filter((sale) =>
    validCurrentSubscriptionIds.has(sale.subscriptionId),
  )
  imported.sales.forEach((sale) => {
    const next = {
      ...sale,
      subscriptionId:
        subscriptionMap.get(sale.subscriptionId) ?? sale.subscriptionId,
    }
    const duplicate = sales.some(
      (item) =>
        item.subscriptionId === next.subscriptionId &&
        item.date === next.date &&
        item.price === next.price &&
        item.shares === next.shares,
    )
    if (!duplicate) sales.push(next)
  })

  return {
    version: 3,
    accounts,
    ipos,
    subscriptions,
    sales,
    withdrawals: current.withdrawals.filter((withdrawal) =>
      accounts.some((account) => account.id === withdrawal.accountId),
    ),
    exchangeRecords: current.exchangeRecords.filter((record) =>
      accounts.some((account) => account.id === record.accountId),
    ),
    fxRates: current.fxRates,
    holdings: current.holdings.filter((holding) =>
      accounts.some((account) => account.id === holding.accountId),
    ),
  }
}

function isBrokenLegacyPlaceholder(account: Account) {
  return (
    account.name === '未命名账户' &&
    account.accountSuffix === '0000' &&
    account.initialDeposit === 0 &&
    account.securitiesAccount === ''
  )
}

function subscriptionMethod(source: LegacyObject): SubscriptionMethod {
  const raw = text(source, [
    'subMethod',
    'method',
    'subscriptionMethod',
    'financingMultiple',
    'marginPct',
    '申购方式',
    '融资倍数',
  ]).toLowerCase()
  if (raw.includes('cash') || raw.includes('现金') || raw === '0') return 'cash'
  return '10x'
}

function subscriptionStatus(source: LegacyObject): SubscriptionStatus {
  const raw = text(source, [
    'hitStatus',
    'status',
    'allotmentStatus',
    'result',
    '状态',
    '中签状态',
  ]).toLowerCase()
  if (
    raw.includes('未中') ||
    raw === 'lost' ||
    raw === 'miss' ||
    raw === 'no' ||
    raw === 'false'
  ) {
    return 'lost'
  }
  if (
    raw.includes('中签') ||
    raw === 'won' ||
    raw === 'hit' ||
    raw === 'win' ||
    raw === 'true'
  ) {
    return 'won'
  }
  if (raw.includes('公布') || raw === 'announced') return 'announced'
  return 'applied'
}

function sellPlan(source: LegacyObject): SellPlan {
  const raw = text(source, [
    'sellType',
    'sellPlan',
    'sellMethod',
    '卖出方式',
  ]).toLowerCase()
  if (raw.includes('暗盘') || raw.includes('grey') || raw === 'dark') {
    return 'grey_market'
  }
  if (raw.includes('首日') || raw.includes('first') || raw === 'listing') {
    return 'first_day'
  }
  return 'hold'
}

function saleMethod(source: LegacyObject): SaleMethod {
  const raw = text(source, [
    'sellType',
    'method',
    'sellMethod',
    '卖出方式',
  ]).toLowerCase()
  if (raw.includes('暗盘') || raw.includes('grey') || raw === 'dark') {
    return 'grey_market'
  }
  if (raw.includes('首日') || raw.includes('first') || raw === 'listing') {
    return 'first_day'
  }
  return 'held_sale'
}

function resolveRecordIpoId(
  source: LegacyObject,
  ipoIdMap: Map<string, string>,
) {
  return resolveReference(
    ipoIdMap,
    source,
    ['ipoId', 'stockId', '新股ID'],
    ['ipoName', 'stockName', 'name', '新股名称', '新股'],
    ['stockCode', 'code', '股票代码'],
  )
}

function legacyPartFee(
  source: LegacyObject,
  ipo: Ipo | undefined,
  allottedShares: number,
  salePrice: number,
) {
  const explicitFees =
    number(source, ['marginFee', 'fee', 'handlingFee', '手续费']) +
    number(source, ['otherFees', '其他费用'])
  const legacyNetProfit = number(source, ['netProfit', 'profit', '净收益'])

  if (legacyNetProfit && ipo && allottedShares && salePrice) {
    const grossProfit = (salePrice - ipo.issuePrice) * allottedShares
    return Math.max(0, roundMoney(grossProfit - legacyNetProfit))
  }
  if (explicitFees > 0) return roundMoney(explicitFees)
  return subscriptionMethod(source) === 'cash' ? 0 : 100
}

function resolveReference(
  map: Map<string, string>,
  source: LegacyObject,
  idKeys: string[],
  nameKeys: string[],
  fallbackKeys: string[],
) {
  for (const value of [
    text(source, idKeys),
    text(source, nameKeys),
    text(source, fallbackKeys),
  ]) {
    const resolved = map.get(normalizeKey(value))
    if (resolved) return resolved
  }
  return ''
}

function register(map: Map<string, string>, sourceValue: string, id: string) {
  if (sourceValue) map.set(normalizeKey(sourceValue), id)
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}

function text(source: LegacyObject, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'boolean') return String(value)
  }
  return ''
}

function number(source: LegacyObject, keys: string[]) {
  const value = text(source, keys).replace(/[,￥$HKD港币\s]/gi, '')
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function integer(source: LegacyObject, keys: string[]) {
  return Math.max(0, Math.round(number(source, keys)))
}

function digits(value: string) {
  return value.replace(/\D/g, '')
}

function suffixFromName(name: string) {
  const nameDigits = digits(name)
  return nameDigits ? nameDigits.slice(-4).padStart(4, '0') : '0000'
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function date(source: LegacyObject, keys: string[]) {
  const value = text(source, keys)
  if (!value) return ''
  const match = value.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/)
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toISOString().slice(0, 10)
}

function dateTime(source: LegacyObject, keys: string[]) {
  const value = text(source, keys)
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

function asObjectArray(value: unknown) {
  if (!Array.isArray(value)) return null
  return value.filter(isObject)
}

function isObject(value: unknown): value is LegacyObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
