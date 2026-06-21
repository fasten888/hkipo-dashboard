import {
  Award,
  CircleDollarSign,
  Gauge,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { SortButton } from '../../components/ui/SortButton'
import { useAppData } from '../../hooks/useAppData'
import {
  compareValues,
  useThreeStateSort,
} from '../../hooks/useThreeStateSort'
import type { Sale, SaleInput } from '../../types/sale'
import type { Subscription } from '../../types/subscription'
import { formatAccountName } from '../../utils/account'
import { formatHKD, formatPercent } from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import { getSubscriptionMethod } from '../../utils/subscriptionMethod'
import { SaleForm } from './SaleForm'

export function SalesPage() {
  const {
    accounts,
    ipos,
    subscriptions,
    sales,
    addSale,
    updateSale,
    deleteSale,
  } = useAppData()
  const [search, setSearch] = useState('')
  const [subscriptionFilter, setSubscriptionFilter] = useState('all')
  const [target, setTarget] = useState<Subscription | null>(null)
  const [editing, setEditing] = useState<Sale | null>(null)
  const [deleting, setDeleting] = useState<Sale | null>(null)
  const [saleModalOpen, setSaleModalOpen] = useState(false)
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const { sort, toggleSort } = useThreeStateSort<
    'name' | 'date' | 'profit' | 'profitRate'
  >('sales')

  const availableSubscriptions = subscriptions.filter((subscription) => {
    if (subscription.status !== 'won') return false
    const sold = sales
      .filter((sale) => sale.subscriptionId === subscription.id)
      .reduce((total, sale) => total + sale.shares, 0)
    return subscription.allottedShares > sold
  })

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sales
      .filter(
        (sale) =>
          subscriptionFilter === 'all' ||
          sale.subscriptionId === subscriptionFilter,
      )
      .filter((sale) => {
        const subscription = subscriptions.find(
          (item) => item.id === sale.subscriptionId,
        )
        const account = accounts.find(
          (item) => item.id === subscription?.accountId,
        )
        const ipo = ipos.find((item) => item.id === subscription?.ipoId)
        return (
          !query ||
          account?.name.toLowerCase().includes(query) ||
          ipo?.name.toLowerCase().includes(query) ||
          ipo?.stockCode.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        if (!sort) return b.createdAt.localeCompare(a.createdAt)
        const aSubscription = subscriptions.find(
          (item) => item.id === a.subscriptionId,
        )
        const bSubscription = subscriptions.find(
          (item) => item.id === b.subscriptionId,
        )
        const aIpo = ipos.find((item) => item.id === aSubscription?.ipoId)
        const bIpo = ipos.find((item) => item.id === bSubscription?.ipoId)
        const aMetrics = getSaleMetrics(a, aSubscription, aIpo, sales)
        const bMetrics = getSaleMetrics(b, bSubscription, bIpo, sales)
        const values = {
          name: [aIpo?.name ?? '', bIpo?.name ?? ''],
          date: [a.date, b.date],
          profit: [aMetrics.profit, bMetrics.profit],
          profitRate: [aMetrics.profitRate, bMetrics.profitRate],
        }[sort.key]
        const compared = compareValues(values[0], values[1])
        return sort.direction === 'asc' ? compared : -compared
      })
  }, [
    accounts,
    ipos,
    sales,
    search,
    sort,
    subscriptionFilter,
    subscriptions,
  ])

  const totalSaleAmount = sales.reduce(
    (total, sale) => total + sale.price * sale.shares,
    0,
  )
  const totalInvestmentCost = sales.reduce((total, sale) => {
    const subscription = subscriptions.find(
      (item) => item.id === sale.subscriptionId,
    )
    const ipo = ipos.find((item) => item.id === subscription?.ipoId)
    return total + sale.shares * (ipo?.issuePrice ?? 0)
  }, 0)
  const soldSubscriptionIds = new Set(
    sales.map((sale) => sale.subscriptionId),
  )
  const totalApplicationFees = subscriptions.reduce(
    (total, subscription) => total + subscription.fee,
    0,
  )
  const totalCommissions = sales.reduce(
    (total, sale) => total + (sale.commission ?? 0),
    0,
  )
  const totalProfit =
    totalSaleAmount -
    totalInvestmentCost -
    totalApplicationFees -
    totalCommissions
  const totalCost =
    totalInvestmentCost + totalApplicationFees + totalCommissions
  const totalProfitRate =
    totalCost > 0
      ? (totalProfit / totalCost) * 100
      : 0
  const totalFinancingCost = subscriptions
    .filter((subscription) => {
      const account = accounts.find(
        (item) => item.id === subscription.accountId,
      )
      return getSubscriptionMethod(subscription, account) === '10x'
    })
    .reduce((total, subscription) => total + subscription.fee, 0)
  const winCount = subscriptions.filter(
    (subscription) => subscription.status === 'won',
  ).length
  const averageWinProfit = winCount > 0 ? totalProfit / winCount : 0
  const soldSubscriptionRows = [...soldSubscriptionIds].map(
    (subscriptionId) => {
      const subscription = subscriptions.find(
        (item) => item.id === subscriptionId,
      )
      const ipo = ipos.find((item) => item.id === subscription?.ipoId)
      const relatedSales = sales.filter(
        (sale) => sale.subscriptionId === subscriptionId,
      )
      const saleAmount = relatedSales.reduce(
        (total, sale) => total + sale.price * sale.shares,
        0,
      )
      const issueCost = relatedSales.reduce(
        (total, sale) => total + sale.shares * (ipo?.issuePrice ?? 0),
        0,
      )
      const commissions = relatedSales.reduce(
        (total, sale) => total + (sale.commission ?? 0),
        0,
      )
      return {
        ipo,
        profit:
          saleAmount -
          issueCost -
          (subscription?.fee ?? 0) -
          commissions,
      }
    },
  )
  const biggestWinner = soldSubscriptionRows
    .filter((row) => row.profit > 0)
    .sort((left, right) => right.profit - left.profit)[0]
  const brokenIssueSales = sales
    .map((sale) => {
      const subscription = subscriptions.find(
        (item) => item.id === sale.subscriptionId,
      )
      const account = accounts.find(
        (item) => item.id === subscription?.accountId,
      )
      const ipo = ipos.find((item) => item.id === subscription?.ipoId)
      const totalSoldShares = sales
        .filter((item) => item.subscriptionId === sale.subscriptionId)
        .reduce((total, item) => total + item.shares, 0)
      const allocatedFee =
        totalSoldShares > 0
          ? ((subscription?.fee ?? 0) * sale.shares) / totalSoldShares
          : 0
      const issueCost = sale.shares * (ipo?.issuePrice ?? 0)
      const profit =
        sale.shares * sale.price -
        issueCost -
        allocatedFee -
        (sale.commission ?? 0)
      return {
        sale,
        account,
        ipo,
        profit,
        profitRate:
          issueCost + allocatedFee + (sale.commission ?? 0) > 0
            ? (profit /
                (issueCost + allocatedFee + (sale.commission ?? 0))) *
              100
            : 0,
      }
    })
    .filter(
      (row) =>
        Boolean(row.ipo?.listingDate) &&
        row.sale.date >= (row.ipo?.listingDate ?? '') &&
        row.profit < 0,
    )
    .sort((left, right) => right.sale.date.localeCompare(left.sale.date))

  const save = (input: SaleInput) => {
    if (editing) updateSale(editing.id, input)
    else addSale(input)
    setSaleModalOpen(false)
    setTarget(null)
    setEditing(null)
  }

  const openAddSale = () => {
    console.log('新增卖出按钮点击')
    setEditing(null)
    setTarget(availableSubscriptions[0] ?? null)
    setSaleModalOpen(true)
  }

  const openEdit = (sale: Sale) => {
    const subscription = subscriptions.find(
      (item) => item.id === sale.subscriptionId,
    )
    if (!subscription) return
    setTarget(subscription)
    setEditing(sale)
    setSaleModalOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            V1 · 交易记录
          </div>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            卖出记录
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            支持中签股份分批、多次卖出，并自动计算收益和收益率。
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
          onClick={openAddSale}
        >
          <Plus size={17} />
          新增卖出
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 text-xs shadow-sm">
        <span className="text-slate-400">排序：</span>
        {[
          ['name', '名称'],
          ['date', '日期'],
          ['profit', '收益'],
          ['profitRate', '收益率'],
        ].map(([key, label]) => (
          <SortButton
            key={key}
            label={label}
            direction={sort?.key === key ? sort.direction : undefined}
            onClick={() =>
              toggleSort(
                key as 'name' | 'date' | 'profit' | 'profitRate',
              )
            }
          />
        ))}
        {!sort && <span className="text-slate-400">默认最新录入</span>}
      </div>

      <section className="mt-7 grid gap-4 md:grid-cols-2">
        <SaleKpi
          label="累计收益"
          value={formatHKD(totalProfit, 'profit')}
          hint={`已扣申购费 ${formatHKD(totalApplicationFees)} · 佣金 ${formatHKD(totalCommissions)}`}
          icon={TrendingUp}
          profitValue={totalProfit}
          tooltip="累计收益 = 所有卖出成交金额 − 已卖出股份发行成本 − 全部申购记录手续费 − 全部卖出佣金。"
          prominent
        />
        <SaleKpi
          label="收益率"
          value={formatPercent(totalProfitRate, 'profitRate')}
          hint="累计收益 ÷ 全部已计成本"
          icon={Gauge}
          profitValue={totalProfitRate}
          tooltip="收益率 = 全成本累计收益 ÷（已卖出股份发行成本 + 全部申购记录手续费 + 全部卖出佣金）。"
          prominent
        />
      </section>
      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SaleKpi
          label="总融资成本"
          value={formatHKD(totalFinancingCost, 'investment')}
          hint="累计 10x 融资申购费"
          icon={CircleDollarSign}
          tooltip="总融资成本 = 所有 10x 融资申购记录的手续费合计。现金申购手续费不计入此项。"
          secondary
        />
        <SaleKpi
          label="平均单签收益"
          value={formatHKD(averageWinProfit, 'profit')}
          hint={`${winCount} 次中签`}
          icon={TrendingUp}
          profitValue={averageWinProfit}
          tooltip="平均单签收益 = 当前累计净利润 ÷ 全部中签次数。尚未卖出的中签也计入中签次数。"
          secondary
        />
        <SaleKpi
          label="最大肉签"
          value={biggestWinner?.ipo?.name ?? '暂无盈利记录'}
          hint={
            biggestWinner
              ? formatHKD(biggestWinner.profit, 'profit')
              : formatHKD(0, 'profit')
          }
          icon={Award}
          detailProfitValue={biggestWinner?.profit ?? 0}
          tooltip="按每笔中签记录合并全部分批卖出后计算，并扣除申购手续费及卖出佣金。"
          secondary
        />
        <SaleKpi
          label="破发次数"
          value={`${brokenIssueSales.length} 次`}
          hint={
            brokenIssueSales.length > 0
              ? '点击查看亏损卖出明细'
              : '暂无上市后亏损卖出'
          }
          icon={TrendingDown}
          tooltip="破发次数 = 卖出日期不早于上市日期，且扣除分摊申购手续费和卖出佣金后净收益为负的记录数。"
          onClick={() => setBreakdownOpen(true)}
          secondary
        />
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500 sm:px-5">
        <span className="font-semibold text-slate-700">计算说明：</span>
        累计收益已减去发行成本、全部申购手续费和每笔卖出佣金；收益率按累计净收益除以全部已计成本计算；平均单签收益按全成本净利润除以中签次数计算。
      </section>

      <div className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            placeholder="搜索账户、新股名称或代码"
            className="focus-ring w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          value={subscriptionFilter}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
          onChange={(event) => setSubscriptionFilter(event.target.value)}
        >
          <option value="all">全部申购记录</option>
          {subscriptions
            .filter((item) => item.status === 'won')
            .map((subscription) => {
              const account = accounts.find(
                (item) => item.id === subscription.accountId,
              )
              const ipo = ipos.find((item) => item.id === subscription.ipoId)
              return (
                <option key={subscription.id} value={subscription.id}>
                  {ipo?.name ?? '-'} - {account?.name ?? '-'}
                </option>
              )
            })}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-slate-400">
            暂无卖出记录
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((sale) => {
              const subscription = subscriptions.find(
                (item) => item.id === sale.subscriptionId,
              )
              const account = accounts.find(
                (item) => item.id === subscription?.accountId,
              )
              const ipo = ipos.find(
                (item) => item.id === subscription?.ipoId,
              )
              const metrics = getSaleMetrics(
                sale,
                subscription,
                ipo,
                sales,
              )
              return (
                <div
                  key={sale.id}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {ipo?.name ?? '-'}（{ipo?.stockCode ?? '-'}）
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatAccountName(account)}{' '}
                      · {sale.date}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">
                    {sale.shares} 股 × {formatHKD(sale.price)}
                  </p>
                  <div>
                    <p
                      className={`break-words text-sm font-bold tabular-nums ${getProfitColor(metrics.profit)}`}
                    >
                      {formatHKD(metrics.profit, 'profit')}
                    </p>
                    <p
                      className={`mt-1 break-words text-xs tabular-nums ${getProfitColor(
                        metrics.profit,
                      )}`}
                    >
                      {formatPercent(
                        metrics.profitRate,
                        'profitRate',
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                      onClick={() => openEdit(sale)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setDeleting(sale)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={saleModalOpen}
        title={editing ? '编辑卖出记录' : '新增卖出记录'}
        description={
          editing
            ? undefined
            : '选择一笔已中签且仍有持仓的申购记录。'
        }
        fullScreenOnMobile
        onClose={() => {
          setSaleModalOpen(false)
          setTarget(null)
          setEditing(null)
        }}
      >
        {!target && !editing && (
          <div className="px-5 py-12 text-center sm:px-7">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <Tags size={22} />
            </div>
            <p className="mt-4 font-bold text-slate-800">暂无可卖持仓</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              请先在“中签管理”中把申购记录标记为已中签，并填写大于
              0 的中签股数。已经全部卖出的记录不会再次出现在这里。
            </p>
            <button
              type="button"
              className="mt-6 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => setSaleModalOpen(false)}
            >
              我知道了
            </button>
          </div>
        )}
        {target && (
          <>
            {!editing && (
              <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
                <select
                  value={target.id}
                  className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm"
                  onChange={(event) =>
                    setTarget(
                      availableSubscriptions.find(
                        (item) => item.id === event.target.value,
                      ) ?? null,
                    )
                  }
                >
                  {availableSubscriptions.map((subscription) => {
                    const account = accounts.find(
                      (item) => item.id === subscription.accountId,
                    )
                    const ipo = ipos.find(
                      (item) => item.id === subscription.ipoId,
                    )
                    return (
                      <option key={subscription.id} value={subscription.id}>
                        {ipo?.name ?? '-'} - {account?.name ?? '-'}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}
            <SaleForm
              subscription={target}
              soldShares={sales
                .filter((sale) => sale.subscriptionId === target.id)
                .reduce((total, sale) => total + sale.shares, 0)}
              sale={editing}
              onSubmit={save}
              onCancel={() => {
                setSaleModalOpen(false)
                setTarget(null)
                setEditing(null)
              }}
            />
          </>
        )}
      </Modal>
      <Modal
        open={breakdownOpen}
        title="破发卖出明细"
        description="仅统计上市日及之后卖出，且扣除分摊申购手续费后净收益为负的记录。"
        fullScreenOnMobile
        onClose={() => setBreakdownOpen(false)}
      >
        {brokenIssueSales.length === 0 ? (
          <div className="px-5 py-16 text-center sm:px-7">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={22} />
            </div>
            <p className="mt-4 font-bold text-slate-800">暂无破发卖出记录</p>
            <p className="mt-2 text-sm text-slate-500">
              当前没有上市后亏损卖出的成交。
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {brokenIssueSales.map(
              ({ sale, account, ipo, profit, profitRate }) => (
                <article key={sale.id} className="px-5 py-4 sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-slate-800">
                        {ipo?.name ?? '已删除新股'}（{ipo?.stockCode ?? '-'}）
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatAccountName(account)} · {sale.date}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-bold ${getProfitColor(profit)}`}>
                        {formatHKD(profit, 'profit')}
                      </p>
                      <p
                        className={`mt-1 text-xs ${getProfitColor(
                          profitRate,
                        )}`}
                      >
                        {formatPercent(profitRate, 'profitRate')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{sale.shares} 股</span>
                    <span>卖出价 {formatHKD(sale.price)}</span>
                    <span>发行价 {formatHKD(ipo?.issuePrice ?? 0)}</span>
                    <span>卖出佣金 {formatHKD(sale.commission ?? 0)}</span>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="删除卖出记录"
        message="删除后收益和剩余持仓会自动重新计算。"
        onConfirm={() => {
          if (deleting) deleteSale(deleting.id)
          setDeleting(null)
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}

function SaleKpi({
  label,
  value,
  hint,
  icon: Icon,
  profitValue,
  tooltip,
  prominent = false,
  secondary = false,
  detailProfitValue,
  onClick,
}: {
  label: string
  value: string
  hint: string
  icon: typeof Tags
  profitValue?: number
  tooltip: string
  prominent?: boolean
  secondary?: boolean
  detailProfitValue?: number
  onClick?: () => void
}) {
  const valueColor =
    profitValue === undefined ? 'text-slate-950' : getProfitColor(profitValue)
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p
            className={`mt-3 break-words font-semibold leading-tight tracking-tight tabular-nums ${valueColor} ${
              secondary
                ? 'text-[clamp(1.4rem,2vw,1.875rem)]'
                : 'text-[clamp(1.75rem,2.5vw,2.25rem)]'
            }`}
          >
            {value}
          </p>
          <p
            className={`mt-3 text-xs font-medium leading-5 ${
              detailProfitValue === undefined
                ? 'text-slate-400'
                : getProfitColor(detailProfitValue)
            }`}
          >
            {hint}
          </p>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
          <Icon size={17} />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-[calc(100%-0.25rem)] left-5 z-30 hidden max-w-72 rounded-xl bg-slate-950 px-3 py-2 text-xs font-medium leading-5 text-white shadow-xl group-hover:block">
        {tooltip}
      </div>
    </>
  )
  const className = `group relative rounded-2xl border bg-white text-left shadow-card ${
    prominent
      ? 'border-slate-300 p-6'
      : 'border-slate-200/80 p-5'
  } ${onClick ? 'transition hover:border-brand-200 hover:bg-brand-50/20' : ''}`

  return onClick ? (
    <button
      type="button"
      className={className}
      title={tooltip}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <div className={className} title={tooltip}>
      {content}
    </div>
  )
}

function getSaleMetrics(
  sale: Sale,
  subscription: Subscription | undefined,
  ipo: { issuePrice: number } | undefined,
  sales: Sale[],
) {
  const totalSoldShares = sales
    .filter((item) => item.subscriptionId === sale.subscriptionId)
    .reduce((total, item) => total + item.shares, 0)
  const allocatedFee =
    totalSoldShares > 0
      ? ((subscription?.fee ?? 0) * sale.shares) / totalSoldShares
      : 0
  const issueCost = sale.shares * (ipo?.issuePrice ?? 0)
  const commission = sale.commission ?? 0
  const totalCost = issueCost + allocatedFee + commission
  const profit = sale.shares * sale.price - totalCost

  return {
    profit,
    profitRate: totalCost > 0 ? (profit / totalCost) * 100 : 0,
  }
}
