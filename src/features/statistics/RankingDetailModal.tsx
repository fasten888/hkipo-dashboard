import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { usePrivacy } from '../../hooks/usePrivacy'
import type { Account } from '../../types/account'
import type { Ipo } from '../../types/ipo'
import type { Sale } from '../../types/sale'
import type { Subscription } from '../../types/subscription'
import { formatAccountName } from '../../utils/account'
import { formatHKD, formatPercent } from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import { getSubscriptionMetrics } from '../../utils/statistics'
import {
  getSubscriptionMethod,
  getSubscriptionMethodLabel,
} from '../../utils/subscriptionMethod'

export interface RankingDetailTarget {
  scope: 'account' | 'ipo'
  outcome: 'won' | 'lost'
  id: string
}

type DetailSort = 'date_desc' | 'date_asc' | 'profit_desc' | 'profit_asc'

export function RankingDetailModal({
  target,
  accounts,
  ipos,
  subscriptions,
  sales,
  onClose,
}: {
  target: RankingDetailTarget | null
  accounts: Account[]
  ipos: Ipo[]
  subscriptions: Subscription[]
  sales: Sale[]
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<DetailSort>('date_desc')
  const { settings: privacySettings } = usePrivacy()

  useEffect(() => {
    setSearch('')
    setSort('date_desc')
  }, [target])

  const rows = useMemo(() => {
    if (!target) return []
    const query = search.trim().toLowerCase()
    return subscriptions
      .filter((item) =>
        target.outcome === 'won'
          ? item.status === 'won'
          : item.status !== 'won',
      )
      .filter((item) =>
        target.scope === 'account'
          ? item.accountId === target.id
          : item.ipoId === target.id,
      )
      .map((subscription) => {
        const account = accounts.find(
          (item) => item.id === subscription.accountId,
        )
        const ipo = ipos.find((item) => item.id === subscription.ipoId)
        const metrics = getSubscriptionMetrics(subscription, ipo, sales)
        const relatedSales = sales.filter(
          (sale) => sale.subscriptionId === subscription.id,
        )
        const soldShares = relatedSales.reduce(
          (total, sale) => total + sale.shares,
          0,
        )
        const averageSellPrice =
          soldShares > 0
            ? relatedSales.reduce(
                (total, sale) => total + sale.price * sale.shares,
                0,
              ) / soldShares
            : 0
        return {
          id: subscription.id,
          account: formatAccountName(account, privacySettings),
          ipo: ipo ? `${ipo.name}（${ipo.stockCode}）` : '-',
          date: subscription.subscriptionDate,
          listingDate: ipo?.listingDate ?? '',
          method: getSubscriptionMethodLabel(
            getSubscriptionMethod(subscription, account),
          ),
          shares: subscription.allottedShares,
          profit: metrics.netProfit,
          profitRate: metrics.profitRate,
          sellPrice: averageSellPrice,
        }
      })
      .filter(
        (row) =>
          !query ||
          row.account.toLowerCase().includes(query) ||
          row.ipo.toLowerCase().includes(query),
      )
      .sort((a, b) => {
        if (sort === 'date_desc') return b.date.localeCompare(a.date)
        if (sort === 'date_asc') return a.date.localeCompare(b.date)
        if (sort === 'profit_desc') return b.profit - a.profit
        return a.profit - b.profit
      })
  }, [
    accounts,
    ipos,
    privacySettings,
    sales,
    search,
    sort,
    subscriptions,
    target,
  ])

  const title = getTitle(target, accounts, ipos)

  return (
    <Modal open={Boolean(target)} title={title} onClose={onClose}>
      <div className="border-b border-slate-100 p-5 sm:px-7">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              placeholder="搜索新股或账户"
              className="focus-ring w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            value={sort}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"
            onChange={(event) => setSort(event.target.value as DetailSort)}
          >
            <option value="date_desc">日期：最新</option>
            <option value="date_asc">日期：最早</option>
            <option value="profit_desc">收益：从高到低</option>
            <option value="profit_asc">收益：从低到高</option>
          </select>
        </div>
      </div>

      <div className="max-h-[62vh] overflow-y-auto p-5 sm:px-7">
        {rows.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
            暂无匹配记录
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {target?.scope === 'account' ? row.ipo : row.account}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      申购日期 {row.date || '-'}
                      {target?.outcome === 'won' && (
                        <> · 上市日期 {row.listingDate || '-'}</>
                      )}
                    </p>
                  </div>
                  {target?.outcome === 'won' && (
                    <div className="text-left sm:text-right">
                      <p
                        className={`text-sm font-bold ${getProfitColor(
                          row.profit,
                        )}`}
                      >
                        {formatHKD(row.profit, 'profit')}
                      </p>
                      <p
                        className={`mt-1 text-xs ${getProfitColor(
                          row.profitRate,
                        )}`}
                      >
                        {formatPercent(row.profitRate, 'profitRate')}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  {target?.scope === 'account' &&
                    target.outcome === 'lost' && (
                      <>
                        <span>申购方式 {row.method}</span>
                        <span>参与账户 {row.account}</span>
                      </>
                    )}
                  {target?.outcome === 'won' && (
                    <>
                      <span>中签股数 {row.shares} 股</span>
                      <span>
                        卖出价格{' '}
                        {row.sellPrice > 0
                          ? formatHKD(row.sellPrice)
                          : '持有中'}
                      </span>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function getTitle(
  target: RankingDetailTarget | null,
  accounts: Account[],
  ipos: Ipo[],
) {
  if (!target) return '排行榜明细'
  const subject =
    target.scope === 'account'
      ? formatAccountName(accounts.find((item) => item.id === target.id))
      : ipos.find((item) => item.id === target.id)?.name || '新股'
  if (target.scope === 'account') {
    return `【${subject}全部${target.outcome === 'won' ? '中签' : '未中签'}记录】`
  }
  return `【${subject}${target.outcome === 'won' ? '中签' : '未中签'}账户】`
}
