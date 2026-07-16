import { prisma } from './prisma.js'
import { containsChinese, getIpoDisplayName } from './ipoDisplayName.js'

type SubscriptionMethod = 'cash' | '10x'
type SubscriptionStatus = 'applied' | 'announced' | 'won' | 'lost'
type SellPlan = 'grey_market' | 'first_day' | 'hold'
type FundingSource = 'cash' | 'financing' | 'collateral' | 'mixed'

export type AccountInput = {
  name: string
  accountSuffix?: string
  phone?: string
  brokerName?: string
  securitiesAccount?: string
  initialDeposit?: number
  currentAssets?: number
  cashBalance?: number
  defaultSubscriptionMethod?: SubscriptionMethod
  remarks?: string
}

export type IpoInput = {
  name: string
  stockCode: string
  issuePrice?: number
  lotSize?: number
  subscriptionDate?: string
  listingDate?: string
  industry?: string
}

export type AccountIpoInput = {
  accountId: string
  ipoId: string
  method?: SubscriptionMethod
  subscriptionMethod?: SubscriptionMethod
  subscriptionAmount?: number
  fee?: number
  subscriptionDate?: string
  remarks?: string
  status?: SubscriptionStatus
  allottedShares?: number
  allottedLots?: number
  sellPlan?: SellPlan
  fundingSource?: FundingSource
}

export type SaleInput = {
  subscriptionId: string
  price?: number
  date?: string
  shares?: number
  method?: string
  commission?: number
  remarks?: string
}

export type WithdrawalInput = {
  accountId: string
  date?: string
  amount?: number
  remarks?: string
}

export type ExchangeRecordInput = {
  accountId: string
  date?: string
  sourceCurrency?: string
  sourceAmount?: number
  sourceAmountCny?: number
  targetCurrency?: string
  targetAmount?: number
  exchangeRate?: number
  manualRate?: number | null
  originalCostCny?: number
  feeCny?: number
  channel?: string
  remarks?: string
}

export async function getAppDataSnapshot() {
  const [accounts, ipos, accountIpos, sellRecords, withdrawals, exchangeRecords] = await Promise.all([
    prisma.account.findMany({
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.ipo.findMany({
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.accountIpo.findMany({
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.sellRecord.findMany({
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.withdrawal.findMany({
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.exchangeRecord.findMany({
      orderBy: [{ createdAt: 'desc' }],
    }),
  ])

  return {
    version: 3 as const,
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      accountSuffix: account.accountSuffix ?? '',
      phone: account.phone ?? '',
      brokerName: account.broker ?? '',
      securitiesAccount: account.securitiesAccount ?? '',
      initialDeposit: account.initialDeposit,
      currentAssets: account.currentAssets || account.cash,
      cashBalance: account.cash,
      exchangeRecordId: '',
      defaultSubscriptionMethod: normalizeMethod(account.defaultSubscriptionMethod),
      legacyParticipationCount: 0,
      legacyWinCount: 0,
      remarks: account.note ?? '',
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    })),
    ipos: ipos.map((ipo) => ({
      id: ipo.id,
      name: getIpoDisplayName(ipo),
      stockCode: ipo.code,
      issuePrice: ipo.offerPriceMax ?? ipo.offerPriceMin ?? 0,
      lotSize: ipo.lotSize ?? 0,
      subscriptionDate: toDateInput(ipo.subscribeStart),
      listingDate: toDateInput(ipo.listingDate),
      industry: ipo.industry ?? '',
      createdAt: ipo.createdAt.toISOString(),
      updatedAt: ipo.updatedAt.toISOString(),
    })),
    subscriptions: accountIpos.map((record) => {
      const method = normalizeMethod(record.subscriptionMethod)
      return {
        id: record.id,
        accountId: record.accountId,
        ipoId: record.ipoId,
        method,
        subscriptionMethod: method,
        subscriptionAmount: record.applyAmount,
        fee: record.commission,
        subscriptionDate: toDateInput(record.subscriptionDate),
        remarks: record.remarks ?? '',
        status: normalizeStatus(record.status),
        allottedShares: record.allottedShares,
        allottedLots: record.allottedLots,
        sellPlan: normalizeSellPlan(record.sellPlan),
        fundingSource: method === 'cash' ? 'cash' : 'financing',
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }
    }),
    sales: sellRecords.map((sale) => ({
      id: sale.id,
      subscriptionId: sale.accountIpoId,
      price: sale.price,
      date: toDateInput(sale.date),
      shares: sale.shares,
      method: normalizeSaleMethod(sale.method),
      commission: sale.commission,
      remarks: sale.remarks ?? '',
      createdAt: sale.createdAt.toISOString(),
      updatedAt: sale.updatedAt.toISOString(),
    })),
    withdrawals: withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      accountId: withdrawal.accountId,
      date: toDateInput(withdrawal.date),
      amount: withdrawal.amount,
      remarks: withdrawal.remarks ?? '',
      createdAt: withdrawal.createdAt.toISOString(),
      updatedAt: withdrawal.updatedAt.toISOString(),
    })),
    exchangeRecords: exchangeRecords.map((record) => ({
      id: record.id,
      accountId: record.accountId,
      date: toDateInput(record.date),
      sourceCurrency: normalizeCurrency(record.sourceCurrency),
      sourceAmount: record.sourceAmount,
      sourceAmountCny: record.sourceAmountCny,
      targetCurrency: normalizeCurrency(record.targetCurrency),
      targetAmount: record.targetAmount,
      exchangeRate: record.exchangeRate,
      manualRate: record.manualRate,
      originalCostCny: record.originalCostCny,
      feeCny: record.feeCny,
      channel: normalizeExchangeChannel(record.channel),
      remarks: record.remarks ?? '',
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
    fxRates: { HKD: 0, USD: 0, updatedAt: '' },
    holdings: [],
  }
}

export async function createAccountRecord(input: AccountInput) {
  return prisma.account.create({
    data: accountData(input),
  })
}

export async function updateAccountRecord(id: string, input: AccountInput) {
  return prisma.account.update({
    where: { id },
    data: accountData(input),
  })
}

export async function deleteAccountRecord(id: string) {
  return prisma.account.delete({ where: { id } })
}

export async function createIpoRecord(input: IpoInput) {
  return prisma.ipo.create({
    data: ipoData(input),
  })
}

export async function updateIpoRecord(id: string, input: IpoInput) {
  return prisma.ipo.update({
    where: { id },
    data: ipoData(input),
  })
}

export async function deleteIpoRecord(id: string) {
  return prisma.ipo.delete({ where: { id } })
}

export async function createAccountIpoRecord(input: AccountIpoInput) {
  return prisma.accountIpo.create({
    data: accountIpoData(input),
  })
}

export async function updateAccountIpoRecord(id: string, input: AccountIpoInput) {
  return prisma.accountIpo.update({
    where: { id },
    data: accountIpoData(input),
  })
}

export async function deleteAccountIpoRecord(id: string) {
  return prisma.accountIpo.delete({ where: { id } })
}

export async function batchUpdateAccountIpoRecords(
  ids: string[],
  data: Partial<AccountIpoInput> & { listingDate?: string },
) {
  const updateData: Record<string, unknown> = {}
  if (data.method || data.subscriptionMethod) {
    updateData.subscriptionMethod = normalizeMethod(data.subscriptionMethod ?? data.method)
  }
  if (data.subscriptionDate !== undefined) {
    updateData.subscriptionDate = dateOrNull(data.subscriptionDate)
  }
  if (data.remarks !== undefined) updateData.remarks = data.remarks
  if (data.status !== undefined) updateData.status = normalizeStatus(data.status)
  if (data.allottedShares !== undefined) updateData.allottedShares = numberOrZero(data.allottedShares)
  if (data.allottedLots !== undefined) updateData.allottedLots = numberOrZero(data.allottedLots)
  if (data.sellPlan !== undefined) updateData.sellPlan = normalizeSellPlan(data.sellPlan)
  if (data.subscriptionAmount !== undefined) updateData.applyAmount = numberOrZero(data.subscriptionAmount)
  if (data.fee !== undefined) {
    updateData.commission = numberOrZero(data.fee)
    updateData.financingFee = 0
  }

  return prisma.accountIpo.updateMany({
    where: { id: { in: ids } },
    data: updateData,
  })
}

export async function batchDeleteAccountIpoRecords(ids: string[]) {
  return prisma.accountIpo.deleteMany({
    where: { id: { in: ids } },
  })
}

export async function createSaleRecord(input: SaleInput) {
  return prisma.sellRecord.create({ data: saleData(input) })
}

export async function updateSaleRecord(id: string, input: SaleInput) {
  return prisma.sellRecord.update({ where: { id }, data: saleData(input) })
}

export async function deleteSaleRecord(id: string) {
  return prisma.sellRecord.delete({ where: { id } })
}

export async function createWithdrawalRecord(input: WithdrawalInput) {
  return prisma.withdrawal.create({ data: withdrawalData(input) })
}

export async function updateWithdrawalRecord(id: string, input: WithdrawalInput) {
  return prisma.withdrawal.update({ where: { id }, data: withdrawalData(input) })
}

export async function deleteWithdrawalRecord(id: string) {
  return prisma.withdrawal.delete({ where: { id } })
}

export async function createExchangeRecord(input: ExchangeRecordInput) {
  return prisma.exchangeRecord.create({ data: exchangeRecordData(input) })
}

export async function updateExchangeRecord(id: string, input: ExchangeRecordInput) {
  return prisma.exchangeRecord.update({ where: { id }, data: exchangeRecordData(input) })
}

export async function deleteExchangeRecord(id: string) {
  return prisma.exchangeRecord.delete({ where: { id } })
}

function accountData(input: AccountInput) {
  const broker = input.brokerName?.trim() || null
  return {
    name: input.name.trim(),
    accountSuffix: input.accountSuffix?.trim() || null,
    phone: input.phone?.trim() || '',
    broker,
    securitiesAccount: input.securitiesAccount?.trim() || null,
    initialDeposit: numberOrZero(input.initialDeposit),
    currentAssets: numberOrZero(input.currentAssets),
    cash: numberOrZero(input.cashBalance ?? input.currentAssets),
    defaultSubscriptionMethod: normalizeMethod(input.defaultSubscriptionMethod),
    note: input.remarks?.trim() || null,
  }
}

function ipoData(input: IpoInput) {
  const issuePrice = numberOrZero(input.issuePrice)
  const name = input.name.trim()
  return {
    code: input.stockCode.trim().toUpperCase(),
    name,
    displayNameCn: containsChinese(name) ? name : null,
    displayNameEn: containsChinese(name) ? null : name,
    status: 'active',
    industry: input.industry?.trim() || null,
    offerPriceMin: issuePrice,
    offerPriceMax: issuePrice,
    lotSize: numberOrZero(input.lotSize),
    lotAmount: issuePrice * numberOrZero(input.lotSize),
    subscribeStart: dateOrNull(input.subscriptionDate),
    subscribeEnd: dateOrNull(input.subscriptionDate),
    listingDate: dateOrNull(input.listingDate),
  }
}

function accountIpoData(input: AccountIpoInput) {
  const method = normalizeMethod(input.subscriptionMethod ?? input.method)
  const fee = numberOrZero(input.fee)
  return {
    accountId: input.accountId,
    ipoId: input.ipoId,
    applyAmount: numberOrZero(input.subscriptionAmount),
    status: normalizeStatus(input.status),
    subscriptionMethod: method,
    subscriptionDate: dateOrNull(input.subscriptionDate),
    remarks: input.remarks?.trim() || null,
    allottedShares: numberOrZero(input.allottedShares),
    allottedLots: numberOrZero(input.allottedLots),
    sellPlan: normalizeSellPlan(input.sellPlan),
    commission: fee,
    financingFee: 0,
  }
}

function saleData(input: SaleInput) {
  return {
    accountIpoId: input.subscriptionId,
    price: numberOrZero(input.price),
    date: dateOrNull(input.date),
    shares: numberOrZero(input.shares),
    method: input.method?.trim() || null,
    commission: numberOrZero(input.commission),
    remarks: input.remarks?.trim() || null,
  }
}

function withdrawalData(input: WithdrawalInput) {
  return {
    accountId: input.accountId,
    date: dateOrNull(input.date),
    amount: numberOrZero(input.amount),
    remarks: input.remarks?.trim() || null,
  }
}

function exchangeRecordData(input: ExchangeRecordInput) {
  return {
    accountId: input.accountId,
    date: dateOrNull(input.date),
    sourceCurrency: input.sourceCurrency?.trim() || 'CNY',
    sourceAmount: numberOrZero(input.sourceAmount),
    sourceAmountCny: numberOrZero(input.sourceAmountCny),
    targetCurrency: input.targetCurrency?.trim() || 'HKD',
    targetAmount: numberOrZero(input.targetAmount),
    exchangeRate: numberOrZero(input.exchangeRate),
    manualRate:
      input.manualRate === null || input.manualRate === undefined
        ? null
        : numberOrZero(input.manualRate),
    originalCostCny: numberOrZero(input.originalCostCny),
    feeCny: numberOrZero(input.feeCny),
    channel: input.channel?.trim() || null,
    remarks: input.remarks?.trim() || null,
  }
}

function normalizeMethod(value?: string | null): SubscriptionMethod {
  return value === 'cash' || value === '现金' ? 'cash' : '10x'
}

function normalizeStatus(value?: string | null): SubscriptionStatus {
  if (value === 'won' || value === 'lost' || value === 'announced') return value
  return 'applied'
}

function normalizeSellPlan(value?: string | null): SellPlan {
  if (value === 'grey_market' || value === 'first_day') return value
  return 'hold'
}

function normalizeSaleMethod(value?: string | null) {
  if (value === 'grey_market' || value === 'first_day' || value === 'held_sale') {
    return value
  }
  return 'held_sale'
}

function normalizeCurrency(value?: string | null) {
  if (value === 'CNY' || value === 'HKD' || value === 'USD') return value
  return 'HKD'
}

function normalizeExchangeChannel(value?: string | null) {
  if (
    value === 'boc_hk' ||
    value === 'za_bank' ||
    value === 'futu' ||
    value === 'chief' ||
    value === 'cash' ||
    value === 'other'
  ) {
    return value
  }
  return 'other'
}

function numberOrZero(value?: number | null) {
  return Number.isFinite(value) ? Number(value) : 0
}

function dateOrNull(value?: string | null) {
  return value ? new Date(`${value}T00:00:00`) : null
}

function toDateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : ''
}
