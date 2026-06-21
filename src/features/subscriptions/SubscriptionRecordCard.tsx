import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Account } from '../../types/account'
import type { Ipo } from '../../types/ipo'
import type { Sale } from '../../types/sale'
import type { Subscription } from '../../types/subscription'
import { formatAccountName } from '../../utils/account'
import type { SubscriptionMetrics } from '../../utils/statistics'
import {
  formatHKD,
  formatPercent,
  formatSignedHKD,
} from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import {
  getSubscriptionMethod,
  getSubscriptionMethodLabel,
} from '../../utils/subscriptionMethod'
import { getFundingSourceLabel } from '../../utils/fundingSource'

export function SubscriptionRecordCard({
  subscription,
  account,
  ipo,
  metrics,
  sales,
  onEdit,
  onDelete,
  onAddSale,
  onEditSale,
  onDeleteSale,
  selectionEnabled = false,
  selected = false,
  onToggleSelection,
}: {
  subscription: Subscription
  account?: Account
  ipo?: Ipo
  metrics: SubscriptionMetrics
  sales: Sale[]
  onEdit: () => void
  onDelete: () => void
  onAddSale: () => void
  onEditSale: (sale: Sale) => void
  onDeleteSale: (sale: Sale) => void
  selectionEnabled?: boolean
  selected?: boolean
  onToggleSelection?: () => void
}) {
  const canSell =
    subscription.status === 'won' && metrics.remainingShares > 0

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-card ${
        selected ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200/80'
      }`}
    >
      <div className="flex items-start gap-4">
        {selectionEnabled && (
          <label className="flex h-9 shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={selected}
              aria-label={`选择 ${ipo?.name ?? '申购记录'}`}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              onChange={onToggleSelection}
            />
          </label>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-900">
              {ipo?.name ?? '已删除新股'}（{ipo?.stockCode ?? '-'}）
            </h3>
            <StatusBadge status={subscription.status} />
            {subscription.status === 'won' &&
              metrics.remainingShares > 0 && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  持有 {metrics.remainingShares} 股
                </span>
              )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {account ? formatAccountName(account) : '已删除账户'}{' '}
            · {subscription.subscriptionDate}
          </p>
          {subscription.remarks && (
            <p className="mt-2 text-xs text-slate-400">{subscription.remarks}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 xl:min-w-[600px]">
          <Metric
            label="申购金额"
            value={formatHKD(subscription.subscriptionAmount, 'investment')}
          />
          <Metric
            label="发行成本"
            value={formatHKD(metrics.issueCost, 'investment')}
          />
          <Metric label="卖出收入" value={formatHKD(metrics.saleIncome)} />
          <Metric
            label="净收益"
            value={formatSignedHKD(metrics.netProfit, 'profit')}
            sub={formatPercent(metrics.profitRate, 'profitRate')}
            profitValue={metrics.netProfit}
          />
        </div>

        <div className="flex gap-2">
          {canSell && (
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 xl:flex-none"
              onClick={onAddSale}
            >
              <Plus size={14} />
              记录卖出
            </button>
          )}
          <button
            type="button"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            aria-label="编辑申购"
            onClick={onEdit}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="删除申购"
            onClick={onDelete}
          >
            <Trash2 size={16} />
          </button>
        </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
        <span>
          申购方式{' '}
          {getSubscriptionMethodLabel(
            getSubscriptionMethod(subscription, account),
          )}
        </span>
        <span>手续费 {formatHKD(subscription.fee)}</span>
        <span>资金来源 {getFundingSourceLabel(subscription.fundingSource)}</span>
        {subscription.status === 'won' && (
          <span>
            中签 {subscription.allottedShares} 股 / {subscription.allottedLots}{' '}
            手
          </span>
        )}
          </div>

          {sales.length > 0 && (
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3">
          {sales
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((sale) => (
              <div
                key={sale.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs"
              >
                <span className="font-semibold text-slate-700">
                  {saleMethodLabel[sale.method]} · {sale.shares} 股
                </span>
                <span className="text-slate-500">
                  {sale.date} · {formatHKD(sale.price)}/股
                </span>
                <span className="font-semibold text-emerald-600">
                  收入 {formatHKD(sale.shares * sale.price)}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="编辑卖出"
                    onClick={() => onEditSale(sale)}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="删除卖出"
                    onClick={() => onDeleteSale(sale)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function Metric({
  label,
  value,
  sub,
  profitValue,
}: {
  label: string
  value: string
  sub?: string
  profitValue?: number
}) {
  const color =
    profitValue === undefined ? 'text-slate-700' : getProfitColor(profitValue)
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${color}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-[10px] ${color}`}>{sub}</p>}
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: Subscription['status']
}) {
  const style = {
    applied: ['已申购', 'bg-blue-50 text-blue-700'],
    announced: ['已公布', 'bg-amber-50 text-amber-700'],
    won: ['已中签', 'bg-emerald-50 text-emerald-700'],
    lost: ['未中签', 'bg-slate-100 text-slate-500'],
  }[status]
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style[1]}`}>
      {style[0]}
    </span>
  )
}

const saleMethodLabel = {
  grey_market: '暗盘卖出',
  first_day: '首日卖出',
  held_sale: '持有后卖出',
}
