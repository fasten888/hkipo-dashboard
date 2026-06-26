import type { Account, AccountStats } from '../types/account'
import type { Ipo } from '../types/ipo'
import type { Sale } from '../types/sale'
import type { Subscription } from '../types/subscription'
import type { SubscriptionMethod } from '../types/subscription'
import type { Withdrawal } from '../types/withdrawal'
import { getSubscriptionMethod } from './subscriptionMethod'

export interface SubscriptionMetrics {
  issueCost: number
  fee: number
  commissions: number
  investedCost: number
  saleIncome: number
  soldShares: number
  remainingShares: number
  netProfit: number
  profitRate: number
}

export interface IpoStats {
  participantCount: number
  winnerCount: number
  winRate: number
  totalProfit: number
  totalIssueCost: number
  profitRate: number
}

export interface SystemStats {
  accountCount: number
  participationCount: number
  winCount: number
  winRate: number
  totalInvestment: number
  totalCost: number
  totalProfit: number
  profitRate: number
}

export interface SaleTypeStats {
  profit: number
  winRate: number
  averageProfitRate: number
  averageHoldingDays: number
  count: number
}

export interface PerformanceSummary {
  monthProfit: number
  yearProfit: number
  overallWinRate: number
  averageProfitRate: number
  averageHoldingDays: number
}

export interface FinancingStats {
  method: SubscriptionMethod
  participationCount: number
  winCount: number
  winRate: number
  totalProfit: number
  averageProfit: number
  averageProfitRate: number
}

export interface AccountHealth {
  score: number
  label: '优秀' | '良好' | '一般' | '待优化'
  consecutiveLosses: number
  latestWinDate: string
  latestProfit: number
  latestActivityDate: string
}

export type TrendPeriod = 'month' | 'quarter' | 'year'

export interface ProfitTrendPoint {
  label: string
  profit: number
  cumulativeProfit: number
}

export interface IndustryStats {
  industry: string
  participationCount: number
  winCount: number
  winRate: number
  totalProfit: number
}

export function getSubscriptionMetrics(
  subscription: Subscription,
  ipo: Ipo | undefined,
  sales: Sale[],
): SubscriptionMetrics {
  const relatedSales = sales.filter(
    (sale) => sale.subscriptionId === subscription.id,
  )
  const soldShares = relatedSales.reduce((total, sale) => total + sale.shares, 0)
  const saleIncome = relatedSales.reduce(
    (total, sale) => total + sale.shares * sale.price,
    0,
  )
  const commissions = relatedSales.reduce(
    (total, sale) => total + (sale.commission ?? 0),
    0,
  )
  const issuePrice = ipo?.issuePrice ?? 0
  const issueCost = soldShares * issuePrice
  const netProfit = saleIncome - issueCost - subscription.fee - commissions
  const investedCost = issueCost + subscription.fee + commissions

  return {
    issueCost,
    fee: subscription.fee,
    commissions,
    investedCost,
    saleIncome,
    soldShares,
    remainingShares: Math.max(0, subscription.allottedShares - soldShares),
    netProfit,
    profitRate: investedCost > 0 ? (netProfit / investedCost) * 100 : 0,
  }
}

export function getAccountStats(
  account: Account,
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[] = [],
  withdrawals: Withdrawal[] = [],
): AccountStats {
  const records = subscriptions.filter((item) => item.accountId === account.id)
  const decided = records.filter(
    (item) => item.status === 'won' || item.status === 'lost',
  )
  const recordedWins = records.filter(
    (item) => item.status === 'won',
  ).length
  const totalProfit = records.reduce((total, subscription) => {
    const ipo = ipos.find((item) => item.id === subscription.ipoId)
    return total + getSubscriptionMetrics(subscription, ipo, sales).netProfit
  }, 0)
  const participationCount = account.legacyParticipationCount + records.length
  const winCount = account.legacyWinCount + recordedWins
  const winRateBase = account.legacyParticipationCount + decided.length
  const withdrawalTotal = withdrawals
    .filter((item) => item.accountId === account.id)
    .reduce((total, item) => total + item.amount, 0)
  const investedCapital = Math.max(0, account.initialDeposit - withdrawalTotal)

  return {
    participationCount,
    winCount,
    winRate: winRateBase > 0 ? (winCount / winRateBase) * 100 : 0,
    totalProfit,
    profitRate:
      investedCapital > 0
        ? (totalProfit / investedCapital) * 100
        : 0,
    withdrawalTotal,
    actualProfit:
      account.currentAssets + withdrawalTotal - account.initialDeposit,
  }
}

export function getIpoStats(
  ipo: Ipo,
  subscriptions: Subscription[],
  sales: Sale[],
): IpoStats {
  const records = subscriptions.filter((item) => item.ipoId === ipo.id)
  const winners = records.filter((item) => item.status === 'won')
  const decided = records.filter(
    (item) => item.status === 'won' || item.status === 'lost',
  )
  const winnerAccounts = new Set(winners.map((item) => item.accountId))
  const decidedAccounts = new Set(decided.map((item) => item.accountId))
  const metrics = records.map((item) =>
    getSubscriptionMetrics(item, ipo, sales),
  )
  const totalProfit = metrics.reduce((total, item) => total + item.netProfit, 0)
  const totalIssueCost = metrics.reduce(
    (total, item) => total + item.investedCost,
    0,
  )

  return {
    participantCount: new Set(records.map((item) => item.accountId)).size,
    winnerCount: winnerAccounts.size,
    winRate:
      decidedAccounts.size > 0
        ? (winnerAccounts.size / decidedAccounts.size) * 100
        : 0,
    totalProfit,
    totalIssueCost,
    profitRate:
      totalIssueCost > 0 ? (totalProfit / totalIssueCost) * 100 : 0,
  }
}

export function getSystemStats(
  accounts: Account[],
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
): SystemStats {
  const decided = subscriptions.filter(
    (item) => item.status === 'won' || item.status === 'lost',
  )
  const winCount = subscriptions.filter(
    (item) => item.status === 'won',
  ).length
  const legacyParticipation = accounts.reduce(
    (total, item) => total + item.legacyParticipationCount,
    0,
  )
  const legacyWins = accounts.reduce(
    (total, item) => total + item.legacyWinCount,
    0,
  )
  const totalProfit = subscriptions.reduce((total, subscription) => {
    const ipo = ipos.find((item) => item.id === subscription.ipoId)
    return total + getSubscriptionMetrics(subscription, ipo, sales).netProfit
  }, 0)
  const totalInvestment = subscriptions.reduce(
    (total, item) => total + item.subscriptionAmount + item.fee,
    0,
  )
  const totalCost =
    subscriptions.reduce((total, item) => total + item.fee, 0) +
    sales.reduce((total, item) => total + (item.commission ?? 0), 0)

  return {
    accountCount: accounts.length,
    participationCount: legacyParticipation + subscriptions.length,
    winCount: legacyWins + winCount,
    winRate:
      legacyParticipation + decided.length > 0
        ? ((legacyWins + winCount) /
            (legacyParticipation + decided.length)) *
          100
        : 0,
    totalInvestment,
    totalCost,
    totalProfit,
    profitRate:
      totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0,
  }
}

export function getSaleTypeStats(
  method: Sale['method'],
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
): SaleTypeStats {
  const rows = sales
    .filter((sale) => sale.method === method)
    .map((sale) => {
      const subscription = subscriptions.find(
        (item) => item.id === sale.subscriptionId,
      )
      const ipo = ipos.find((item) => item.id === subscription?.ipoId)
      const cost =
        sale.shares * (ipo?.issuePrice ?? 0) + (sale.commission ?? 0)
      const totalSoldShares = sales
        .filter((item) => item.subscriptionId === sale.subscriptionId)
        .reduce((total, item) => total + item.shares, 0)
      const allocatedFee =
        totalSoldShares > 0
          ? ((subscription?.fee ?? 0) * sale.shares) / totalSoldShares
          : 0
      const profit =
        sale.shares * (sale.price - (ipo?.issuePrice ?? 0)) -
        allocatedFee -
        (sale.commission ?? 0)
      const holdingDays = daysBetween(ipo?.listingDate ?? '', sale.date)
      return {
        profit,
        profitRate:
          cost + allocatedFee > 0
            ? (profit / (cost + allocatedFee)) * 100
            : 0,
        holdingDays,
      }
    })
  const count = rows.length

  return {
    count,
    profit: rows.reduce((total, row) => total + row.profit, 0),
    winRate:
      count > 0
        ? (rows.filter((row) => row.profit > 0).length / count) * 100
        : 0,
    averageProfitRate:
      count > 0
        ? rows.reduce((total, row) => total + row.profitRate, 0) / count
        : 0,
    averageHoldingDays:
      count > 0
        ? rows.reduce((total, row) => total + row.holdingDays, 0) / count
        : 0,
  }
}

export function getPerformanceSummary(
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
  now = new Date(),
): PerformanceSummary {
  const monthPrefix = now.toISOString().slice(0, 7)
  const yearPrefix = now.toISOString().slice(0, 4)
  const saleRows = sales.map((sale) => ({
    sale,
    ...getSaleProfitRow(sale, subscriptions, ipos, sales),
  }))
  const soldSubscriptionIds = new Set(sales.map((sale) => sale.subscriptionId))
  const soldSubscriptions = subscriptions.filter((item) =>
    soldSubscriptionIds.has(item.id),
  )
  const profitable = soldSubscriptions.filter((subscription) => {
    const ipo = ipos.find((item) => item.id === subscription.ipoId)
    return getSubscriptionMetrics(subscription, ipo, sales).netProfit > 0
  })

  return {
    monthProfit: saleRows
      .filter((row) => row.sale.date.startsWith(monthPrefix))
      .reduce((total, row) => total + row.profit, 0),
    yearProfit: saleRows
      .filter((row) => row.sale.date.startsWith(yearPrefix))
      .reduce((total, row) => total + row.profit, 0),
    overallWinRate:
      soldSubscriptions.length > 0
        ? (profitable.length / soldSubscriptions.length) * 100
        : 0,
    averageProfitRate:
      saleRows.length > 0
        ? saleRows.reduce((total, row) => total + row.profitRate, 0) /
          saleRows.length
        : 0,
    averageHoldingDays:
      saleRows.length > 0
        ? saleRows.reduce((total, row) => total + row.holdingDays, 0) /
          saleRows.length
        : 0,
  }
}

export function getFinancingStats(
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
  accounts: Account[] = [],
): FinancingStats[] {
  const methods: SubscriptionMethod[] = ['cash', '10x']
  return methods.map((method) => {
    const records = subscriptions.filter((item) =>
      getSubscriptionMethod(
        item,
        accounts.find((account) => account.id === item.accountId),
      ) === method,
    )
    const decided = records.filter(
      (item) => item.status === 'won' || item.status === 'lost',
    )
    const wins = records.filter((item) => item.status === 'won')
    const metrics = records.map((subscription) => {
      const ipo = ipos.find((item) => item.id === subscription.ipoId)
      return getSubscriptionMetrics(subscription, ipo, sales)
    })
    const totalProfit = metrics.reduce(
      (total, metric) => total + metric.netProfit,
      0,
    )
    const rates = metrics.filter(
      (metric) => metric.investedCost > 0,
    )
    return {
      method,
      participationCount: records.length,
      winCount: wins.length,
      winRate: decided.length > 0 ? (wins.length / decided.length) * 100 : 0,
      totalProfit,
      averageProfit: records.length > 0 ? totalProfit / records.length : 0,
      averageProfitRate:
        rates.length > 0
          ? rates.reduce((total, metric) => total + metric.profitRate, 0) /
            rates.length
          : 0,
    }
  })
}

export function getProfitTrend(
  period: TrendPeriod,
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
): ProfitTrendPoint[] {
  const changes = new Map<string, number>()
  sales.forEach((sale) => {
    if (!sale.date) return
    const label = trendPeriodLabel(sale.date, period)
    const row = getSaleProfitRow(sale, subscriptions, ipos, sales)
    changes.set(label, (changes.get(label) ?? 0) + row.profit)
  })
  let cumulativeProfit = 0
  return [...changes.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, profit]) => {
      cumulativeProfit += profit
      return { label, profit, cumulativeProfit }
    })
}

export function getIndustryStats(
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
): IndustryStats[] {
  const industries = new Map<string, Subscription[]>()
  ipos.forEach((ipo) => {
    const industry = ipo.industry.trim() || '未分类'
    const records = subscriptions.filter((item) => item.ipoId === ipo.id)
    industries.set(industry, [
      ...(industries.get(industry) ?? []),
      ...records,
    ])
  })

  return [...industries.entries()]
    .map(([industry, records]) => {
      const decided = records.filter(
        (item) => item.status === 'won' || item.status === 'lost',
      )
      const wins = records.filter((item) => item.status === 'won')
      const metrics = records.map((subscription) =>
        getSubscriptionMetrics(
          subscription,
          ipos.find((ipo) => ipo.id === subscription.ipoId),
          sales,
        ),
      )
      const totalProfit = metrics.reduce(
        (total, metric) => total + metric.netProfit,
        0,
      )
      return {
        industry,
        participationCount: records.length,
        winCount: wins.length,
        winRate: decided.length > 0 ? (wins.length / decided.length) * 100 : 0,
        totalProfit,
      }
    })
    .sort((left, right) => right.totalProfit - left.totalProfit)
}

export function getAccountHealth(
  account: Account,
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
): AccountHealth {
  const records = subscriptions
    .filter((item) => item.accountId === account.id)
    .sort((a, b) => b.subscriptionDate.localeCompare(a.subscriptionDate))
  const decided = records.filter(
    (item) => item.status === 'won' || item.status === 'lost',
  )
  let consecutiveLosses = 0
  for (const record of decided) {
    if (record.status === 'won') break
    consecutiveLosses += 1
  }
  const latestWin = records.find((item) => item.status === 'won')
  const latestSale = sales
    .filter((sale) =>
      records.some((record) => record.id === sale.subscriptionId),
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const latestSaleSubscription = records.find(
    (item) => item.id === latestSale?.subscriptionId,
  )
  const latestSaleIpo = ipos.find(
    (item) => item.id === latestSaleSubscription?.ipoId,
  )
  const latestProfit = latestSaleSubscription
    ? getSubscriptionMetrics(latestSaleSubscription, latestSaleIpo, sales)
        .netProfit
    : 0
  const winRate =
    decided.length > 0
      ? (decided.filter((item) => item.status === 'won').length /
          decided.length) *
        100
      : 0
  const totalProfit = records.reduce((total, subscription) => {
    const ipo = ipos.find((item) => item.id === subscription.ipoId)
    return total + getSubscriptionMetrics(subscription, ipo, sales).netProfit
  }, 0)
  const profitRate =
    account.initialDeposit > 0 ? (totalProfit / account.initialDeposit) * 100 : 0
  const activityDates = [records[0]?.subscriptionDate, latestSale?.date]
    .filter((value): value is string => Boolean(value))
    .sort()
  const latestActivityDate = activityDates[activityDates.length - 1] ?? ''
  const recentDays = latestActivityDate
    ? daysBetween(latestActivityDate, new Date().toISOString().slice(0, 10))
    : 999
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Math.min(records.length, 20) * 1.5 +
          Math.min(winRate, 30) +
          Math.max(-10, Math.min(profitRate, 30)) +
          Math.max(0, 20 - consecutiveLosses * 3) +
          (recentDays <= 45 ? 10 : recentDays <= 120 ? 5 : 0),
      ),
    ),
  )

  return {
    score,
    label:
      score >= 80
        ? '优秀'
        : score >= 65
          ? '良好'
          : score >= 45
            ? '一般'
            : '待优化',
    consecutiveLosses,
    latestWinDate:
      latestWin &&
      (ipos.find((item) => item.id === latestWin.ipoId)?.listingDate ||
        latestWin.subscriptionDate) ||
      '',
    latestProfit,
    latestActivityDate,
  }
}

function getSaleProfitRow(
  sale: Sale,
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
) {
  const subscription = subscriptions.find(
    (item) => item.id === sale.subscriptionId,
  )
  const ipo = ipos.find((item) => item.id === subscription?.ipoId)
  const cost = sale.shares * (ipo?.issuePrice ?? 0)
  const totalSoldShares = sales
    .filter((item) => item.subscriptionId === sale.subscriptionId)
    .reduce((total, item) => total + item.shares, 0)
  const fee =
    totalSoldShares > 0
      ? ((subscription?.fee ?? 0) * sale.shares) / totalSoldShares
      : 0
  const profit =
    sale.shares * (sale.price - (ipo?.issuePrice ?? 0)) -
    fee -
    (sale.commission ?? 0)
  return {
    profit,
    profitRate:
      cost + fee + (sale.commission ?? 0) > 0
        ? (profit / (cost + fee + (sale.commission ?? 0))) * 100
        : 0,
    holdingDays: daysBetween(ipo?.listingDate ?? '', sale.date),
  }
}

function daysBetween(start: string, end: string) {
  const startTime = Date.parse(start)
  const endTime = Date.parse(end)
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0
  return Math.max(0, Math.round((endTime - startTime) / 86_400_000))
}

function trendPeriodLabel(date: string, period: TrendPeriod) {
  const year = date.slice(0, 4)
  if (period === 'year') return year
  const month = Number(date.slice(5, 7))
  if (period === 'quarter') {
    return `${year}-Q${Math.max(1, Math.ceil(month / 3))}`
  }
  return date.slice(0, 7)
}

export function groupMonthly(
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
) {
  const months = new Map<
    string,
    { month: string; participation: number; wins: number; profit: number }
  >()
  const ensure = (date: string) => {
    const month = date.slice(0, 7)
    const existing = months.get(month) ?? {
      month,
      participation: 0,
      wins: 0,
      profit: 0,
    }
    months.set(month, existing)
    return existing
  }
  subscriptions.forEach((item) => {
    if (!item.subscriptionDate) return
    const bucket = ensure(item.subscriptionDate)
    bucket.participation += 1
    if (item.status === 'won') bucket.wins += 1
  })
  sales.forEach((sale) => {
    const subscription = subscriptions.find(
      (item) => item.id === sale.subscriptionId,
    )
    if (!subscription) return
    const bucket = ensure(sale.date)
    const ipo = ipos.find((item) => item.id === subscription.ipoId)
    bucket.profit +=
      sale.shares * (sale.price - (ipo?.issuePrice ?? 0)) -
      (sale.commission ?? 0)
  })
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month))
}
