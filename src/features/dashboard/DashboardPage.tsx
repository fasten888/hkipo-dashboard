import {
  Activity,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Layers,
  Moon,
  Sun,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { useMemo } from 'react'
import { useAppData } from '../../hooks/useAppData'
import { usePersistentState } from '../../hooks/usePersistentState'
import { CountUpNumber } from '../../components/ui/CountUpNumber'
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
  getSystemStats,
  type TrendPeriod,
} from '../../utils/statistics'

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export function DashboardPage() {
  const { accounts, ipos, subscriptions, sales, withdrawals } = useAppData()
  const [trendPeriod, setTrendPeriod] = usePersistentState<TrendPeriod>('dashboard-trend-period', 'month')

  const stats = getSystemStats(accounts, subscriptions, ipos, sales)
  const performance = getPerformanceSummary(subscriptions, ipos, sales)
  const greyStats = getSaleTypeStats('grey_market', subscriptions, ipos, sales)
  const firstDayStats = getSaleTypeStats('first_day', subscriptions, ipos, sales)
  const heldStats = getSaleTypeStats('held_sale', subscriptions, ipos, sales)
  const financingStats = getFinancingStats(subscriptions, ipos, sales, accounts)
  const trend = getProfitTrend(trendPeriod, subscriptions, ipos, sales)
  const today = new Date().toISOString().slice(0, 10)

  const currentMonthProfit = trend[trend.length - 1]?.profit ?? 0
  const previousMonthProfit = trend[trend.length - 2]?.profit ?? 0
  const monthDelta =
    previousMonthProfit !== 0
      ? ((currentMonthProfit - previousMonthProfit) / Math.abs(previousMonthProfit)) * 100
      : currentMonthProfit > 0 ? 100 : 0

  const pendingIpoCount = new Set(
    subscriptions
      .filter((s) => s.status === 'applied' || s.status === 'announced')
      .map((s) => s.ipoId),
  ).size

  const accountInsights = useMemo(
    () => accounts.map((account) => ({ account, stats: getAccountStats(account, subscriptions, ipos, sales, withdrawals) })),
    [accounts, ipos, sales, subscriptions, withdrawals],
  )

  const capitalCandidate = [...accountInsights]
    .filter((r) => r.account.initialDeposit > 0)
    .sort((a, b) => b.stats.totalProfit / b.account.initialDeposit - a.stats.totalProfit / a.account.initialDeposit)[0]
  const bestFinancing = [...financingStats]
    .filter((r) => r.participationCount > 0)
    .sort((a, b) => b.averageProfitRate - a.averageProfitRate)[0]

  const recent = subscriptions
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  const upcomingIpos = ipos
    .filter((ipo) => (ipo.subscriptionDate && ipo.subscriptionDate >= today) || (ipo.listingDate && ipo.listingDate >= today))
    .sort((a, b) => {
      const l = a.subscriptionDate || a.listingDate
      const r = b.subscriptionDate || b.listingDate
      return l.localeCompare(r)
    })
    .slice(0, 6)

  const operationLogs = getOperationLogs().slice(0, 5)

  const profitComposition = [
    { label: '首日收益', value: Math.max(0, firstDayStats.profit), color: '#EF4444' },
    { label: '暗盘收益', value: Math.max(0, greyStats.profit), color: '#8B5CF6' },
    { label: '长期持有', value: Math.max(0, heldStats.profit), color: '#3B82F6' },
    { label: '手续费', value: Math.max(0, stats.totalCost * 0.5), color: '#F59E0B' },
    { label: '融资费', value: Math.max(0, stats.totalCost * 0.5), color: '#22C55E' },
  ]

  const pendingReleaseAmount = subscriptions
    .filter((s) => s.status === 'applied' || s.status === 'announced')
    .reduce((t, s) => t + s.subscriptionAmount + s.fee, 0)

  // Build upcoming tasks from upcomingIpos
  const upcomingTasks = upcomingIpos.slice(0, 5).map((ipo) => {
    const badge = getIpoBadge(ipo, today)
    const badgeColor =
      badge === '今日可申购' ? { bg: '#FEE2E2', text: '#EF4444' }
      : badge === '即将上市' ? { bg: '#FEF3C7', text: '#D97706' }
      : badge === '今日上市' ? { bg: '#FEF3C7', text: '#D97706' }
      : { bg: '#DCFCE7', text: '#16A34A' }

    const dateStr = ipo.listingDate || ipo.subscriptionDate || '-'
    const timeStr = '16:00'
    return { ipo, badge, badgeColor, dateStr, timeStr }
  })

  const aiRows = [
    {
      icon: '🔔',
      bg: '#EEF2FF',
      title: `未来 3 天内有 ${upcomingIpos.length} 只新股可申购`,
      desc: `预计需要资金 HK$ ${formatHKD(pendingReleaseAmount * 0.3, 'amount')}`,
    },
    {
      icon: '💡',
      bg: '#F0FDF4',
      title: `建议：${
        capitalCandidate ? formatAccountName(capitalCandidate.account) : '暂无账户'
      } 使用 ${bestFinancing ? getSubscriptionMethodLabel(bestFinancing.method) : '融资'} 申购`,
      desc: `${pendingIpoCount > 0 ? `敲 (${pendingIpoCount}) 使用 现金 申购` : '当前暂无待公布新股'}`,
    },
    {
      icon: '💰',
      bg: '#FFF7ED',
      title: `预计资金释放：${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} 17:00`,
      desc: `可释放资金约 HK$ ${formatHKD(pendingReleaseAmount, 'amount')}`,
    },
  ]

  return (
    <div className="space-y-5">
      {/* ── Row 1: KPI large cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="累计收益"
          prefix="HK$"
          value={stats.totalProfit}
          formatter={(v) => formatHKD(v, 'profit', 'dashboardKpi')}
          colorClass="text-[#EF4444]"
          iconBg="#FEE2E2"
          icon={<CircleDollarSign size={20} className="text-[#EF4444]" />}
          hint={`较上月 ${formatSignedDelta(monthDelta)}`}
          hintUp={monthDelta >= 0}
        />
        <KpiCard
          label="收益率"
          value={stats.profitRate}
          formatter={(v) => formatPercent(v, 'profitRate', 'dashboardKpi')}
          colorClass="text-[#8B5CF6]"
          iconBg="#F3E8FF"
          icon={<TrendingUp size={20} className="text-[#8B5CF6]" />}
          hint="较上月 ↑ 3.2%"
          hintUp
        />
        <KpiCard
          label="累计成本"
          prefix="HK$"
          value={stats.totalCost}
          formatter={(v) => formatHKD(v, 'amount', 'dashboardKpi')}
          colorClass="text-[#10B981]"
          iconBg="#DCFCE7"
          icon={<Layers size={20} className="text-[#10B981]" />}
          hint="较上月 ↓ 4.1%"
          hintUp={false}
        />
        <KpiCard
          label="总中签率"
          value={stats.winRate}
          formatter={(v) => formatPercent(v, 'rate', 'dashboardKpi')}
          colorClass="text-[#F59E0B]"
          iconBg="#FEF3C7"
          icon={<Target size={20} className="text-[#F59E0B]" />}
          hint={`${stats.winCount} 次中签 · ${stats.participationCount} 次参与`}
        />
      </div>

      {/* ── Row 2: KPI small cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCardSmall
          label="打新胜率"
          value={performance.overallWinRate}
          formatter={(v) => formatPercent(v, 'rate', 'dashboardKpi')}
          colorClass="text-slate-800"
          icon={<Trophy size={18} className="text-[#4F6EF7]" />}
          iconBg="#EEF2FF"
          hint="较上月 ↑ 2.3%"
          hintUp
        />
        <KpiCardSmall
          label="本月收益"
          prefix="HK$"
          value={performance.monthProfit}
          formatter={(v) => formatHKD(v, 'profit', 'dashboardKpi')}
          colorClass="text-[#EF4444]"
          icon={<CalendarDays size={18} className="text-[#4F6EF7]" />}
          iconBg="#EEF2FF"
          hint="较上月 ↑ 12.6%"
          hintUp
        />
        <KpiCardSmall
          label="暗盘收益"
          prefix="HK$"
          value={greyStats.profit}
          formatter={(v) => formatHKD(v, 'profit', 'dashboardKpi')}
          colorClass="text-[#EF4444]"
          icon={<Moon size={18} className="text-[#8B5CF6]" />}
          iconBg="#F3E8FF"
          hint="较上月 ↑ 15.3%"
          hintUp
        />
        <KpiCardSmall
          label="首日收益"
          prefix="HK$"
          value={firstDayStats.profit}
          formatter={(v) => formatHKD(v, 'profit', 'dashboardKpi')}
          colorClass="text-[#EF4444]"
          icon={<Sun size={18} className="text-[#F59E0B]" />}
          iconBg="#FEF3C7"
          hint="较上月 ↑ 19.8%"
          hintUp
        />
      </div>

      {/* ── Row 3: Chart + Composition ── */}
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        {/* Trend chart */}
        <div className="os-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#1a1a2e]">收益趋势</h2>
            <div className="flex items-center gap-3">
              {/* Legend */}
              <div className="flex items-center gap-4 text-[12px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5 rounded bg-[#EF4444]" />
                  累计收益（HK$）
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5 rounded bg-[#8B5CF6]" style={{ borderBottom: '2px dashed #8B5CF6', background: 'none' }} />
                  收益率（%）
                </span>
              </div>
              {/* Period selector */}
              <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden text-[12px]">
                {([['month', '近12个月'], ['quarter', '按季度'], ['year', '按年']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`px-3 py-1.5 font-medium transition ${
                      trendPeriod === key
                        ? 'bg-[#4F6EF7] text-white'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                    onClick={() => setTrendPeriod(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ProfitTrendChart rows={trend} />
        </div>

        {/* Composition donut */}
        <CompositionCard rows={profitComposition} total={stats.totalProfit} />
      </div>

      {/* ── Row 4: Activity + Tasks + AI ── */}
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        {/* Recent activity */}
        <div className="os-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-[#1a1a2e]">最近动态</h2>
          </div>
          <ActivityList logs={operationLogs} fallback={recent} accounts={accounts} ipos={ipos} />
          <button
            type="button"
            className="mt-4 flex items-center gap-1 text-[12px] font-medium text-[#4F6EF7] hover:text-indigo-700"
          >
            查看全部动态 <ArrowRight size={13} />
          </button>
        </div>

        {/* Upcoming tasks */}
        <div className="os-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-[#1a1a2e]">近期任务</h2>
            <button type="button" className="flex items-center gap-1 text-[12px] font-medium text-[#4F6EF7] hover:text-indigo-700">
              查看全部 <ArrowRight size={12} />
            </button>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-[13px] text-slate-400">
              暂无近期任务。录入申购日或上市日后自动生成。
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map(({ ipo, badge, badgeColor, dateStr, timeStr }) => (
                <div key={ipo.id} className="flex items-center gap-3 rounded-xl py-1.5">
                  {/* Badge */}
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
                    style={{ background: badgeColor.bg, color: badgeColor.text }}
                  >
                    {badge}
                  </span>
                  {/* Name */}
                  <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-slate-800">
                    {ipo.name}
                  </span>
                  {/* Date info */}
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-slate-400">
                      {badge.includes('申购') ? `申购截止：${timeStr}` : `暗盘：${timeStr}`}
                    </p>
                    <p className="text-[11px] font-medium text-slate-600">{dateStr}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI suggestions */}
        <div className="os-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-[#1a1a2e]">AI 智能建议</h2>
            <span className="rounded-full bg-[#F3E8FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#7C3AED]">Beta</span>
          </div>
          <div className="space-y-4">
            {aiRows.map((row, i) => (
              <div key={i} className="flex gap-3">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-base"
                  style={{ background: row.bg }}
                >
                  {row.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold leading-5 text-slate-800">{row.title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{row.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-5 flex items-center gap-1 text-[12px] font-medium text-[#4F6EF7] hover:text-indigo-700"
          >
            查看 AI 详细建议 <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// KPI Card — large (row 1)
// ─────────────────────────────────────────────
function KpiCard({
  label,
  prefix,
  value,
  formatter,
  colorClass,
  iconBg,
  icon,
  hint,
  hintUp,
}: {
  label: string
  prefix?: string
  value: number
  formatter: (v: number) => string
  colorClass: string
  iconBg: string
  icon: React.ReactNode
  hint?: string
  hintUp?: boolean
}) {
  return (
    <div className="os-card os-card-hover min-h-[140px]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
        <span
          className="grid h-10 w-10 place-items-center rounded-xl"
          style={{ background: iconBg }}
        >
          {icon}
        </span>
      </div>
      <CountUpNumber
        value={value}
        format={formatter}
        render={(formatted) => {
          // Split HK$ prefix from number
          const hasPrefix = formatted.startsWith('HK$') || formatted.startsWith('HK')
          const numPart = hasPrefix ? formatted.replace(/^HK\$?\s*/, '') : formatted
          const showPrefix = prefix || hasPrefix
          return (
            <div className={`flex items-baseline gap-1 ${colorClass}`}>
              {showPrefix && (
                <span className="text-[15px] font-bold leading-none">HK$</span>
              )}
              <span
                className="font-extrabold leading-none tracking-[-0.04em] tabular-nums"
                style={{ fontSize: 'clamp(1.5rem, 1.8vw, 2rem)' }}
              >
                {hasPrefix ? numPart : formatted}
              </span>
            </div>
          )
        }}
      />
      {hint && (
        <p className="mt-3 text-[12px] font-medium text-slate-400">
          {hintUp !== undefined ? (
            <>
              <span className={hintUp ? 'text-[#EF4444]' : 'text-[#10B981]'}>
                {hintUp ? '↑' : '↓'}
              </span>{' '}
              {hint.replace(/^[↑↓]\s*/, '')}
            </>
          ) : (
            hint
          )}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// KPI Card — small (row 2)
// ─────────────────────────────────────────────
function KpiCardSmall({
  label,
  prefix,
  value,
  formatter,
  colorClass,
  iconBg,
  icon,
  hint,
  hintUp,
}: {
  label: string
  prefix?: string
  value: number
  formatter: (v: number) => string
  colorClass: string
  iconBg: string
  icon: React.ReactNode
  hint?: string
  hintUp?: boolean
}) {
  return (
    <div className="os-card os-card-hover">
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{ background: iconBg }}
        >
          {icon}
        </span>
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
      </div>
      <CountUpNumber
        value={value}
        format={formatter}
        render={(formatted) => {
          const hasPrefix = formatted.startsWith('HK$') || formatted.startsWith('HK')
          const numPart = hasPrefix ? formatted.replace(/^HK\$?\s*/, '') : formatted
          return (
            <div className={`mt-3 flex items-baseline gap-1 ${colorClass}`}>
              {(prefix || hasPrefix) && (
                <span className="text-[13px] font-bold leading-none">HK$</span>
              )}
              <span
                className="font-extrabold leading-none tracking-[-0.04em] tabular-nums"
                style={{ fontSize: 'clamp(1.25rem, 1.5vw, 1.65rem)' }}
              >
                {hasPrefix ? numPart : formatted}
              </span>
            </div>
          )
        }}
      />
      {hint && (
        <p className="mt-2 text-[12px] font-medium text-slate-400">
          {hintUp !== undefined ? (
            <>
              <span className={hintUp ? 'text-[#EF4444]' : 'text-[#10B981]'}>
                {hintUp ? '↑' : '↓'}
              </span>{' '}
              {hint.replace(/^[↑↓]\s*/, '')}
            </>
          ) : (
            hint
          )}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Profit Trend Chart — with axes + legend dots
// ─────────────────────────────────────────────
function ProfitTrendChart({ rows }: { rows: ReturnType<typeof getProfitTrend> }) {
  if (rows.length === 0) {
    return (
      <div className="grid h-56 place-items-center text-sm text-slate-400">
        录入卖出记录后将自动生成收益趋势
      </div>
    )
  }

  const W = 100      // viewBox width unit
  const H = 80       // viewBox height unit

  const profits = rows.map((r) => r.cumulativeProfit)
  const rates = rows.map((r) => r.profit)

  const pMin = Math.min(...profits, 0)
  const pMax = Math.max(...profits, 1)
  const pRange = pMax - pMin || 1

  const rMin = Math.min(...rates, 0)
  const rMax = Math.max(...rates, 1)
  const rRange = rMax - rMin || 1

  const px = (i: number) =>
    rows.length === 1 ? 50 : (i / (rows.length - 1)) * W
  const py = (v: number, min: number, range: number) =>
    H - ((v - min) / range) * H

  const profitPts = rows.map((r, i) => ({ x: px(i), y: py(r.cumulativeProfit, pMin, pRange) }))
  const ratePts = rows.map((r, i) => ({ x: px(i), y: py(r.profit, rMin, rRange) }))

  const yTicks = 5
  const ySteps = Array.from({ length: yTicks }, (_, i) => {
    const v = pMin + (pRange / (yTicks - 1)) * i
    return { v, y: py(v, pMin, pRange) }
  })

  const rTicks = Array.from({ length: yTicks }, (_, i) => {
    const v = rMin + (rRange / (yTicks - 1)) * i
    return { v, y: py(v, rMin, rRange) }
  })

  // Area under profit line
  const areaPoints =
    profitPts.length > 0
      ? [`0,${H}`, ...profitPts.map(({ x, y }) => `${x},${y}`), `${W},${H}`].join(' ')
      : ''

  const formatK = (v: number) => {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`
    return v.toFixed(0)
  }

  return (
    <div className="overflow-x-auto">
      <div className="relative" style={{ minWidth: 520 }}>
        {/* Main SVG chart */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 220, display: 'block' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="trend-area-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {ySteps.map(({ y }, i) => (
            <line key={i} x1="0" x2={W} y1={y} y2={y} stroke="#E8EAF0" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          ))}

          {/* Area */}
          <polygon points={areaPoints} fill="url(#trend-area-grad)" />

          {/* Rate line (purple dashed) */}
          <polyline
            points={ratePts.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="1.4"
            strokeDasharray="2.5 1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Profit line (red solid) */}
          <polyline
            points={profitPts.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="#EF4444"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Dots on profit line */}
          {profitPts.map(({ x, y }, i) => (
            <circle key={i} cx={x} cy={y} r="1.2" fill="#EF4444" vectorEffect="non-scaling-stroke" />
          ))}

          {/* Dots on rate line */}
          {ratePts.map(({ x, y }, i) => (
            <circle key={i} cx={x} cy={y} r="1" fill="#8B5CF6" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>

        {/* X-axis labels */}
        <div
          className="mt-1 grid"
          style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}
        >
          {rows.map((row) => (
            <div key={row.label} className="text-center text-[10px] text-slate-400">
              {row.label}
            </div>
          ))}
        </div>

        {/* Left Y-axis (absolute, overlaid) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 flex flex-col justify-between pb-6 pt-0">
          {[...ySteps].reverse().map(({ v }, i) => (
            <span key={i} className="text-[9px] tabular-nums text-slate-400">{formatK(v)}</span>
          ))}
        </div>

        {/* Right Y-axis */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-between pb-6 pt-0 text-right">
          {[...rTicks].reverse().map(({ v }, i) => (
            <span key={i} className="text-[9px] tabular-nums text-slate-400">{v.toFixed(0)}%</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Composition donut
// ─────────────────────────────────────────────
function CompositionCard({
  rows,
  total,
}: {
  rows: Array<{ label: string; value: number; color: string }>
  total: number
}) {
  const totalWeight = rows.reduce((s, r) => s + Math.abs(r.value), 0)
  let cursor = 0
  const gradient =
    totalWeight > 0
      ? rows.map((r) => {
          const start = cursor
          const size = (Math.abs(r.value) / totalWeight) * 100
          cursor += size
          return `${r.color} ${start}% ${cursor}%`
        }).join(', ')
      : '#E2E8F0 0% 100%'

  return (
    <div className="os-card">
      <h2 className="mb-4 text-[15px] font-bold text-[#1a1a2e]">收益构成</h2>
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="shrink-0">
          <div
            className="relative grid h-[160px] w-[160px] place-items-center rounded-full"
            style={{ background: `conic-gradient(${gradient})` }}
          >
            <div className="grid h-[98px] w-[98px] place-items-center rounded-full bg-white text-center shadow-sm">
              <div>
                <p className="text-[10px] text-slate-400">总收益</p>
                <p className="mt-0.5 text-[13px] font-bold leading-tight text-slate-800">HK$</p>
                <p className={`text-[15px] font-extrabold leading-tight tracking-[-0.03em] ${getProfitColor(total)}`}>
                  {formatHKD(total, 'profit').replace('HK$ ', '')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legend table */}
        <div className="flex-1 space-y-3">
          {rows.map((row) => {
            const pct = totalWeight > 0 ? (Math.abs(row.value) / totalWeight) * 100 : 0
            return (
              <div key={row.label} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
                <span className="truncate text-[12px] text-slate-600">{row.label}</span>
                <span className="text-[12px] font-semibold tabular-nums text-slate-800">
                  {formatHKD(row.value, 'amount')}
                </span>
                <span className="w-10 text-right text-[12px] tabular-nums text-slate-400">
                  {pct.toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Activity list
// ─────────────────────────────────────────────
function ActivityList({
  logs,
  fallback,
  accounts,
  ipos,
}: {
  logs: OperationLog[]
  fallback: Subscription[]
  accounts: Account[]
  ipos: Ipo[]
}) {
  const items =
    logs.length > 0
      ? logs.map((log) => ({
          id: log.id,
          createdAt: log.createdAt,
          title: log.action,
          detail: log.objectName || log.objectType,
          colorClass: 'bg-[#EEF2FF]',
          textClass: 'text-[#4F6EF7]',
        }))
      : fallback.map((s) => {
          const account = accounts.find((a) => a.id === s.accountId)
          const ipo = ipos.find((i) => i.id === s.ipoId)
          return {
            id: s.id,
            createdAt: s.createdAt,
            title: '新增申购',
            detail: `${ipo?.name ?? '已删除新股'} · ${account ? formatAccountName(account) : '已删除账户'}`,
            colorClass: 'bg-[#DCFCE7]',
            textClass: 'text-[#16A34A]',
          }
        })

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-[12px] text-slate-400">
          暂无动态。新增申购、中签、卖出后会自动出现。
        </p>
      ) : (
        items.map((row) => (
          <div key={row.id} className="flex items-center gap-3 rounded-xl py-0.5">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${row.colorClass}`}>
              <Activity size={13} className={row.textClass} />
            </span>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <p className="truncate text-[12px] font-medium text-slate-800">{row.title}</p>
              <span className="shrink-0 text-[11px] text-slate-400">{formatRelativeTime(row.createdAt)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatSignedDelta(value: number) {
  if (!Number.isFinite(value) || value === 0) return '0.0%'
  return `${value > 0 ? '↑' : '↓'}${Math.abs(value).toFixed(1)}%`
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins || 1} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return days === 1 ? '昨天' : `${days} 天前`
}

function getIpoBadge(ipo: Ipo, today: string) {
  if (ipo.subscriptionDate === today) return '今日可申购'
  if (ipo.listingDate === today) return '今日上市'
  if (ipo.subscriptionDate && ipo.subscriptionDate > today) return '即将申购'
  if (ipo.listingDate && ipo.listingDate > today) return '即将上市'
  return '资金释放'
}
