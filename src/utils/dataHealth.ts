import type { AppData } from '../types/store'
import type { HealthIssue, HealthRepairResult } from '../types/health'
import { getSubscriptionMetrics } from './statistics'

export function inspectDataHealth(data: AppData): HealthIssue[] {
  const issues: HealthIssue[] = []
  const add = (
    type: string,
    severity: HealthIssue['severity'],
    title: string,
    detail: string,
    objectName: string,
    fixable: boolean,
  ) =>
    issues.push({
      id: `${type}-${issues.length}`,
      type,
      severity,
      title,
      detail,
      objectName,
      fixable,
    })

  data.subscriptions.forEach((subscription) => {
    const ipo = data.ipos.find((item) => item.id === subscription.ipoId)
    const account = data.accounts.find(
      (item) => item.id === subscription.accountId,
    )
    const soldShares = data.sales
      .filter((sale) => sale.subscriptionId === subscription.id)
      .reduce((total, sale) => total + sale.shares, 0)
    const name = `${ipo?.name ?? '未知新股'} / ${account?.name ?? '未知账户'}`
    if (soldShares > subscription.allottedShares) {
      add(
        'oversold',
        'high',
        '卖出股数大于中签股数',
        `已卖 ${soldShares} 股，中签 ${subscription.allottedShares} 股`,
        name,
        true,
      )
    }
    if (subscription.status === 'won' && subscription.allottedShares <= 0) {
      const canDerive =
        subscription.allottedLots > 0 && (ipo?.lotSize ?? 0) > 0
      add(
        'zero-allotment',
        'high',
        '已中签但中签股数为 0',
        canDerive
          ? `可按 ${subscription.allottedLots} 手 × ${ipo?.lotSize} 股自动补全`
          : '缺少可推导的中签手数或每手股数',
        name,
        canDerive,
      )
    }
    const metrics = getSubscriptionMetrics(subscription, ipo, data.sales)
    if (metrics.profitRate > 1000 || metrics.profitRate < -100) {
      add(
        'abnormal-rate',
        'medium',
        '收益率异常',
        `当前收益率 ${metrics.profitRate.toFixed(1)}%`,
        name,
        false,
      )
    }
    if (
      subscription.subscriptionAmount < 0 ||
      subscription.fee < 0 ||
      subscription.allottedShares < 0 ||
      subscription.allottedLots < 0
    ) {
      add(
        'negative-subscription',
        'high',
        '申购记录存在负数',
        '申购金额、手续费或中签数量不能为负数',
        name,
        true,
      )
    }
  })

  findDuplicates(
    data.sales,
    (sale) =>
      [
        sale.subscriptionId,
        sale.date,
        sale.price,
        sale.shares,
        sale.method,
      ].join('|'),
  ).forEach((sale) =>
    add(
      'duplicate-sale',
      'medium',
      '重复卖出记录',
      `${sale.date} · ${sale.shares} 股 × ${sale.price}`,
      data.ipos.find(
        (ipo) =>
          ipo.id ===
          data.subscriptions.find(
            (subscription) => subscription.id === sale.subscriptionId,
          )?.ipoId,
      )?.name ?? '未知新股',
      true,
    ),
  )

  findDuplicates(
    data.subscriptions,
    (item) =>
      [
        item.accountId,
        item.ipoId,
        item.subscriptionDate,
        item.method,
        item.subscriptionAmount,
      ].join('|'),
  ).forEach((item) =>
    add(
      'duplicate-subscription',
      'medium',
      '重复申购记录',
      `${item.subscriptionDate} · ${item.method} · ${item.subscriptionAmount}`,
      data.ipos.find((ipo) => ipo.id === item.ipoId)?.name ?? '未知新股',
      false,
    ),
  )

  findDuplicates(
    data.accounts,
    (account) =>
      `${account.name.trim().toLowerCase()}|${account.accountSuffix}`,
  ).forEach((account) =>
    add(
      'duplicate-account',
      'medium',
      '重复账户',
      `${account.name}（${account.accountSuffix}）`,
      account.name || '未命名账户',
      false,
    ),
  )

  data.ipos.forEach((ipo) => {
    if (ipo.issuePrice <= 0) {
      add(
        'missing-price',
        'high',
        '缺失发行价',
        '发行价为空或不大于 0',
        ipo.name || ipo.stockCode,
        false,
      )
    }
    if (!ipo.listingDate) {
      add(
        'missing-listing-date',
        'medium',
        '缺失上市日期',
        '请补充上市日期',
        ipo.name || ipo.stockCode,
        false,
      )
    }
    if (ipo.issuePrice < 0 || ipo.lotSize < 0) {
      add(
        'negative-ipo',
        'high',
        '新股资料存在负数',
        '发行价或每手股数不能为负数',
        ipo.name || ipo.stockCode,
        true,
      )
    }
  })

  data.accounts.forEach((account) => {
    if (!account.name.trim()) {
      add(
        'empty-account-name',
        'high',
        '账户名称为空',
        `账号后四位 ${account.accountSuffix || '****'}`,
        '未命名账户',
        true,
      )
    }
    if (account.initialDeposit < 0 || account.currentAssets < 0) {
      add(
        'negative-account',
        'high',
        '账户金额存在负数',
        '初始入金或当前资产不能为负数',
        account.name || '未命名账户',
        true,
      )
    }
  })

  data.sales.forEach((sale) => {
    if (sale.price < 0 || sale.shares < 0) {
      add(
        'negative-sale',
        'high',
        '卖出记录存在负数',
        '卖出价格或股数不能为负数',
        sale.date,
        true,
      )
    }
  })

  data.withdrawals.forEach((withdrawal) => {
    if (withdrawal.amount < 0) {
      add(
        'negative-withdrawal',
        'high',
        '出金金额为负数',
        `${withdrawal.date} · ${withdrawal.amount}`,
        data.accounts.find((item) => item.id === withdrawal.accountId)?.name ??
          '未知账户',
        true,
      )
    }
  })

  return issues
}

export function repairDataHealth(data: AppData): {
  data: AppData
  result: HealthRepairResult
} {
  let fixedCount = 0
  const duplicateSaleIds = new Set(
    findDuplicates(
      data.sales,
      (sale) =>
        [
          sale.subscriptionId,
          sale.date,
          sale.price,
          sale.shares,
          sale.method,
        ].join('|'),
    ).map((sale) => sale.id),
  )
  fixedCount += duplicateSaleIds.size
  const sales = data.sales
    .filter((sale) => !duplicateSaleIds.has(sale.id))
    .map((sale) => {
      const next = {
        ...sale,
        price: Math.max(0, sale.price),
        shares: Math.max(0, sale.shares),
      }
      if (next.price !== sale.price || next.shares !== sale.shares) {
        fixedCount += 1
      }
      return next
    })

  const subscriptions = data.subscriptions.map((subscription) => {
    const ipo = data.ipos.find((item) => item.id === subscription.ipoId)
    const soldShares = sales
      .filter((sale) => sale.subscriptionId === subscription.id)
      .reduce((total, sale) => total + sale.shares, 0)
    let allottedShares = Math.max(0, subscription.allottedShares)
    if (
      subscription.status === 'won' &&
      allottedShares === 0 &&
      subscription.allottedLots > 0 &&
      (ipo?.lotSize ?? 0) > 0
    ) {
      allottedShares = subscription.allottedLots * (ipo?.lotSize ?? 0)
      fixedCount += 1
    }
    if (soldShares > allottedShares) {
      allottedShares = soldShares
      fixedCount += 1
    }
    const next = {
      ...subscription,
      subscriptionAmount: Math.max(0, subscription.subscriptionAmount),
      fee: Math.max(0, subscription.fee),
      allottedShares,
      allottedLots: Math.max(0, subscription.allottedLots),
    }
    if (
      next.subscriptionAmount !== subscription.subscriptionAmount ||
      next.fee !== subscription.fee ||
      next.allottedLots !== subscription.allottedLots
    ) {
      fixedCount += 1
    }
    return next
  })

  const accounts = data.accounts.map((account, index) => {
    const next = {
      ...account,
      name: account.name.trim() || `未命名账户${index + 1}`,
      initialDeposit: Math.max(0, account.initialDeposit),
      currentAssets: Math.max(0, account.currentAssets),
    }
    if (
      next.name !== account.name ||
      next.initialDeposit !== account.initialDeposit ||
      next.currentAssets !== account.currentAssets
    ) {
      fixedCount += 1
    }
    return next
  })

  const ipos = data.ipos.map((ipo) => {
    const next = {
      ...ipo,
      issuePrice: Math.max(0, ipo.issuePrice),
      lotSize: Math.max(0, ipo.lotSize),
    }
    if (next.issuePrice !== ipo.issuePrice || next.lotSize !== ipo.lotSize) {
      fixedCount += 1
    }
    return next
  })
  const withdrawals = data.withdrawals.map((withdrawal) => {
    if (withdrawal.amount >= 0) return withdrawal
    fixedCount += 1
    return { ...withdrawal, amount: 0 }
  })

  return {
    data: {
      ...data,
      accounts,
      ipos,
      subscriptions,
      sales,
      withdrawals,
    },
    result: {
      fixedCount,
      dataChanged: fixedCount > 0,
    },
  }
}

function findDuplicates<T extends { id: string; createdAt: string }>(
  rows: T[],
  keyOf: (row: T) => string,
) {
  const seen = new Set<string>()
  return [...rows]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .filter((row) => {
      const key = keyOf(row)
      if (seen.has(key)) return true
      seen.add(key)
      return false
    })
}
