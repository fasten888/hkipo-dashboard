import type { AppData } from '../types/store'
import { formatAccountNamePlain } from '../utils/account'
import { getAccountStats, getSubscriptionMetrics } from '../utils/statistics'

function escapeCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const content = rows.map((row) => row.map(escapeCell).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${content}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportAccountHistoryCsv(accountId: string, data: AppData) {
  const account = data.accounts.find((item) => item.id === accountId)
  if (!account) return
  const subscriptions = data.subscriptions.filter(
    (item) => item.accountId === accountId,
  )
  const subscriptionIds = new Set(subscriptions.map((item) => item.id))
  const sales = data.sales.filter((item) =>
    subscriptionIds.has(item.subscriptionId),
  )
  const withdrawals = data.withdrawals.filter(
    (item) => item.accountId === accountId,
  )
  const exchanges = data.exchangeRecords.filter(
    (item) => item.accountId === accountId,
  )
  const holdings = data.holdings.filter((item) => item.accountId === accountId)

  downloadCsv(`${account.name}-${account.accountSuffix}-账户历史.csv`, [
    ['账户', formatAccountNamePlain(account)],
    ['参与次数', subscriptions.length],
    ['中签次数', subscriptions.filter((item) => item.status === 'won').length],
    [],
    ['参与记录'],
    ['新股', '申购日期', '申购方式', '申购金额', '手续费', '状态'],
    ...subscriptions.map((item) => [
      ipoName(data, item.ipoId),
      item.subscriptionDate,
      item.method,
      item.subscriptionAmount,
      item.fee,
      item.status,
    ]),
    [],
    ['中签记录'],
    ['新股', '中签股数', '中签手数'],
    ...subscriptions
      .filter((item) => item.status === 'won')
      .map((item) => [
        ipoName(data, item.ipoId),
        item.allottedShares,
        item.allottedLots,
      ]),
    [],
    ['卖出记录'],
    ['新股', '卖出日期', '卖出价格', '卖出股数', '卖出类型', '卖出佣金'],
    ...sales.map((sale) => {
      const subscription = subscriptions.find(
        (item) => item.id === sale.subscriptionId,
      )
      return [
        ipoName(data, subscription?.ipoId ?? ''),
        sale.date,
        sale.price,
        sale.shares,
        sale.method,
        sale.commission ?? 0,
      ]
    }),
    [],
    ['出金记录'],
    ['日期', '金额', '备注'],
    ...withdrawals.map((item) => [item.date, item.amount, item.remarks]),
    [],
    ['换汇记录'],
    ['日期', '原币种', '原币金额', '目标币种', '到账外币', '成交汇率', '人民币成本', '渠道', '备注'],
    ...exchanges.map((item) => [
      item.date,
      item.sourceCurrency,
      item.sourceAmount,
      item.targetCurrency,
      item.targetAmount,
      item.manualRate ?? item.exchangeRate,
      item.originalCostCny,
      item.channel,
      item.remarks,
    ]),
    [],
    ['持仓记录'],
    ['股票', '代码', '数量', '成本', '市值', '抵押率', '可融资额度'],
    ...holdings.map((item) => [
      item.stockName,
      item.stockCode,
      item.quantity,
      item.cost,
      item.marketValue,
      item.collateralRate,
      item.marketValue * item.collateralRate / 100,
    ]),
  ])
}

function accountName(data: AppData, id: string) {
  const account = data.accounts.find((item) => item.id === id)
  return account ? formatAccountNamePlain(account) : ''
}

function ipoName(data: AppData, id: string) {
  const ipo = data.ipos.find((item) => item.id === id)
  return ipo ? `${ipo.name}（${ipo.stockCode}）` : ''
}

export type ExportType =
  | 'accounts'
  | 'ipos'
  | 'subscriptions'
  | 'allotments'
  | 'sales'
  | 'exchanges'
  | 'holdings'
  | 'profits'

export function exportCsv(type: ExportType, data: AppData) {
  if (type === 'accounts') {
    downloadCsv('账户.csv', [
      [
        '账户名称',
        '账号后四位',
        '手机号',
        '券商名称',
        '证券账号',
        '初始入金',
        '当前资产',
        '现金余额',
        '备注',
      ],
      ...data.accounts.map((item) => [
        item.name,
        item.accountSuffix,
        item.phone,
        item.brokerName,
        item.securitiesAccount,
        item.initialDeposit,
        item.currentAssets,
        item.cashBalance ?? item.currentAssets,
        item.remarks,
      ]),
    ])
    return
  }
  if (type === 'ipos') {
    downloadCsv('新股.csv', [
      [
        '新股名称',
        '股票代码',
        '发行价',
        '一手股数',
        '申购日期',
        '上市日期',
        '行业',
      ],
      ...data.ipos.map((item) => [
        item.name,
        item.stockCode,
        item.issuePrice,
        item.lotSize,
        item.subscriptionDate,
        item.listingDate,
        item.industry,
      ]),
    ])
    return
  }
  if (type === 'subscriptions') {
    downloadCsv('申购记录.csv', [
      [
        '账户',
        '新股',
        '融资倍数',
        '申购金额',
        '手续费',
        '申购日期',
        '备注',
        '资金来源',
      ],
      ...data.subscriptions.map((item) => [
        accountName(data, item.accountId),
        ipoName(data, item.ipoId),
        item.method,
        item.subscriptionAmount,
        item.fee,
        item.subscriptionDate,
        item.remarks,
        item.fundingSource,
      ]),
    ])
    return
  }
  if (type === 'allotments') {
    downloadCsv('中签记录.csv', [
      ['账户', '新股', '状态', '中签股数', '中签手数'],
      ...data.subscriptions.map((item) => [
        accountName(data, item.accountId),
        ipoName(data, item.ipoId),
        {
          applied: '已申购',
          announced: '已公布',
          lost: '未中签',
          won: '已中签',
        }[
          item.status
        ],
        item.allottedShares,
        item.allottedLots,
      ]),
    ])
    return
  }
  if (type === 'sales') {
    downloadCsv('卖出记录.csv', [
      [
        '账户',
        '新股',
        '卖出日期',
        '卖出价格',
        '卖出股数',
        '卖出方式',
        '卖出佣金',
        '备注',
      ],
      ...data.sales.map((sale) => {
        const subscription = data.subscriptions.find(
          (item) => item.id === sale.subscriptionId,
        )
        return [
          accountName(data, subscription?.accountId ?? ''),
          ipoName(data, subscription?.ipoId ?? ''),
          sale.date,
          sale.price,
          sale.shares,
          {
            grey_market: '暗盘卖出',
            first_day: '首日卖出',
            held_sale: '持有后卖出',
          }[sale.method],
          sale.commission ?? 0,
          sale.remarks,
        ]
      }),
    ])
    return
  }
  if (type === 'exchanges') {
    downloadCsv('换汇记录.csv', [
      [
        '账户',
        '日期',
        '原币种',
        '原币金额',
        '目标币种',
        '到账外币',
        '实际/手动汇率',
        '原始人民币成本',
        '渠道',
        '换汇费用人民币',
        '备注',
      ],
      ...data.exchangeRecords.map((item) => [
        accountName(data, item.accountId),
        item.date,
        item.sourceCurrency,
        item.sourceAmount,
        item.targetCurrency,
        item.targetAmount,
        item.manualRate ?? item.exchangeRate,
        item.originalCostCny,
        item.channel,
        item.feeCny,
        item.remarks,
      ]),
    ])
    return
  }
  if (type === 'holdings') {
    downloadCsv('持仓记录.csv', [
      ['账户', '股票代码', '股票名称', '持仓数量', '持仓成本', '当前市值', '抵押率', '可融资额度', '备注'],
      ...data.holdings.map((item) => [
        accountName(data, item.accountId),
        item.stockCode,
        item.stockName,
        item.quantity,
        item.cost,
        item.marketValue,
        item.collateralRate,
        item.marketValue * item.collateralRate / 100,
        item.remarks,
      ]),
    ])
    return
  }

  downloadCsv('收益统计.csv', [
    ['账户', '参与次数', '中签次数', '中签率', '累计收益', '累计收益率'],
    ...data.accounts.map((account) => {
      const stats = getAccountStats(
        account,
        data.subscriptions,
        data.ipos,
        data.sales,
        data.withdrawals,
      )
      return [
        formatAccountNamePlain(account),
        stats.participationCount,
        stats.winCount,
        stats.winRate,
        stats.totalProfit,
        stats.profitRate,
      ]
    }),
    [],
    ['申购收益明细'],
    [
      '账户',
      '新股',
      '发行成本',
      '申购手续费',
      '卖出佣金',
      '卖出收入',
      '净收益',
      '收益率',
    ],
    ...data.subscriptions.map((subscription) => {
      const ipo = data.ipos.find((item) => item.id === subscription.ipoId)
      const metrics = getSubscriptionMetrics(subscription, ipo, data.sales)
      return [
        accountName(data, subscription.accountId),
        ipoName(data, subscription.ipoId),
        metrics.issueCost,
        metrics.fee,
        metrics.commissions,
        metrics.saleIncome,
        metrics.netProfit,
        metrics.profitRate,
      ]
    }),
  ])
}
