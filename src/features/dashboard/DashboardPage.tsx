import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Gauge,
  LineChart,
  PackageOpen,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { useMemo } from 'react'
import { useAppData } from '../../hooks/useAppData'
import { usePersistentState } from '../../hooks/usePersistentState'
import { formatAccountName } from '../../utils/account'
import { formatHKD, formatPercent } from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import { getSubscriptionMethodLabel } from '../../utils/subscriptionMethod'
import {
  getAccountStats,
  getFinancingStats,
  getPerformanceSummary,
  getProfitTrend,
  getSaleTypeStats,
  getIndustryStats,
  getSystemStats,
  type TrendPeriod,
} from '../../utils/statistics'

export function DashboardPage() {
  const { accounts, ipos, subscriptions, sales, withdrawals } = useAppData()
  const [trendPeriod, setTrendPeriod] = usePersistentState<TrendPeriod>(
    'dashboard-trend-period',
    'month',
  )
  const stats = getSystemStats(accounts, subscriptions, ipos, sales)
  const performance = getPerformanceSummary(subscriptions, ipos, sales)
  const greyStats = getSaleTypeStats('grey_market', subscriptions, ipos, sales)
  const firstDayStats = getSaleTypeStats('first_day', subscriptions, ipos, sales)
  const heldStats = getSaleTypeStats('held_sale', subscriptions, ipos, sales)
  const financingStats = getFinancingStats(
    subscriptions,
    ipos,
    sales,
    accounts,
  )
  const industryStats = getIndustryStats(subscriptions, ipos, sales)
  const trend = getProfitTrend(trendPeriod, subscriptions, ipos, sales)
  const today = new Date().toISOString().slice(0, 10)
  const todayProfit = sales
    .filter((sale) => sale.date === today)
    .reduce((total, sale) => {
      const subscription = subscriptions.find(
        (item) => item.id === sale.subscriptionId,
      )
      const ipo = ipos.find((item) => item.id === subscription?.ipoId)
      const soldShares = sales
        .filter((item) => item.subscriptionId === sale.subscriptionId)
        .reduce((sum, item) => sum + item.shares, 0)
      const fee =
        soldShares > 0
          ? ((subscription?.fee ?? 0) * sale.shares) / soldShares
          : 0
      return (
        total +
        sale.shares * (sale.price - (ipo?.issuePrice ?? 0)) -
        fee -
        (sale.commission ?? 0)
      )
    }, 0)
  const pendingHoldingCount = subscriptions.filter((subscription) => {
    if (subscription.status !== 'won') return false
    const soldShares = sales
      .filter((sale) => sale.subscriptionId === subscription.id)
      .reduce((total, sale) => total + sale.shares, 0)
    return subscription.allottedShares > soldShares
  }).length
  const pendingIpoCount = new Set(
    subscriptions
      .filter(
        (subscription) =>
          subscription.status === 'applied' ||
          subscription.status === 'announced',
      )
      .map((subscription) => subscription.ipoId),
  ).size

  const accountInsights = useMemo(
    () =>
      accounts.map((account) => ({
        account,
        stats: getAccountStats(
          account,
          subscriptions,
          ipos,
          sales,
          withdrawals,
        ),
      })),
    [accounts, ipos, sales, subscriptions, withdrawals],
  )
  const bestAccount = [...accountInsights].sort(
    (left, right) => right.stats.totalProfit - left.stats.totalProfit,
  )[0]
  const luckiestAccount = [...accountInsights]
    .filter((row) => row.stats.participationCount > 0)
    .sort((left, right) => right.stats.winRate - left.stats.winRate)[0]
  const capitalCandidate = [...accountInsights]
    .filter((row) => row.account.initialDeposit > 0)
    .sort(
      (left, right) =>
        right.stats.totalProfit / right.account.initialDeposit -
        left.stats.totalProfit / left.account.initialDeposit,
    )[0]
  const bestFinancing = [...financingStats]
    .filter((row) => row.participationCount > 0)
    .sort(
      (left, right) => right.averageProfitRate - left.averageProfitRate,
    )[0]
  const bestIndustry = industryStats.find((row) => row.industry !== '未分类')
  const bestSaleType = [
    { label: '暗盘', stats: greyStats },
    { label: '首日', stats: firstDayStats },
    { label: '持有后', stats: heldStats },
  ].sort((left, right) => right.stats.profit - left.stats.profit)[0]
  const recent = subscriptions
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  return (
    <>
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          港股打新分析驾驶舱
        </div>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          总览
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          先看赚了多少，再判断账户、融资、行业与卖出策略。
        </p>
      </div>

      <MobileQuickBoard
        totalProfit={stats.totalProfit}
        todayProfit={todayProfit}
        pendingHoldingCount={pendingHoldingCount}
        pendingIpoCount={pendingIpoCount}
      />

      <section className="mt-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              核心表现
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              打新资金与收益
            </h2>
          </div>
          <p className="text-xs text-slate-400">数据随申购和卖出记录自动更新</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <HeroMetric
            label="总收益"
            value={formatHKD(stats.totalProfit, 'profit', 'dashboardKpi')}
            profit={stats.totalProfit}
            icon={CircleDollarSign}
            prominent
          />
          <HeroMetric
            label="总收益率"
            value={formatPercent(
              stats.profitRate,
              'profitRate',
              'dashboardKpi',
            )}
            profit={stats.profitRate}
            icon={TrendingUp}
            prominent
          />
          <HeroMetric
            label="总成本"
            value={formatHKD(stats.totalCost, 'amount', 'dashboardKpi')}
            icon={PackageOpen}
          />
          <HeroMetric
            label="总中签率"
            value={formatPercent(stats.winRate, 'rate', 'dashboardKpi')}
            icon={Target}
          />
          <HeroMetric
            label="打新胜率"
            value={formatPercent(
              performance.overallWinRate,
              'rate',
              'dashboardKpi',
            )}
            icon={Trophy}
          />
          <HeroMetric
            label="本月收益"
            value={formatHKD(
              performance.monthProfit,
              'profit',
              'dashboardKpi',
            )}
            profit={performance.monthProfit}
            icon={CalendarDays}
          />
          <HeroMetric
            label="暗盘收益"
            value={formatHKD(greyStats.profit, 'profit', 'dashboardKpi')}
            profit={greyStats.profit}
            icon={Gauge}
          />
          <HeroMetric
            label="首日收益"
            value={formatHKD(
              firstDayStats.profit,
              'profit',
              'dashboardKpi',
            )}
            profit={firstDayStats.profit}
            icon={Sparkles}
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <LineChart size={18} className="text-brand-600" />
              <h2 className="font-bold text-slate-900">收益趋势分析</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              红线为累计收益，蓝线为当期收益
            </p>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            {([
              ['month', '按月'],
              ['quarter', '按季度'],
              ['year', '按年'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  trendPeriod === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
                onClick={() => setTrendPeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ProfitTrendChart rows={trend} />
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">关键决策提示</h2>
          <span className="text-xs text-slate-400">基于当前记录实时计算</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Insight
            label="最赚钱账户"
            value={
              bestAccount ? formatAccountName(bestAccount.account) : '暂无数据'
            }
            detail={
              bestAccount
                ? formatHKD(bestAccount.stats.totalProfit, 'profit')
                : '等待收益记录'
            }
          />
          <Insight
            label="最欧账户"
            value={
              luckiestAccount
                ? formatAccountName(luckiestAccount.account)
                : '暂无数据'
            }
            detail={
              luckiestAccount
                ? `中签率 ${formatPercent(luckiestAccount.stats.winRate)}`
                : '等待中签结果'
            }
          />
          <Insight
            label="最佳申购方式"
            value={
              bestFinancing
                ? getSubscriptionMethodLabel(bestFinancing.method)
                : '暂无数据'
            }
            detail={
              bestFinancing
                ? `平均收益率 ${formatPercent(
                    bestFinancing.averageProfitRate,
                    'profitRate',
                  )}`
                : '等待申购记录'
            }
          />
          <Insight
            label="最赚钱行业"
            value={bestIndustry?.industry ?? '待补充行业'}
            detail={
              bestIndustry
                ? formatHKD(bestIndustry.totalProfit, 'profit')
                : '编辑新股即可填写'
            }
          />
          <Insight
            label="建议关注加资"
            value={
              capitalCandidate
                ? formatAccountName(capitalCandidate.account)
                : bestSaleType.label
            }
            detail={
              capitalCandidate
                ? `资金效率 ${formatPercent(
                    (capitalCandidate.stats.totalProfit /
                      capitalCandidate.account.initialDeposit) *
                      100,
                    'profitRate',
                  )}`
                : `${bestSaleType.label}收益领先`
            }
          />
        </div>
      </section>

      <section className="mt-7 rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">最近录入的申购</h2>
        </div>
        {recent.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-slate-400">
            还没有申购记录
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((subscription) => {
              const account = accounts.find(
                (item) => item.id === subscription.accountId,
              )
              const ipo = ipos.find((item) => item.id === subscription.ipoId)
              return (
                <div
                  key={subscription.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {ipo?.name ?? '已删除新股'}（{ipo?.stockCode ?? '-'}）
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {account ? formatAccountName(account) : '已删除账户'} ·{' '}
                      {subscription.subscriptionDate}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
                    <span className="text-sm font-semibold text-slate-700">
                      {formatHKD(
                        subscription.subscriptionAmount,
                        'investment',
                      )}
                    </span>
                    <ChevronRight size={15} className="text-slate-300" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

function HeroMetric({
  label,
  value,
  profit,
  icon: Icon,
  prominent = false,
}: {
  label: string
  value: string
  profit?: number
  icon: typeof Trophy
  prominent?: boolean
}) {
  const color =
    profit === undefined ? 'text-slate-950' : getProfitColor(profit)
  return (
    <div
      className={`relative min-w-0 rounded-2xl border bg-white p-4 shadow-card transition-shadow hover:shadow-md sm:p-5 ${
        prominent
          ? 'border-slate-300 lg:p-6'
          : 'border-slate-200/80'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-[11px] font-medium text-slate-400 sm:text-xs">{label}</p>
        <div
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg sm:h-8 sm:w-8 sm:rounded-xl ${
            prominent
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Icon size={15} />
        </div>
      </div>
      <p
        className={`mt-5 break-words font-semibold leading-none tracking-[-0.025em] tabular-nums ${color} ${
          prominent
            ? 'text-[clamp(1.35rem,6vw,2.25rem)]'
            : 'text-[clamp(1.2rem,5.4vw,1.875rem)]'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function MobileQuickBoard({
  totalProfit,
  todayProfit,
  pendingHoldingCount,
  pendingIpoCount,
}: {
  totalProfit: number
  todayProfit: number
  pendingHoldingCount: number
  pendingIpoCount: number
}) {
  const rows = [
    {
      label: '累计收益',
      value: formatHKD(totalProfit, 'profit', 'dashboardKpi'),
      profit: totalProfit,
      icon: CircleDollarSign,
    },
    {
      label: '今日收益',
      value: formatHKD(todayProfit, 'profit', 'dashboardKpi'),
      profit: todayProfit,
      icon: CalendarDays,
    },
    {
      label: '待卖出持仓',
      value: `${pendingHoldingCount} 笔`,
      icon: PackageOpen,
    },
    {
      label: '待公布新股',
      value: `${pendingIpoCount} 只`,
      icon: Clock3,
    },
  ]

  return (
    <section className="sticky top-16 z-10 -mx-4 mt-5 border-y border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map((row) => {
          const Icon = row.icon
          return (
            <div key={row.label} className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                <Icon size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-slate-400">
                  {row.label}
                </p>
                <p
                  className={`mt-0.5 whitespace-nowrap text-[clamp(0.7rem,3.2vw,0.875rem)] font-bold tabular-nums ${
                    row.profit === undefined
                      ? 'text-slate-900'
                      : getProfitColor(row.profit)
                  }`}
                >
                  {row.value}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ProfitTrendChart({
  rows,
}: {
  rows: ReturnType<typeof getProfitTrend>
}) {
  if (rows.length === 0) {
    return (
      <div className="grid h-64 place-items-center text-sm text-slate-400">
        录入卖出记录后将自动生成收益趋势
      </div>
    )
  }
  const values = rows.flatMap((row) => [row.profit, row.cumulativeProfit])
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const range = max - min || 1
  const point = (value: number, index: number) => ({
    x: rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100,
    y: 88 - ((value - min) / range) * 76,
  })
  const periodPoints = rows.map((row, index) => point(row.profit, index))
  const cumulativePoints = rows.map((row, index) =>
    point(row.cumulativeProfit, index),
  )

  return (
    <div className="mt-6 overflow-hidden sm:overflow-x-auto">
      <div className="min-w-0 sm:min-w-[640px]">
        <svg viewBox="0 0 100 100" className="h-64 w-full" preserveAspectRatio="none">
          {[12, 31, 50, 69, 88].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              stroke="#E2E8F0"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <polyline
            points={periodPoints.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="#6366F1"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={cumulativePoints.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
          {rows.map((row) => (
            <div key={row.label} className="text-center">
              <p className={`text-[10px] font-semibold ${getProfitColor(row.profit)}`}>
                {formatHKD(row.profit, 'profit')}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">{row.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Insight({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-slate-800">
        {value}
      </p>
      <p className="mt-1 break-words text-xs font-medium leading-5 text-slate-500">
        {detail}
      </p>
    </div>
  )
}
