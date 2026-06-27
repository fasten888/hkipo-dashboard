import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Gauge,
  Layers,
  LineChart,
  PackageOpen,
  PieChart,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react'
import { useMemo } from 'react'
import { useAppData } from '../../hooks/useAppData'
import { usePersistentState } from '../../hooks/usePersistentState'
import { CountUpNumber } from '../../components/ui/CountUpNumber'
import { MetricValueText } from '../../components/ui/MetricValueText'
import { getOperationLogs } from '../../services/audit'
import type { Account } from '../../types/account'
import type { OperationLog } from '../../types/audit'
import type { Ipo } from '../../types/ipo'
import type { Subscription } from '../../types/subscription'
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
  const { accounts, ipos, subscriptions, sales, withdrawals, holdings } =
    useAppData()
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
  const currentMonthProfit = trend[trend.length - 1]?.profit ?? 0
  const previousMonthProfit = trend[trend.length - 2]?.profit ?? 0
  const monthDelta =
    previousMonthProfit !== 0
      ? ((currentMonthProfit - previousMonthProfit) /
          Math.abs(previousMonthProfit)) *
        100
      : currentMonthProfit > 0
        ? 100
        : 0
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
  const upcomingIpos = ipos
    .filter(
      (ipo) =>
        (ipo.subscriptionDate && ipo.subscriptionDate >= today) ||
        (ipo.listingDate && ipo.listingDate >= today),
    )
    .sort((a, b) => {
      const left = a.subscriptionDate || a.listingDate
      const right = b.subscriptionDate || b.listingDate
      return left.localeCompare(right)
    })
    .slice(0, 6)
  const operationLogs = getOperationLogs().slice(0, 10)
  const accountRanking = [...accountInsights]
    .sort((left, right) => right.stats.totalProfit - left.stats.totalProfit)
    .slice(0, 5)
  const profitComposition = [
    { label: '暗盘', value: Math.max(0, greyStats.profit), color: '#2563EB' },
    { label: '首日', value: Math.max(0, firstDayStats.profit), color: '#8B5CF6' },
    { label: '长期持有', value: Math.max(0, heldStats.profit), color: '#22C55E' },
    { label: '手续费/融资费', value: Math.max(0, stats.totalCost), color: '#F59E0B' },
  ]
  const financingAmount = subscriptions
    .filter((subscription) =>
      getSubscriptionMethodLabel(subscription.method) === '10x融资',
    )
    .reduce((total, subscription) => total + subscription.subscriptionAmount, 0)
  const cashAmount = subscriptions
    .filter((subscription) =>
      getSubscriptionMethodLabel(subscription.method) === '现金',
    )
    .reduce((total, subscription) => total + subscription.subscriptionAmount, 0)
  const holdingMarketValue = holdings.reduce(
    (total, holding) => total + holding.marketValue,
    0,
  )
  const collateralCapacity = holdings.reduce(
    (total, holding) => total + holding.marketValue * (holding.collateralRate / 100),
    0,
  )
  const pendingReleaseAmount = subscriptions
    .filter(
      (subscription) =>
        subscription.status === 'applied' || subscription.status === 'announced',
    )
    .reduce(
      (total, subscription) =>
        total + subscription.subscriptionAmount + subscription.fee,
      0,
    )

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            港股打新分析驾驶舱
          </div>
          <h1 className="text-[48px] font-bold leading-none tracking-[-0.045em] text-[#111827]">
            投资驾驶舱
          </h1>
          <p className="mt-4 max-w-3xl text-[20px] leading-8 text-slate-500">
            先看赚了多少，再判断风险在哪里，最后决定下一步该做什么。
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-900/[0.05] bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          数据随申购、卖出和同步记录自动更新
        </div>
      </div>

      <MobileQuickBoard
        totalProfit={stats.totalProfit}
        todayProfit={todayProfit}
        pendingHoldingCount={pendingHoldingCount}
        pendingIpoCount={pendingIpoCount}
      />

      <section className="mt-8">
        <SectionHeading
          eyebrow="Core metrics"
          title="赚了多少钱"
          description="净收益已经扣除融资申购费和卖出佣金。"
        />
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <HeroMetric
            label="总收益"
            value={formatHKD(stats.totalProfit, 'profit', 'dashboardKpi')}
            countValue={stats.totalProfit}
            formatter={(value) => formatHKD(value, 'profit', 'dashboardKpi')}
            profit={stats.totalProfit}
            icon={CircleDollarSign}
            prominent
            tone="profit"
            hint={`较上期 ${formatSignedDelta(monthDelta)}`}
          />
          <HeroMetric
            label="总收益率"
            value={formatPercent(
              stats.profitRate,
              'profitRate',
              'dashboardKpi',
            )}
            countValue={stats.profitRate}
            formatter={(value) =>
              formatPercent(value, 'profitRate', 'dashboardKpi')
            }
            profit={stats.profitRate}
            icon={TrendingUp}
            prominent
            tone="rate"
            hint="按累计投入资金计算"
          />
          <HeroMetric
            label="总成本"
            value={formatHKD(stats.totalCost, 'amount', 'dashboardKpi')}
            countValue={stats.totalCost}
            formatter={(value) => formatHKD(value, 'amount', 'dashboardKpi')}
            icon={PackageOpen}
            tone="cost"
            hint="融资申购费 + 卖出佣金"
          />
          <HeroMetric
            label="总中签率"
            value={formatPercent(stats.winRate, 'rate', 'dashboardKpi')}
            countValue={stats.winRate}
            formatter={(value) => formatPercent(value, 'rate', 'dashboardKpi')}
            icon={Target}
            tone="win"
            hint={`${stats.winCount} 次中签 · ${stats.participationCount} 次参与`}
          />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <HeroMetric
            label="打新胜率"
            value={formatPercent(
              performance.overallWinRate,
              'rate',
              'dashboardKpi',
            )}
            countValue={performance.overallWinRate}
            formatter={(value) => formatPercent(value, 'rate', 'dashboardKpi')}
            icon={Trophy}
            tone="win"
            compact
          />
          <HeroMetric
            label="本月收益"
            value={formatHKD(
              performance.monthProfit,
              'profit',
              'dashboardKpi',
            )}
            countValue={performance.monthProfit}
            formatter={(value) => formatHKD(value, 'profit', 'dashboardKpi')}
            profit={performance.monthProfit}
            icon={CalendarDays}
            tone="profit"
            compact
          />
          <HeroMetric
            label="暗盘收益"
            value={formatHKD(greyStats.profit, 'profit', 'dashboardKpi')}
            countValue={greyStats.profit}
            formatter={(value) => formatHKD(value, 'profit', 'dashboardKpi')}
            profit={greyStats.profit}
            icon={Gauge}
            tone="profit"
            compact
          />
          <HeroMetric
            label="首日收益"
            value={formatHKD(
              firstDayStats.profit,
              'profit',
              'dashboardKpi',
            )}
            countValue={firstDayStats.profit}
            formatter={(value) => formatHKD(value, 'profit', 'dashboardKpi')}
            profit={firstDayStats.profit}
            icon={Sparkles}
            tone="profit"
            compact
          />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(520px,0.55fr)]">
        <div className="os-card os-card-hover">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LineChart size={18} className="text-brand-600" />
                <h2 className="text-[15px] font-medium text-[#111827]">收益趋势</h2>
              </div>
              <p className="mt-1 text-[13px] font-normal text-slate-400">
                红线为累计收益，紫线为当期收益
              </p>
            </div>
            <div className="flex rounded-2xl bg-slate-100 p-1">
              {([
                ['month', '按月'],
                ['quarter', '按季度'],
                ['year', '按年'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    trendPeriod === key
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-950'
                  }`}
                  onClick={() => setTrendPeriod(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ProfitTrendChart rows={trend} />
        </div>
        <CompositionCard rows={profitComposition} total={stats.totalProfit} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <AiAdvisor
          upcomingCount={upcomingIpos.length}
          pendingIpoCount={pendingIpoCount}
          bestAccount={
            capitalCandidate
              ? formatAccountName(capitalCandidate.account)
              : bestAccount
                ? formatAccountName(bestAccount.account)
                : '暂无账户'
          }
          bestFinancing={
            bestFinancing
              ? getSubscriptionMethodLabel(bestFinancing.method)
              : '10x融资'
          }
          pendingReleaseAmount={pendingReleaseAmount}
        />
        <UpcomingIpoCard ipos={upcomingIpos} subscriptions={subscriptions} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.55fr)]">
        <AccountCommandCard rows={accountRanking} />
        <CapitalUsageCard
          financingAmount={financingAmount}
          cashAmount={cashAmount}
          pendingReleaseAmount={pendingReleaseAmount}
          holdingMarketValue={holdingMarketValue}
          collateralCapacity={collateralCapacity}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)]">
        <ActivityTimeline
          logs={operationLogs}
          fallbackSubscriptions={recent}
          accounts={accounts}
          ipos={ipos}
        />
        <DecisionStack
          bestAccount={
            bestAccount ? formatAccountName(bestAccount.account) : '暂无数据'
          }
          luckiestAccount={
            luckiestAccount
              ? formatAccountName(luckiestAccount.account)
              : '暂无数据'
          }
          bestFinancing={
            bestFinancing
              ? getSubscriptionMethodLabel(bestFinancing.method)
              : '暂无数据'
          }
          bestIndustry={bestIndustry?.industry ?? '待补充行业'}
          bestSaleType={bestSaleType.label}
          profit={bestAccount?.stats.totalProfit ?? 0}
          winRate={luckiestAccount?.stats.winRate ?? 0}
          financingRate={bestFinancing?.averageProfitRate ?? 0}
          industryProfit={bestIndustry?.totalProfit ?? 0}
          saleTypeProfit={bestSaleType.stats.profit}
        />
      </section>
    </>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-slate-400">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-[32px] font-bold leading-tight tracking-[-0.04em] text-[#111827]">
          {title}
        </h2>
      </div>
      <p className="max-w-lg text-[14px] leading-6 text-slate-400">
        {description}
      </p>
    </div>
  )
}

function HeroMetric({
  label,
  value,
  countValue,
  formatter,
  profit,
  icon: Icon,
  prominent = false,
  compact = false,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  countValue?: number
  formatter?: (value: number) => string
  profit?: number
  icon: typeof Trophy
  prominent?: boolean
  compact?: boolean
  hint?: string
  tone?: 'profit' | 'cost' | 'rate' | 'win' | 'count' | 'neutral'
}) {
  const toneStyle = {
    profit: {
      icon: 'bg-[#FEE2E2] text-[#EF4444]',
      value: 'profit' as const,
    },
    cost: {
      icon: 'bg-[#DCFCE7] text-[#10B981]',
      value: 'cost' as const,
    },
    rate: {
      icon: 'bg-[#F3E8FF] text-[#7C3AED]',
      value: 'rate' as const,
    },
    win: {
      icon: 'bg-[#FEF3C7] text-[#F59E0B]',
      value: 'win' as const,
    },
    count: {
      icon: 'bg-[#DBEAFE] text-[#2563EB]',
      value: 'count' as const,
    },
    neutral: {
      icon: prominent
        ? 'bg-slate-100 text-slate-600'
        : 'bg-slate-100 text-slate-500',
      value: 'neutral' as const,
    },
  }[tone]
  return (
    <div
      className={`os-card os-card-hover relative min-w-0 ${
        compact ? 'min-h-[132px]' : 'min-h-[176px]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-medium text-slate-400">{label}</p>
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${toneStyle.icon}`}
        >
          <Icon size={20} />
        </div>
      </div>
      <p className={`${compact ? 'mt-5' : 'mt-8'} min-w-0 overflow-hidden`}>
        {countValue === undefined || !formatter ? (
          <MetricValueText value={value} numericValue={profit} tone={toneStyle.value} />
        ) : (
          <CountUpNumber
            value={countValue}
            format={formatter}
            render={(formatted) => (
              <MetricValueText
                value={formatted}
                numericValue={profit}
                tone={toneStyle.value}
              />
            )}
          />
        )}
      </p>
      {hint && (
        <p className={`${compact ? 'mt-3' : 'mt-5'} text-[13px] font-medium leading-6 text-slate-400`}>
          {hint}
        </p>
      )}
    </div>
  )
}

function CompositionCard({
  rows,
  total,
}: {
  rows: Array<{ label: string; value: number; color: string }>
  total: number
}) {
  const totalWeight = rows.reduce((sum, row) => sum + Math.abs(row.value), 0)
  let cursor = 0
  const gradient =
    totalWeight > 0
      ? rows
          .map((row) => {
            const start = cursor
            const size = (Math.abs(row.value) / totalWeight) * 100
            cursor += size
            return `${row.color} ${start}% ${cursor}%`
          })
          .join(', ')
      : '#E2E8F0 0% 100%'

  return (
    <div className="os-card os-card-hover min-h-[320px]">
      <div className="flex items-center gap-2">
        <PieChart size={18} className="text-violet-500" />
        <h2 className="text-[15px] font-medium text-[#111827]">收益构成</h2>
      </div>
      <p className="mt-1 text-[13px] font-normal text-slate-400">
        看清楚钱从哪里来，也看清成本吃掉了多少。
      </p>
      <div className="mt-8 grid items-center gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div
          className="relative grid h-[220px] w-[220px] place-items-center rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <div className="grid h-[138px] w-[138px] place-items-center rounded-full bg-white text-center shadow-inner">
            <div>
              <p className="text-[12px] font-medium text-slate-400">
                净收益
              </p>
              <p
                className={`mt-1 text-xl font-bold tracking-[-0.03em] ${getProfitColor(total)}`}
              >
                {formatHKD(total, 'profit', 'dashboardKpi')}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-5">
          {rows.map((row) => {
            const percent =
              totalWeight > 0
                ? (Math.abs(row.value) / totalWeight) * 100
                : 0
            return (
              <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate text-[14px] font-medium text-slate-600">
                    {row.label}
                  </span>
                </div>
                <span className="text-[14px] font-semibold tabular-nums text-slate-900">
                  {formatHKD(row.value, row.label.includes('费') ? 'amount' : 'profit')}
                </span>
                <span className="w-14 text-right text-[14px] tabular-nums text-slate-500">
                  {percent.toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AiAdvisor({
  upcomingCount,
  pendingIpoCount,
  bestAccount,
  bestFinancing,
  pendingReleaseAmount,
}: {
  upcomingCount: number
  pendingIpoCount: number
  bestAccount: string
  bestFinancing: string
  pendingReleaseAmount: number
}) {
  const rows = [
    `未来窗口内有 ${upcomingCount} 只新股需要关注。`,
    `仍有 ${pendingIpoCount} 只新股等待公布结果。`,
    `优先考虑 ${bestAccount}，当前建议方式为 ${bestFinancing}。`,
    `预计待释放资金 ${formatHKD(pendingReleaseAmount, 'amount')}。`,
  ]
  return (
    <div className="os-card os-card-hover min-h-[270px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#2563EB]" />
          <h2 className="text-[15px] font-medium text-[#111827]">AI 智能建议</h2>
        </div>
        <span className="rounded-full bg-[#F3E8FF] px-2.5 py-1 text-[11px] font-semibold text-[#7C3AED]">
          Beta
        </span>
      </div>
      <p className="mt-2 text-[13px] font-normal leading-6 text-slate-400">
        这里先提供基于规则的建议，后续可接入 AI 分析。
      </p>
      <div className="mt-6 space-y-4">
        {rows.slice(0, 3).map((row, index) => (
          <div
            key={row}
            className="flex gap-3 rounded-2xl p-2 transition duration-200 hover:bg-slate-50"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-blue-50 text-[#2563EB]">
              <ArrowUpRight size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-5 text-slate-800">
                {index === 0 ? '未来 3 天新股提醒' : index === 1 ? '待公布结果提醒' : '账户申购建议'}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-slate-500">
                {row}
              </p>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB]">
        查看 AI 详细建议
        <ChevronRight size={15} />
      </button>
    </div>
  )
}

function UpcomingIpoCard({
  ipos,
  subscriptions,
}: {
  ipos: Ipo[]
  subscriptions: Subscription[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="os-card os-card-hover">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock size={18} className="text-amber-500" />
            <h2 className="text-[15px] font-medium text-[#111827]">Upcoming IPO</h2>
          </div>
          <p className="mt-1 text-[13px] font-normal text-slate-400">
            最近可申购、上市和资金释放节点。
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
          {ipos.length} 只
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {ipos.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-400 md:col-span-2">
            暂无未来日期的新股。录入申购日或上市日后会自动出现。
          </div>
        ) : (
          ipos.map((ipo) => {
            const participants = subscriptions.filter(
              (subscription) => subscription.ipoId === ipo.id,
            ).length
            return (
              <div
                key={ipo.id}
                className="rounded-2xl border border-slate-900/[0.05] bg-slate-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950">
                      {ipo.name}（{ipo.stockCode || '-'}）
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {ipo.industry || '未分类'} · {participants} 个账户
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-amber-600 shadow-sm">
                    {getIpoBadge(ipo, today)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <DatePill label="申购" value={ipo.subscriptionDate || '-'} />
                  <DatePill label="上市" value={ipo.listingDate || '-'} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function DatePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
      <p className="text-[10px] font-medium text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-700">{value}</p>
    </div>
  )
}

function AccountCommandCard({
  rows,
}: {
  rows: Array<{
    account: Account
    stats: ReturnType<typeof getAccountStats>
  }>
}) {
  return (
    <div className="os-card os-card-hover">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <h2 className="text-[15px] font-medium text-[#111827]">账户 Command Center</h2>
          </div>
          <p className="mt-1 text-[13px] font-normal text-slate-400">
            卡片化 Top5，不再把排行榜做成冷冰冰的表格。
          </p>
        </div>
        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 sm:inline-flex">
          收益最高
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {rows.map((row, index) => (
          <div
            key={row.account.id}
            className="rounded-[22px] border border-slate-900/[0.05] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-2xl text-sm font-semibold text-white"
                style={{ background: accountAvatarColor(index) }}
              >
                {row.account.name.slice(0, 1) || '账'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-950">
                  {formatAccountName(row.account)}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {row.account.brokerName || '未填写券商'}
                </p>
              </div>
            </div>
            <p
              className={`mt-5 text-xl font-semibold tracking-[-0.03em] ${getProfitColor(row.stats.totalProfit)}`}
            >
              {formatHKD(row.stats.totalProfit, 'profit')}
            </p>
            <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-400">
              <span>{row.stats.winCount} 次中签</span>
              <span>{formatPercent(row.stats.profitRate, 'profitRate')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CapitalUsageCard({
  financingAmount,
  cashAmount,
  pendingReleaseAmount,
  holdingMarketValue,
  collateralCapacity,
}: {
  financingAmount: number
  cashAmount: number
  pendingReleaseAmount: number
  holdingMarketValue: number
  collateralCapacity: number
}) {
  const rows = [
    { label: '融资申购金额', value: financingAmount, icon: Layers },
    { label: '现金申购金额', value: cashAmount, icon: Wallet },
    { label: '待释放资金', value: pendingReleaseAmount, icon: Clock3 },
    { label: '持仓市值', value: holdingMarketValue, icon: Activity },
    { label: '可抵押额度', value: collateralCapacity, icon: Target },
  ]
  return (
    <div className="os-card os-card-hover">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-emerald-500" />
        <h2 className="text-[15px] font-medium text-[#111827]">资金占用</h2>
      </div>
      <p className="mt-1 text-[13px] font-normal text-slate-400">
        看清当前资金在哪里，以及还能释放多少打新能力。
      </p>
      <div className="mt-5 space-y-3">
        {rows.map((row) => {
          const Icon = row.icon
          return (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-500 shadow-sm">
                  <Icon size={16} />
                </span>
                <span className="text-sm font-medium text-slate-500">
                  {row.label}
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-slate-950">
                {formatHKD(row.value, 'amount')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActivityTimeline({
  logs,
  fallbackSubscriptions,
  accounts,
  ipos,
}: {
  logs: OperationLog[]
  fallbackSubscriptions: Subscription[]
  accounts: Account[]
  ipos: Ipo[]
}) {
  const fallback = fallbackSubscriptions.map((subscription) => {
    const account = accounts.find((item) => item.id === subscription.accountId)
    const ipo = ipos.find((item) => item.id === subscription.ipoId)
    return {
      id: subscription.id,
      createdAt: subscription.createdAt,
      title: '新增申购',
      detail: `${ipo?.name ?? '已删除新股'} · ${
        account ? formatAccountName(account) : '已删除账户'
      }`,
    }
  })
  const rows =
    logs.length > 0
      ? logs.map((log) => ({
          id: log.id,
          createdAt: log.createdAt,
          title: log.action,
          detail: log.objectName || log.objectType,
        }))
      : fallback

  return (
    <div className="os-card os-card-hover">
      <div className="flex items-center gap-2">
        <Activity size={18} className="text-blue-500" />
        <h2 className="text-[15px] font-medium text-[#111827]">最近动态</h2>
      </div>
      <p className="mt-1 text-[13px] font-normal text-slate-400">
        最近 10 条关键操作，像投资系统的 Activity Timeline。
      </p>
      <div className="mt-6 space-y-4">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-400">
            暂无动态。新增申购、中签、卖出后会自动出现。
          </p>
        ) : (
          rows.slice(0, 10).map((row) => (
            <div
              key={row.id}
              className="group flex gap-3 rounded-2xl p-3 transition duration-200 hover:bg-slate-50"
            >
              <div className="mt-1 flex flex-col items-center">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
                <span className="mt-2 h-full min-h-8 w-px bg-slate-100" />
              </div>
              <div className="min-w-0 flex-1 pb-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="truncate text-sm font-medium text-slate-950">
                    {row.title}
                  </p>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">
                    {formatDateTime(row.createdAt)}
                    <ChevronRight
                      size={14}
                      className="opacity-0 transition group-hover:opacity-100"
                    />
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-400">
                  {row.detail}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function DecisionStack({
  bestAccount,
  luckiestAccount,
  bestFinancing,
  bestIndustry,
  bestSaleType,
  profit,
  winRate,
  financingRate,
  industryProfit,
  saleTypeProfit,
}: {
  bestAccount: string
  luckiestAccount: string
  bestFinancing: string
  bestIndustry: string
  bestSaleType: string
  profit: number
  winRate: number
  financingRate: number
  industryProfit: number
  saleTypeProfit: number
}) {
  const rows = [
    {
      label: '哪个账户最赚钱',
      value: bestAccount,
      detail: formatHKD(profit, 'profit'),
    },
    {
      label: '哪个账户最欧',
      value: luckiestAccount,
      detail: `中签率 ${formatPercent(winRate)}`,
    },
    {
      label: '哪种融资方式最好',
      value: bestFinancing,
      detail: `平均收益率 ${formatPercent(financingRate, 'profitRate')}`,
    },
    {
      label: '哪个行业最赚钱',
      value: bestIndustry,
      detail: formatHKD(industryProfit, 'profit'),
    },
    {
      label: '哪种卖出策略最好',
      value: bestSaleType,
      detail: formatHKD(saleTypeProfit, 'profit'),
    },
  ]
  return (
    <div className="os-card os-card-hover">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-500" />
        <h2 className="text-[15px] font-medium text-[#111827]">风险与机会</h2>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[11px] font-medium text-slate-400">
              {row.label}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {row.value}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {row.detail}
            </p>
          </div>
        ))}
      </div>
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
  const cumulativeAreaPoints =
    cumulativePoints.length > 0
      ? [
          `0,88`,
          ...cumulativePoints.map(({ x, y }) => `${x},${y}`),
          `100,88`,
        ].join(' ')
      : ''

  return (
    <div className="mt-6 overflow-hidden sm:overflow-x-auto">
      <div className="min-w-0 sm:min-w-[640px]">
        <svg
          viewBox="0 0 100 100"
          className="h-[320px] w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="profit-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
            </linearGradient>
          </defs>
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
          <polygon
            points={cumulativeAreaPoints}
            fill="url(#profit-area)"
          />
          <polyline
            points={periodPoints.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="#7C3AED"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={cumulativePoints.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`,
          }}
        >
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

function formatSignedDelta(value: number) {
  if (!Number.isFinite(value) || value === 0) return '0.0%'
  return `${value > 0 ? '↑' : '↓'}${Math.abs(value).toFixed(1)}%`
}

function accountAvatarColor(index: number) {
  const colors = [
    'linear-gradient(135deg, #2563EB, #8B5CF6)',
    'linear-gradient(135deg, #0EA5E9, #2563EB)',
    'linear-gradient(135deg, #F59E0B, #EF4444)',
    'linear-gradient(135deg, #22C55E, #14B8A6)',
    'linear-gradient(135deg, #8B5CF6, #EC4899)',
  ]
  return colors[index % colors.length]
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getIpoBadge(ipo: Ipo, today: string) {
  if (ipo.subscriptionDate === today) return '今日可申购'
  if (ipo.listingDate === today) return '今日上市'
  if (ipo.subscriptionDate && ipo.subscriptionDate > today) return '即将申购'
  if (ipo.listingDate && ipo.listingDate > today) return '即将上市'
  return '待关注'
}
