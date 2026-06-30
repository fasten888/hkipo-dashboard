import {
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
import { useAppData }          from '../../hooks/useAppData'
import { usePersistentState }  from '../../hooks/usePersistentState'
import { CountUpNumber }       from '../../components/ui/CountUpNumber'
import { getOperationLogs }    from '../../services/audit'
import type { Account }        from '../../types/account'
import type { OperationLog }   from '../../types/audit'
import type { Ipo }            from '../../types/ipo'
import type { Subscription }   from '../../types/subscription'
import { formatAccountName }   from '../../utils/account'
import { formatHKD, formatPercent } from '../../utils/currency'
import { getProfitColor }      from '../../utils/profit'
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

/* ════════════════════════════════════════
   Design token shortcuts
   ════════════════════════════════════════ */
const C = {
  brand:   '#B08B7E',
  success: '#7E9587',
  danger:  '#9A7468',
  warning: '#BC9A5F',
  info:    '#8E87A6',
  neutral: '#8C8273',
  text1:   '#4A4540',
  text2:   '#8C8273',
  text3:   '#A8A296',
  border:  '#E4DFD6',
  bg:      '#F4F1ED',
}

/* ════════════════════════════════════════
   Main page
   ════════════════════════════════════════ */
export function DashboardPage() {
  const { accounts, ipos, subscriptions, sales, withdrawals } = useAppData()
  const [trendPeriod, setTrendPeriod] = usePersistentState<TrendPeriod>('dashboard-trend-period', 'month')

  /* ── computed stats ── */
  const stats         = getSystemStats(accounts, subscriptions, ipos, sales)
  const performance   = getPerformanceSummary(subscriptions, ipos, sales)
  const greyStats     = getSaleTypeStats('grey_market', subscriptions, ipos, sales)
  const firstDayStats = getSaleTypeStats('first_day',   subscriptions, ipos, sales)
  const heldStats     = getSaleTypeStats('held_sale',   subscriptions, ipos, sales)
  const financingStats = getFinancingStats(subscriptions, ipos, sales, accounts)
  const trend          = getProfitTrend(trendPeriod, subscriptions, ipos, sales)
  const today          = new Date().toISOString().slice(0, 10)

  const currentMonthProfit  = trend[trend.length - 1]?.profit ?? 0
  const previousMonthProfit = trend[trend.length - 2]?.profit ?? 0
  const monthDelta =
    previousMonthProfit !== 0
      ? ((currentMonthProfit - previousMonthProfit) / Math.abs(previousMonthProfit)) * 100
      : currentMonthProfit > 0 ? 100 : 0

  const pendingIpoCount = new Set(
    subscriptions.filter((s) => s.status === 'applied' || s.status === 'announced').map((s) => s.ipoId),
  ).size

  const accountInsights = useMemo(
    () => accounts.map((a) => ({ account: a, stats: getAccountStats(a, subscriptions, ipos, sales, withdrawals) })),
    [accounts, ipos, sales, subscriptions, withdrawals],
  )

  const capitalCandidate = [...accountInsights].filter((r) => r.account.initialDeposit > 0)
    .sort((a, b) => b.stats.totalProfit / b.account.initialDeposit - a.stats.totalProfit / a.account.initialDeposit)[0]
  const bestFinancing    = [...financingStats].filter((r) => r.participationCount > 0).sort((a, b) => b.averageProfitRate - a.averageProfitRate)[0]

  const recent = subscriptions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  const upcomingIpos = ipos
    .filter((i) => (i.subscriptionDate && i.subscriptionDate >= today) || (i.listingDate && i.listingDate >= today))
    .sort((a, b) => (a.subscriptionDate || a.listingDate).localeCompare(b.subscriptionDate || b.listingDate))
    .slice(0, 6)

  const operationLogs = getOperationLogs().slice(0, 5)

  /* ── composition chart data ── */
  const profitComposition = [
    { label: '首日收益', value: Math.max(0, firstDayStats.profit), color: C.danger },
    { label: '暗盘收益', value: Math.max(0, greyStats.profit),     color: C.info   },
    { label: '长期持有', value: Math.max(0, heldStats.profit),      color: C.brand  },
    { label: '手续费',   value: Math.max(0, stats.totalCost * 0.5), color: C.warning },
    { label: '融资费',   value: Math.max(0, stats.totalCost * 0.5), color: C.success },
  ]

  const pendingReleaseAmount = subscriptions
    .filter((s) => s.status === 'applied' || s.status === 'announced')
    .reduce((t, s) => t + s.subscriptionAmount + s.fee, 0)

  /* ── upcoming tasks from IPO data ── */
  const upcomingTasks = upcomingIpos.slice(0, 5).map((ipo) => {
    const badge = getIpoBadge(ipo, today)
    const style =
      badge.includes('今日') && badge.includes('申购') ? { bg: '#F0E0DC', text: C.danger }
      : badge.includes('申购') ? { bg: '#F0E0DC', text: C.danger }
      : badge.includes('上市') ? { bg: '#F3EAD7', text: '#9F814C' }
      : { bg: '#E5EBE5', text: '#677A6F' }
    return { ipo, badge, style }
  })

  /* ── AI rows ── */
  const aiRows = [
    {
      bg:    '#F8F4F1',
      emoji: '🔔',
      title: `未来 3 天内有 ${upcomingIpos.length} 只新股可申购`,
      desc:  `预计需要资金 HK$ ${formatHKD(pendingReleaseAmount * 0.3, 'amount').replace('HK$ ', '')}`,
    },
    {
      bg:    '#F2F5F2',
      emoji: '💡',
      title: `建议：${capitalCandidate ? formatAccountName(capitalCandidate.account) : '—'} 使用 ${bestFinancing ? getSubscriptionMethodLabel(bestFinancing.method) : '融资'} 申购`,
      desc:  `${pendingIpoCount > 0 ? `同时有 ${pendingIpoCount} 只等待结果` : '当前暂无待公布新股'}`,
    },
    {
      bg:    '#FAF8F57ED',
      emoji: '💰',
      title: `预计资金释放: ${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} 17:00`,
      desc:  `可释放资金约 HK$ ${formatHKD(pendingReleaseAmount, 'amount').replace('HK$ ', '')}`,
    },
  ]

  return (
    /* 区块间距 24px */
    <div className="flex flex-col gap-6">

      {/* ══ Row 1: 4 large KPI cards ══ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiLarge
          label="累计收益"
          value={stats.totalProfit}
          formatter={(v) => formatHKD(v, 'profit', 'dashboardKpi')}
          color={C.danger}
          iconBg="#F0E0DC"
          icon={<CircleDollarSign size={20} color={C.danger} />}
          hint={`较上月 ${formatSignedDelta(monthDelta)}`}
          hintPositive={monthDelta >= 0}
          showHKPrefix
        />
        <KpiLarge
          label="收益率"
          value={stats.profitRate}
          formatter={(v) => formatPercent(v, 'profitRate', 'dashboardKpi')}
          color={C.info}
          iconBg="#E9E7EE"
          icon={<TrendingUp size={20} color={C.info} />}
          hint="较上月 ↑ 3.2%"
          hintPositive
        />
        <KpiLarge
          label="累计成本"
          value={stats.totalCost}
          formatter={(v) => formatHKD(v, 'amount', 'dashboardKpi')}
          color={C.success}
          iconBg="#E5EBE5"
          icon={<Layers size={20} color={C.success} />}
          hint="较上月 ↓ 4.1%"
          hintPositive={false}
          showHKPrefix
        />
        <KpiLarge
          label="中签率"
          value={stats.winRate}
          formatter={(v) => formatPercent(v, 'rate', 'dashboardKpi')}
          color={C.warning}
          iconBg="#F3EAD7"
          icon={<Target size={20} color={C.warning} />}
          hint={`${stats.winCount} 次中签 · ${stats.participationCount} 次参与`}
        />
      </div>

      {/* ══ Row 2: 4 small KPI cards ══ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiSmall
          label="打新胜率"
          value={performance.overallWinRate}
          formatter={(v) => formatPercent(v, 'rate', 'dashboardKpi')}
          color={C.text1}
          iconBg="#F8F4F1"
          icon={<Trophy size={16} color={C.brand} />}
          hint="较上月 ↑ 2.3%"
          hintPositive
        />
        <KpiSmall
          label="本月收益"
          value={performance.monthProfit}
          formatter={(v) => formatHKD(v, 'profit', 'dashboardKpi')}
          color={C.danger}
          iconBg="#F8F4F1"
          icon={<CalendarDays size={16} color={C.brand} />}
          hint="较上月 ↑ 118%"
          hintPositive
          showHKPrefix
        />
        <KpiSmall
          label="暗盘收益"
          value={greyStats.profit}
          formatter={(v) => formatHKD(v, 'profit', 'dashboardKpi')}
          color={C.danger}
          iconBg="#F0E0DC"
          icon={<Moon size={16} color={C.danger} />}
          hint="较上月 ↑ 15.3%"
          hintPositive
          showHKPrefix
        />
        <KpiSmall
          label="首日收益"
          value={firstDayStats.profit}
          formatter={(v) => formatHKD(v, 'profit', 'dashboardKpi')}
          color={C.danger}
          iconBg="#F3EAD7"
          icon={<Sun size={16} color={C.warning} />}
          hint="较上月 ↑ 19.8%"
          hintPositive
          showHKPrefix
        />
      </div>

      {/* ══ Row 3: Trend chart + Composition ══ */}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <TrendCard trend={trend} trendPeriod={trendPeriod} onPeriodChange={setTrendPeriod} />
        <CompositionCard rows={profitComposition} total={stats.totalProfit} />
      </div>

      {/* ══ Row 4: Activity | Tasks | AI ══ */}
      <div className="grid gap-4 xl:grid-cols-3">
        <ActivityCard logs={operationLogs} fallback={recent} accounts={accounts} ipos={ipos} />
        <TasksCard tasks={upcomingTasks} />
        <AiCard rows={aiRows} />
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   KPI Large card (row 1)
   ════════════════════════════════════════ */
function KpiLarge({
  label, value, formatter, color, iconBg, icon, hint, hintPositive, showHKPrefix,
}: {
  label: string
  value: number
  formatter: (v: number) => string
  color: string
  iconBg: string
  icon: React.ReactNode
  hint?: string
  hintPositive?: boolean
  showHKPrefix?: boolean
}) {
  return (
    <div className="os-card os-card-hover">
      {/* Header row */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium" style={{ color: C.text2 }}>{label}</span>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: iconBg }}>
          {icon}
        </span>
      </div>

      {/* Value */}
      <CountUpNumber
        value={value}
        format={formatter}
        render={(formatted) => {
          const isHK    = formatted.startsWith('HK')
          const numPart = isHK ? formatted.replace(/^HK\$?\s*/, '') : formatted
          return (
            <div className="flex items-baseline gap-1" style={{ color }}>
              {(showHKPrefix || isHK) && (
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>HK$</span>
              )}
              <span style={{
                fontSize: 'clamp(1.65rem, 2vw, 2.1rem)',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {isHK ? numPart : formatted}
              </span>
            </div>
          )
        }}
      />

      {/* Hint */}
      {hint && (
        <p className="mt-3 text-[12px] font-medium" style={{ color: C.text3 }}>
          {hintPositive !== undefined ? (
            <>
              <span style={{ color: hintPositive ? C.danger : C.success }}>
                {hintPositive ? '↑' : '↓'}
              </span>{' '}
              {hint.replace(/^[↑↓\s]+/, '')}
            </>
          ) : hint}
        </p>
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   KPI Small card (row 2)
   ════════════════════════════════════════ */
function KpiSmall({
  label, value, formatter, color, iconBg, icon, hint, hintPositive, showHKPrefix,
}: {
  label: string
  value: number
  formatter: (v: number) => string
  color: string
  iconBg: string
  icon: React.ReactNode
  hint?: string
  hintPositive?: boolean
  showHKPrefix?: boolean
}) {
  return (
    <div className="os-card os-card-hover">
      {/* Icon + label row */}
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: iconBg }}>
          {icon}
        </span>
        <span className="text-[13px] font-medium" style={{ color: C.text2 }}>{label}</span>
      </div>

      {/* Value */}
      <CountUpNumber
        value={value}
        format={formatter}
        render={(formatted) => {
          const isHK    = formatted.startsWith('HK')
          const numPart = isHK ? formatted.replace(/^HK\$?\s*/, '') : formatted
          return (
            <div className="flex items-baseline gap-1" style={{ color }}>
              {(showHKPrefix || isHK) && (
                <span style={{ fontSize: 13, fontWeight: 700 }}>HK$</span>
              )}
              <span style={{
                fontSize: 'clamp(1.35rem, 1.6vw, 1.75rem)',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {isHK ? numPart : formatted}
              </span>
            </div>
          )
        }}
      />

      {hint && (
        <p className="mt-2 text-[12px] font-medium" style={{ color: C.text3 }}>
          {hintPositive !== undefined ? (
            <>
              <span style={{ color: hintPositive ? C.danger : C.success }}>
                {hintPositive ? '↑' : '↓'}
              </span>{' '}
              {hint.replace(/^[↑↓\s]+/, '')}
            </>
          ) : hint}
        </p>
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   Trend chart card
   ════════════════════════════════════════ */
function TrendCard({
  trend, trendPeriod, onPeriodChange,
}: {
  trend: ReturnType<typeof getProfitTrend>
  trendPeriod: TrendPeriod
  onPeriodChange: (p: TrendPeriod) => void
}) {
  const periods: [TrendPeriod, string][] = [['month', '近12个月'], ['quarter', '按季度'], ['year', '按年']]

  return (
    <div className="os-card">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold" style={{ color: C.text1 }}>收益趋势</h2>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px]" style={{ color: C.text3 }}>
            <span className="flex items-center gap-1.5">
              <svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke={C.danger} strokeWidth="2" /></svg>
              累计收益（HK$）
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke={C.info} strokeWidth="2" strokeDasharray="3 2" /></svg>
              收益率（%）
            </span>
          </div>
          {/* Period selector */}
          <div className="flex overflow-hidden rounded-[8px] border border-[#E4DFD6] text-[11px]">
            {periods.map(([key, label]) => (
              <button key={key} type="button"
                onClick={() => onPeriodChange(key)}
                className={['px-3 py-1.5 font-medium transition',
                  trendPeriod === key ? 'bg-[#B08B7E] text-white' : 'bg-white text-[#8C8273] hover:bg-[#F4F1ED]',
                ].join(' ')}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ProfitTrendChart rows={trend} />
    </div>
  )
}

/* ── Chart internals ── */
function ProfitTrendChart({ rows }: { rows: ReturnType<typeof getProfitTrend> }) {
  if (rows.length === 0) {
    return (
      <div className="grid h-52 place-items-center text-[13px]" style={{ color: C.text3 }}>
        录入卖出记录后将自动生成收益趋势
      </div>
    )
  }

  const H = 100
  const profits = rows.map((r) => r.cumulativeProfit)
  const rates   = rows.map((r) => r.profit)
  const pMin = Math.min(...profits, 0), pMax = Math.max(...profits, 1), pRange = pMax - pMin || 1
  const rMin = Math.min(...rates,   0), rMax = Math.max(...rates,   1), rRange = rMax - rMin || 1

  const px  = (i: number) => rows.length === 1 ? 50 : (i / (rows.length - 1)) * 100
  const pyP = (v: number) => H - ((v - pMin) / pRange) * H
  const pyR = (v: number) => H - ((v - rMin) / rRange) * H

  const pPts = rows.map((r, i) => ({ x: px(i), y: pyP(r.cumulativeProfit) }))
  const rPts = rows.map((r, i) => ({ x: px(i), y: pyR(r.profit) }))

  const areaStr = pPts.length > 0
    ? [`0,${H}`, ...pPts.map(({ x, y }) => `${x},${y}`), `100,${H}`].join(' ')
    : ''

  const formatK = (v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0)
  const ySteps  = 5
  const yLabels = Array.from({ length: ySteps }, (_, i) => ({
    v: pMin + (pRange / (ySteps - 1)) * i,
    y: pyP(pMin + (pRange / (ySteps - 1)) * i),
  }))
  const rLabels = Array.from({ length: ySteps }, (_, i) => ({
    v: rMin + (rRange / (ySteps - 1)) * i,
    y: pyR(rMin + (rRange / (ySteps - 1)) * i),
  }))

  return (
    <div className="overflow-x-auto">
      <div className="relative" style={{ minWidth: 480 }}>
        {/* Left Y axis labels */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 pr-1">
          <svg viewBox={`0 0 40 ${H}`} className="h-[200px] w-full" preserveAspectRatio="none">
            {[...yLabels].reverse().map(({ v, y }, i) => (
              <text key={i} x="38" y={y + 3} textAnchor="end" fontSize="6" fill={C.text3}>{formatK(v)}</text>
            ))}
          </svg>
        </div>

        {/* Main chart */}
        <div className="mx-10">
          <svg viewBox={`0 0 100 ${H}`} className="h-[200px] w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="area-grad-v3" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%"   stopColor={C.danger} stopOpacity="0.12" />
                <stop offset="100%" stopColor={C.danger} stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {/* Grid */}
            {yLabels.map(({ y }, i) => (
              <line key={i} x1="0" x2="100" y1={y} y2={y} stroke="#E4DFD6" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
            ))}
            {/* Area */}
            <polygon points={areaStr} fill="url(#area-grad-v3)" />
            {/* Rate line */}
            <polyline
              points={rPts.map(({ x, y }) => `${x},${y}`).join(' ')}
              fill="none" stroke={C.info} strokeWidth="1.5"
              strokeDasharray="2.5 1.5" strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {rPts.map(({ x, y }, i) => (
              <circle key={i} cx={x} cy={y} r="1" fill={C.info} vectorEffect="non-scaling-stroke" />
            ))}
            {/* Profit line */}
            <polyline
              points={pPts.map(({ x, y }) => `${x},${y}`).join(' ')}
              fill="none" stroke={C.danger} strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {pPts.map(({ x, y }, i) => (
              <circle key={i} cx={x} cy={y} r="1.2" fill={C.danger} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {/* X labels */}
          <div className="mt-1 grid" style={{ gridTemplateColumns: `repeat(${rows.length}, 1fr)` }}>
            {rows.map((r) => (
              <div key={r.label} className="text-center text-[10px]" style={{ color: C.text3 }}>{r.label}</div>
            ))}
          </div>
        </div>

        {/* Right Y axis labels */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 pl-1">
          <svg viewBox={`0 0 40 ${H}`} className="h-[200px] w-full" preserveAspectRatio="none">
            {[...rLabels].reverse().map(({ v, y }, i) => (
              <text key={i} x="2" y={y + 3} textAnchor="start" fontSize="6" fill={C.text3}>{v.toFixed(0)}%</text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   Composition donut card
   ════════════════════════════════════════ */
function CompositionCard({
  rows, total,
}: {
  rows: Array<{ label: string; value: number; color: string }>
  total: number
}) {
  const tw = rows.reduce((s, r) => s + Math.abs(r.value), 0)
  let cur = 0
  const grad = tw > 0
    ? rows.map((r) => { const s = cur; cur += (Math.abs(r.value) / tw) * 100; return `${r.color} ${s}% ${cur}%` }).join(', ')
    : '#E4DFD6 0% 100%'

  const totalStr = formatHKD(total, 'profit').replace('HK$ ', '')

  return (
    <div className="os-card">
      <h2 className="mb-4 text-[15px] font-semibold" style={{ color: C.text1 }}>收益构成</h2>
      <div className="flex items-center gap-5">
        {/* Donut */}
        <div className="shrink-0">
          <div className="relative grid h-[150px] w-[150px] place-items-center rounded-full"
            style={{ background: `conic-gradient(${grad})` }}>
            <div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-white text-center shadow-sm">
              <div>
                <p className="text-[10px] font-medium" style={{ color: C.text3 }}>总收益</p>
                <p className="text-[11px] font-bold" style={{ color: C.text1 }}>HK$</p>
                <p className="text-[14px] font-extrabold leading-tight tracking-tight" style={{ color: getProfitColor(total) === 'text-red-500' ? C.danger : C.success }}>
                  {totalStr}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2.5">
          {rows.map((r) => {
            const pct = tw > 0 ? (Math.abs(r.value) / tw) * 100 : 0
            return (
              <div key={r.label} className="grid items-center gap-2" style={{ gridTemplateColumns: 'auto 1fr auto auto' }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                <span className="truncate text-[12px]" style={{ color: C.text2 }}>{r.label}</span>
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: C.text1 }}>
                  {formatHKD(r.value, 'amount')}
                </span>
                <span className="w-10 text-right text-[11px] tabular-nums" style={{ color: C.text3 }}>
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

/* ════════════════════════════════════════
   Activity card
   ════════════════════════════════════════ */
function ActivityCard({
  logs, fallback, accounts, ipos,
}: {
  logs: OperationLog[]
  fallback: Subscription[]
  accounts: Account[]
  ipos: Ipo[]
}) {
  const items = logs.length > 0
    ? logs.map((l) => ({ id: l.id, createdAt: l.createdAt, title: l.action, detail: l.objectName || l.objectType, dot: C.brand }))
    : fallback.map((s) => {
        const acct = accounts.find((a) => a.id === s.accountId)
        const ipo  = ipos.find((i) => i.id === s.ipoId)
        return { id: s.id, createdAt: s.createdAt, title: '新增申购', detail: `${ipo?.name ?? '已删除新股'} · ${acct ? formatAccountName(acct) : '已删除账户'}`, dot: C.success }
      })

  const dotColors = [C.danger, C.success, C.brand, C.warning, C.info]

  return (
    <div className="os-card">
      <h2 className="mb-4 text-[14px] font-semibold" style={{ color: C.text1 }}>最近动态</h2>
      {items.length === 0 ? (
        <p className="rounded-[10px] p-4 text-[12px]" style={{ background: C.bg, color: C.text3 }}>
          暂无动态。新增申购、中签、卖出后会自动出现。
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((row, i) => (
            <div key={row.id} className="flex items-start gap-3">
              {/* Color icon dot */}
              <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg"
                style={{ background: dotColors[i % dotColors.length] + '1A' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColors[i % dotColors.length] }} />
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium" style={{ color: C.text1 }}>{row.title}</p>
                  <p className="truncate text-[11px]" style={{ color: C.text3 }}>{row.detail}</p>
                </div>
                <span className="shrink-0 text-[11px]" style={{ color: C.text3 }}>{formatRelativeTime(row.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="mt-4 flex items-center gap-1 text-[12px] font-medium transition hover:opacity-70" style={{ color: C.brand }}>
        查看全部动态 <ArrowRight size={12} />
      </button>
    </div>
  )
}

/* ════════════════════════════════════════
   Tasks card (近期任务)
   ════════════════════════════════════════ */
function TasksCard({
  tasks,
}: {
  tasks: Array<{ ipo: Ipo; badge: string; style: { bg: string; text: string } }>
}) {
  return (
    <div className="os-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold" style={{ color: C.text1 }}>近期任务</h2>
        <button type="button" className="flex items-center gap-1 text-[12px] font-medium" style={{ color: C.brand }}>
          查看全部 <ArrowRight size={12} />
        </button>
      </div>
      {tasks.length === 0 ? (
        <p className="rounded-[10px] p-4 text-[12px]" style={{ background: C.bg, color: C.text3 }}>
          暂无近期任务。录入申购日或上市日后自动生成。
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map(({ ipo, badge, style }) => {
            const dateStr = ipo.listingDate || ipo.subscriptionDate || '-'
            const timeLabel = badge.includes('申购') ? '申购截止：16:00' : badge.includes('上市') ? '暗盘：16:15' : '预计释放：17:00'
            return (
              <div key={ipo.id} className="flex items-center gap-3 py-0.5">
                {/* Badge */}
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
                  style={{ background: style.bg, color: style.text }}>
                  {badge}
                </span>
                {/* Name */}
                <span className="flex-1 min-w-0 truncate text-[12px] font-medium" style={{ color: C.text1 }}>
                  {ipo.name}
                </span>
                {/* Date */}
                <div className="shrink-0 text-right">
                  <p className="text-[10px]" style={{ color: C.text3 }}>{timeLabel}</p>
                  <p className="text-[11px] font-medium" style={{ color: C.text2 }}>{dateStr}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   AI card
   ════════════════════════════════════════ */
function AiCard({
  rows,
}: {
  rows: Array<{ bg: string; emoji: string; title: string; desc: string }>
}) {
  return (
    <div className="os-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold" style={{ color: C.text1 }}>AI 智能建议</h2>
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: '#F5F4F7', color: '#766E8E' }}>
          Beta
        </span>
      </div>
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-[16px]"
              style={{ background: row.bg }}>
              {row.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold leading-5" style={{ color: C.text1 }}>{row.title}</p>
              <p className="mt-0.5 text-[11px] leading-4" style={{ color: C.text3 }}>{row.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="mt-5 flex items-center gap-1 text-[12px] font-medium" style={{ color: C.brand }}>
        查看 AI 详细建议 <ArrowRight size={12} />
      </button>
    </div>
  )
}

/* ════════════════════════════════════════
   Helpers
   ════════════════════════════════════════ */
function formatSignedDelta(v: number) {
  if (!Number.isFinite(v) || v === 0) return '0.0%'
  return `${v > 0 ? '↑' : '↓'} ${Math.abs(v).toFixed(1)}%`
}

function formatRelativeTime(value: string) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const diff  = Date.now() - d.getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 60) return `${mins || 1} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

function getIpoBadge(ipo: Ipo, today: string) {
  if (ipo.subscriptionDate === today) return '今日可申购'
  if (ipo.listingDate       === today) return '今日上市'
  if (ipo.subscriptionDate && ipo.subscriptionDate > today) return '即将申购'
  if (ipo.listingDate       && ipo.listingDate       > today) return '即将上市'
  return '资金释放'
}
