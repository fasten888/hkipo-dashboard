import type { Ipo } from '../types/ipo'
import type { Sale, SaleMethod } from '../types/sale'
import type { Subscription } from '../types/subscription'

export interface SaleStrategyStats {
  method: SaleMethod
  count: number
  profitCount: number
  lossCount: number
  totalProfit: number
  averageProfit: number
  averageProfitRate: number
  winRate: number
}

export interface MonthlyReview {
  month: string
  participation: number
  wins: number
  losses: number
  winRate: number
  profit: number
  profitRate: number
  bestIpoName: string
  bestIpoProfit: number
  worstIpoName: string
  worstIpoProfit: number
}

export function getSaleStrategyStats(
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
): SaleStrategyStats[] {
  const methods: SaleMethod[] = ['grey_market', 'first_day', 'held_sale']
  return methods.map((method) => {
    const rows = sales
      .filter((sale) => sale.method === method)
      .map((sale) => getSaleRow(sale, subscriptions, ipos, sales))
    const count = rows.length
    const totalProfit = rows.reduce((total, row) => total + row.profit, 0)
    const profitCount = rows.filter((row) => row.profit > 0).length
    const lossCount = rows.filter((row) => row.profit < 0).length
    return {
      method,
      count,
      profitCount,
      lossCount,
      totalProfit,
      averageProfit: count > 0 ? totalProfit / count : 0,
      averageProfitRate:
        count > 0
          ? rows.reduce((total, row) => total + row.profitRate, 0) / count
          : 0,
      winRate: count > 0 ? (profitCount / count) * 100 : 0,
    }
  })
}

export function getMonthlyReviews(
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
): MonthlyReview[] {
  const months = new Set<string>()
  subscriptions.forEach((item) => {
    if (item.subscriptionDate) months.add(item.subscriptionDate.slice(0, 7))
  })
  sales.forEach((sale) => {
    if (sale.date) months.add(sale.date.slice(0, 7))
  })
  return [...months]
    .sort((left, right) => right.localeCompare(left))
    .map((month) => {
      const monthSubscriptions = subscriptions.filter((item) =>
        item.subscriptionDate.startsWith(month),
      )
      const decided = monthSubscriptions.filter(
        (item) => item.status === 'won' || item.status === 'lost',
      )
      const wins = monthSubscriptions.filter(
        (item) => item.status === 'won',
      ).length
      const losses = monthSubscriptions.filter(
        (item) => item.status === 'lost',
      ).length
      const monthSales = sales.filter((sale) => sale.date.startsWith(month))
      const saleRows = monthSales.map((sale) => ({
        sale,
        ...getSaleRow(sale, subscriptions, ipos, sales),
      }))
      const profit = saleRows.reduce((total, row) => total + row.profit, 0)
      const cost = saleRows.reduce((total, row) => total + row.cost, 0)
      const ipoProfits = new Map<string, number>()
      saleRows.forEach((row) => {
        const subscription = subscriptions.find(
          (item) => item.id === row.sale.subscriptionId,
        )
        if (!subscription) return
        ipoProfits.set(
          subscription.ipoId,
          (ipoProfits.get(subscription.ipoId) ?? 0) + row.profit,
        )
      })
      const rankedIpos = [...ipoProfits.entries()].sort(
        ([, left], [, right]) => right - left,
      )
      const best = rankedIpos[0]
      const worst = rankedIpos[rankedIpos.length - 1]
      return {
        month,
        participation: monthSubscriptions.length,
        wins,
        losses,
        winRate: decided.length > 0 ? (wins / decided.length) * 100 : 0,
        profit,
        profitRate: cost > 0 ? (profit / cost) * 100 : 0,
        bestIpoName:
          ipos.find((ipo) => ipo.id === best?.[0])?.name ?? '暂无',
        bestIpoProfit: best?.[1] ?? 0,
        worstIpoName:
          ipos.find((ipo) => ipo.id === worst?.[0])?.name ?? '暂无',
        worstIpoProfit: worst?.[1] ?? 0,
      }
    })
}

function getSaleRow(
  sale: Sale,
  subscriptions: Subscription[],
  ipos: Ipo[],
  sales: Sale[],
) {
  const subscription = subscriptions.find(
    (item) => item.id === sale.subscriptionId,
  )
  const ipo = ipos.find((item) => item.id === subscription?.ipoId)
  const issueCost = sale.shares * (ipo?.issuePrice ?? 0)
  const soldShares = sales
    .filter((item) => item.subscriptionId === sale.subscriptionId)
    .reduce((total, item) => total + item.shares, 0)
  const fee =
    soldShares > 0
      ? ((subscription?.fee ?? 0) * sale.shares) / soldShares
      : 0
  const cost = issueCost + fee + (sale.commission ?? 0)
  const profit = sale.shares * sale.price - cost
  return {
    cost,
    profit,
    profitRate: cost > 0 ? (profit / cost) * 100 : 0,
  }
}
