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
import { useMemo, useState, type ReactNode } from 'react'
import { useAppData }          from '../../hooks/useAppData'
import { usePersistentState }  from '../../hooks/usePersistentState'
import { CountUpNumber }       from '../../components/ui/CountUpNumber'
import { Modal }               from '../../components/ui/Modal'
import { getOperationLogs }    from '../../services/audit'
import type { Account }        from '../../types/account'
import type { OperationLog }   from '../../types/audit'
import type { DashboardFilter } from '../../types/dashboardFilter'
import type { Ipo }            from '../../types/ipo'
import type { Sale }           from '../../types/sale'
import type { Subscription }   from '../../types/subscription'
import { formatAccountName }   from '../../utils/account'
import { formatHKD, formatPercent } from '../../utils/currency'
import { getSubscriptionMethodLabel } from '../../utils/subscriptionMethod'
import {
  getAccountStats,
  getFinancingStats,
  getPerformanceSummary,
  getProfitTrend,
  getSaleTypeStats,
  getSubscriptionMetrics,
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
export function DashboardPage({ filter }: { filter: DashboardFilter }) {
  const { accounts, ipos, subscriptions, sales, withdrawals } = useAppData()
  const [trendPeriod, setTrendPeriod] = usePersistentState<TrendPeriod>('dashboard-trend-period', 'month')
  const [detailType, setDetailType] = useState<DashboardDetailType | null>(null)
  const activeRange = useMemo(() => getActiveDateRange(filter), [filter])
  const scopedAccounts = useMemo(
    () => filter.accountId === 'all'
      ? accounts
      : accounts.filter((account) => account.id === filter.accountId),
    [accounts, filter.accountId],
  )
  const scopedAccountIds = useMemo(
    () => new Set(scopedAccounts.map((account) => account.id)),
    [scopedAccounts],
  )
  const scopedSubscriptions = useMemo(
    () => subscriptions.filter((subscription) =>
      scopedAccountIds.has(subscription.accountId) &&
      isDateInRange(subscription.subscriptionDate, activeRange),
    ),
    [activeRange, scopedAccountIds, subscriptions],
  )
  const accountMatchedSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => scopedAccountIds.has(subscription.accountId)),
    [scopedAccountIds, subscriptions],
  )
  const accountMatchedSubscriptionIds = useMemo(
    () => new Set(accountMatchedSubscriptions.map((subscription) => subscription.id)),
    [accountMatchedSubscriptions],
  )
  const scopedSales = useMemo(
    () => sales.filter((sale) =>
      accountMatchedSubscriptionIds.has(sale.subscriptionId) &&
      isDateInRange(sale.date, activeRange),
    ),
    [accountMatchedSubscriptionIds, activeRange, sales],
  )
  const scopedStats = useMemo(
    () => getScopedDashboardStats(scopedAccounts, scopedSubscriptions, accountMatchedSubscriptions, ipos, scopedSales),
    [accountMatchedSubscriptions, ipos, scopedAccounts, scopedSales, scopedSubscriptions],
  )

  /* ── computed stats ── */
  const performance   = getPerformanceSummary(accountMatchedSubscriptions, ipos, scopedSales)
  const heldStats     = getSaleTypeStats('held_sale',   accountMatchedSubscriptions, ipos, scopedSales)
  const financingStats = getFinancingStats(scopedSubscriptions, ipos, scopedSales, scopedAccounts)
  const trend          = getProfitTrend(trendPeriod, accountMatchedSubscriptions, ipos, scopedSales)
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
    () => scopedAccounts.map((a) => ({ account: a, stats: getAccountStats(a, scopedSubscriptions, ipos, scopedSales, withdrawals) })),
    [ipos, scopedAccounts, scopedSales, scopedSubscriptions, withdrawals],
  )

  const capitalCandidate = [...accountInsights].filter((r) => r.account.initialDeposit > 0)
    .sort((a, b) => b.stats.totalProfit / b.account.initialDeposit - a.stats.totalProfit / a.account.initialDeposit)[0]
  const bestFinancing    = [...financingStats].filter((r) => r.participationCount > 0).sort((a, b) => b.averageProfitRate - a.averageProfitRate)[0]

  const recent = scopedSubscriptions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  const upcomingIpos = ipos
    .filter((i) => (i.subscriptionDate && i.subscriptionDate >= today) || (i.listingDate && i.listingDate >= today))
    .sort((a, b) => (a.subscriptionDate || a.listingDate).localeCompare(b.subscriptionDate || b.listingDate))
    .slice(0, 6)

  const operationLogs = getOperationLogs().slice(0, 5)

  /* ── composition chart data ── */
  const profitComposition = [
    { label: '首日收益', value: Math.max(0, scopedStats.firstDayProfit), color: C.danger },
    { label: '暗盘收益', value: Math.max(0, scopedStats.greyProfit),     color: C.info   },
    { label: '长期持有', value: Math.max(0, heldStats.profit),      color: C.brand  },
    { label: '手续费',   value: Math.max(0, scopedStats.subscriptionFees), color: C.warning },
    { label: '卖出佣金', value: Math.max(0, scopedStats.saleCommissions), color: C.success },
  ]

  const pendingReleaseAmount = scopedSubscriptions
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
          value={scopedStats.totalProfit}
          formatter={(v) => formatHKD(v, 'profit', 'dashboardKpi')}
          color={C.danger}
          iconBg="#F0E0DC"
          icon={<CircleDollarSign size={20} color={C.danger} />}
          hint={`较上月 ${formatSignedDelta(monthDelta)}`}
          hintPositive={monthDelta >= 0}
          showHKPrefix
          onClick={() => setDetailType('profit')}
        />
        <KpiLarge
          label="收益率"
          value={scopedStats.profitRate}
          formatter={(v) => formatPercent(v, 'profitRate', 'dashboardKpi')}
          color={C.info}
          iconBg="#E9E7EE"
          icon={<TrendingUp size={20} color={C.info} />}
          hint="较上月 ↑ 3.2%"
          hintPositive
        />
        <KpiLarge
          label="累计成本"
          value={scopedStats.totalCost}
          formatter={(v) => formatHKD(v, 'amount', 'dashboardKpi')}
          color={C.success}
          iconBg="#E5EBE5"
          icon={<Layers size={20} color={C.success} />}
          hint="较上月 ↓ 4.1%"
          hintPositive={false}
          showHKPrefix
          onClick={() => setDetailType('cost')}
        />
        <KpiLarge
          label="中签率"
          value={scopedStats.winRate}
          formatter={(v) => formatPercent(v, 'rate', 'dashboardKpi')}
          color={C.warning}
          iconBg="#F3EAD7"
          icon={<Target size={20} color={C.warning} />}
          hint={`${scopedStats.winCount} 次中签 · ${scopedStats.participationCount} 次参与`}
          onClick={() => setDetailType('wins')}
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
          label="区间收益"
          value={scopedStats.totalProfit}
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
          value={scopedStats.greyProfit}
          formatter={(v) => formatHKD(v, 'profit', 'dashboardKpi')}
          color={C.danger}
          iconBg="#F0E0DC"
          icon={<Moon size={16} color={C.danger} />}
          hint="较上月 ↑ 15.3%"
          hintPositive
          showHKPrefix
          onClick={() => setDetailType('grey')}
        />
        <KpiSmall
          label="首日收益"
          value={scopedStats.firstDayProfit}
          formatter={(v) => formatHKD(v, 'profit', 'dashboardKpi')}
          color={C.danger}
          iconBg="#F3EAD7"
          icon={<Sun size={16} color={C.warning} />}
          hint="较上月 ↑ 19.8%"
          hintPositive
          showHKPrefix
          onClick={() => setDetailType('firstDay')}
        />
      </div>

      {/* ══ Row 3: Trend chart + Composition ══ */}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <TrendCard trend={trend} trendPeriod={trendPeriod} onPeriodChange={setTrendPeriod} />
        <CompositionCard rows={profitComposition} total={scopedStats.totalProfit} />
      </div>

      {/* ══ Row 4: Activity | Tasks | AI ══ */}
      <div className="grid gap-4 xl:grid-cols-3">
        <ActivityCard logs={operationLogs} fallback={recent} accounts={accounts} ipos={ipos} />
        <TasksCard tasks={upcomingTasks} />
        <AiCard rows={aiRows} />
      </div>

      <DashboardDetailModal
        type={detailType}
        accounts={accounts}
        ipos={ipos}
        subscriptions={scopedSubscriptions}
        sales={scopedSales}
        onClose={() => setDetailType(null)}
      />
    </div>
  )
}

/* ════════════════════════════════════════
   KPI Large card (row 1)
   ════════════════════════════════════════ */
function KpiLarge({
  label, value, formatter, color, iconBg, icon, hint, hintPositive, showHKPrefix, onClick,
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
  onClick?: () => void
}) {
  const Component = onClick ? 'button' : 'div'
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'os-card os-card-hover w-full text-left',
        onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B08B7E]/25' : '',
      ].join(' ')}
    >
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
    </Component>
  )
}

/* ════════════════════════════════════════
   KPI Small card (row 2)
   ════════════════════════════════════════ */
function KpiSmall({
  label, value, formatter, color, iconBg, icon, hint, hintPositive, showHKPrefix, onClick,
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
  onClick?: () => void
}) {
  const Component = onClick ? 'button' : 'div'
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'os-card os-card-hover w-full text-left',
        onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B08B7E]/25' : '',
      ].join(' ')}
    >
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
    </Component>
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
      <div className="flex flex-col items-center gap-6">
        {/* Donut */}
        <div className="shrink-0">
          <div className="relative grid h-[150px] w-[150px] place-items-center rounded-full"
            style={{ background: `conic-gradient(${grad})` }}>
            <div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-white text-center shadow-sm">
              <div>
                <p className="text-[10px] font-medium" style={{ color: C.text3 }}>总收益</p>
                <p className="text-[11px] font-bold" style={{ color: C.text1 }}>HK$</p>
                <p className="text-[14px] font-extrabold leading-tight tracking-tight" style={{ color: total >= 0 ? C.danger : C.success }}>
                  {totalStr}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legend — full width, single column, generous spacing */}
        <div className="w-full space-y-3">
          {rows.map((r) => {
            const pct = tw > 0 ? (Math.abs(r.value) / tw) * 100 : 0
            return (
              <div key={r.label} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="min-w-0 flex-1 text-[13px] font-medium" style={{ color: C.text1 }}>
                  {r.label}
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: C.text1 }}>
                  {formatHKD(r.value, 'amount')}
                </span>
                <span className="w-12 shrink-0 text-right text-[12px] tabular-nums" style={{ color: C.text3 }}>
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
   KPI detail modal
   ════════════════════════════════════════ */
type DashboardDetailType = 'profit' | 'cost' | 'wins' | 'grey' | 'firstDay'

interface DashboardDetailRow {
  id: string
  title: string
  subtitle: string
  meta: string
  amount?: number
  amountKind?: 'profit' | 'cost' | 'neutral'
  extra?: ReactNode
}

function DashboardDetailModal({
  type,
  accounts,
  ipos,
  subscriptions,
  sales,
  onClose,
}: {
  type: DashboardDetailType | null
  accounts: Account[]
  ipos: Ipo[]
  subscriptions: Subscription[]
  sales: Sale[]
  onClose: () => void
}) {
  const detail = useMemo(
    () => type ? getDashboardDetail(type, accounts, ipos, subscriptions, sales) : null,
    [accounts, ipos, sales, subscriptions, type],
  )

  if (!detail) return null

  return (
    <Modal
      open={Boolean(type)}
      title={detail.title}
      description={detail.description}
      onClose={onClose}
      fullScreenOnMobile
    >
      <div className="px-5 py-5 sm:px-8">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {detail.summary.map((item) => (
            <div key={item.label} className="rounded-[16px] bg-[#F8F4F1] p-4">
              <p className="text-[11px] font-medium text-[#A8A296]">{item.label}</p>
              <p className="mt-1 text-[18px] font-bold tabular-nums text-[#4A4540]">{item.value}</p>
            </div>
          ))}
        </div>

        {detail.rows.length === 0 ? (
          <div className="grid min-h-40 place-items-center rounded-[18px] bg-[#F8F4F1] text-[13px] text-[#A8A296]">
            暂无对应明细
          </div>
        ) : (
          <div className="space-y-3">
            {detail.rows.map((row) => (
              <div
                key={row.id}
                className="rounded-[18px] border border-[#E4DFD6] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(74,69,64,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[#4A4540]">{row.title}</p>
                    <p className="mt-1 text-[12px] text-[#8C8273]">{row.subtitle}</p>
                    <p className="mt-1 text-[11px] text-[#A8A296]">{row.meta}</p>
                  </div>
                  {row.amount !== undefined && (
                    <p
                      className="shrink-0 text-right text-[14px] font-bold tabular-nums"
                      style={{
                        color:
                          row.amountKind === 'cost' ? C.success
                          : row.amountKind === 'neutral' ? C.text1
                          : row.amount >= 0 ? C.danger : C.success,
                      }}
                    >
                      {formatHKD(row.amount, row.amountKind === 'cost' || row.amountKind === 'neutral' ? 'amount' : 'profit')}
                    </p>
                  )}
                </div>
                {row.extra && <div className="mt-3">{row.extra}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function getDashboardDetail(
  type: DashboardDetailType,
  accounts: Account[],
  ipos: Ipo[],
  subscriptions: Subscription[],
  sales: Sale[],
) {
  const accountOf = (subscription?: Subscription) => accounts.find((account) => account.id === subscription?.accountId)
  const ipoOf = (subscription?: Subscription) => ipos.find((ipo) => ipo.id === subscription?.ipoId)
  const saleRows = (method?: Sale['method']): DashboardDetailRow[] =>
    sales
      .filter((sale) => !method || sale.method === method)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((sale) => {
        const subscription = subscriptions.find((item) => item.id === sale.subscriptionId)
        const ipo = ipoOf(subscription)
        const account = accountOf(subscription)
        const metrics = getSaleDetailMetrics(sale, subscription, ipo, sales)
        return {
          id: sale.id,
          title: ipo ? `${ipo.name}（${ipo.stockCode || '-'}）` : '已删除新股',
          subtitle: account ? formatAccountName(account) : '已删除账户',
          meta: `${formatSaleMethod(sale.method)} · ${sale.date || '-'} · ${sale.shares} 股 × HK$ ${sale.price.toFixed(2)}`,
          amount: metrics.profit,
          amountKind: 'profit',
          extra: (
            <div className="flex flex-wrap gap-2 text-[11px] font-medium text-[#8C8273]">
              <span className="rounded-full bg-[#F8F4F1] px-2 py-1">发行成本 {formatHKD(metrics.issueCost, 'amount')}</span>
              <span className="rounded-full bg-[#F8F4F1] px-2 py-1">分摊手续费 {formatHKD(metrics.allocatedFee, 'amount')}</span>
              <span className="rounded-full bg-[#F8F4F1] px-2 py-1">卖出佣金 {formatHKD(sale.commission ?? 0, 'amount')}</span>
            </div>
          ),
        }
      })

  if (type === 'grey' || type === 'firstDay') {
    const method = type === 'grey' ? 'grey_market' : 'first_day'
    const rows = saleRows(method)
    const total = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
    return {
      title: type === 'grey' ? '暗盘收益明细' : '首日收益明细',
      description: '按卖出记录拆分，收益已扣除分摊申购手续费和卖出佣金。',
      summary: [
        { label: '记录数', value: `${rows.length}` },
        { label: '总收益', value: formatHKD(total, 'profit') },
        { label: '盈利记录', value: `${rows.filter((row) => (row.amount ?? 0) > 0).length}` },
        { label: '亏损记录', value: `${rows.filter((row) => (row.amount ?? 0) < 0).length}` },
      ],
      rows,
    }
  }

  if (type === 'cost') {
    const subscriptionCosts: DashboardDetailRow[] = subscriptions
      .filter((subscription) => subscription.fee > 0)
      .slice()
      .sort((a, b) => b.subscriptionDate.localeCompare(a.subscriptionDate))
      .map((subscription) => {
        const ipo = ipoOf(subscription)
        const account = accountOf(subscription)
        return {
          id: `fee-${subscription.id}`,
          title: ipo ? `${ipo.name}（${ipo.stockCode || '-'}）` : '已删除新股',
          subtitle: account ? formatAccountName(account) : '已删除账户',
          meta: `申购手续费 · ${subscription.subscriptionDate || '-'} · ${getSubscriptionMethodLabel(subscription.subscriptionMethod ?? subscription.method)}`,
          amount: subscription.fee,
          amountKind: 'cost',
        }
      })
    const commissionCosts: DashboardDetailRow[] = sales
      .filter((sale) => (sale.commission ?? 0) > 0)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((sale) => {
        const subscription = subscriptions.find((item) => item.id === sale.subscriptionId)
        const ipo = ipoOf(subscription)
        const account = accountOf(subscription)
        return {
          id: `commission-${sale.id}`,
          title: ipo ? `${ipo.name}（${ipo.stockCode || '-'}）` : '已删除新股',
          subtitle: account ? formatAccountName(account) : '已删除账户',
          meta: `卖出佣金 · ${sale.date || '-'} · ${formatSaleMethod(sale.method)}`,
          amount: sale.commission ?? 0,
          amountKind: 'cost',
        }
      })
    const rows = [...subscriptionCosts, ...commissionCosts]
    const total = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
    return {
      title: '累计成本明细',
      description: '包含申购手续费、融资申购费和卖出佣金等已记录成本。',
      summary: [
        { label: '成本总额', value: formatHKD(total, 'amount') },
        { label: '申购成本', value: formatHKD(subscriptionCosts.reduce((sum, row) => sum + (row.amount ?? 0), 0), 'amount') },
        { label: '卖出佣金', value: formatHKD(commissionCosts.reduce((sum, row) => sum + (row.amount ?? 0), 0), 'amount') },
        { label: '记录数', value: `${rows.length}` },
      ],
      rows,
    }
  }

  if (type === 'wins') {
    const rows: DashboardDetailRow[] = subscriptions
      .filter((subscription) => subscription.status === 'won')
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((subscription) => {
        const ipo = ipoOf(subscription)
        const account = accountOf(subscription)
        const metrics = getSubscriptionMetrics(subscription, ipo, sales)
        return {
          id: subscription.id,
          title: ipo ? `${ipo.name}（${ipo.stockCode || '-'}）` : '已删除新股',
          subtitle: account ? formatAccountName(account) : '已删除账户',
          meta: `${subscription.subscriptionDate || '-'} · 中签 ${subscription.allottedShares} 股 / ${subscription.allottedLots} 手`,
          amount: metrics.netProfit,
          amountKind: 'profit',
        }
      })
    return {
      title: '中签记录明细',
      description: '所有已标记为中签的申购记录。',
      summary: [
        { label: '中签次数', value: `${rows.length}` },
        { label: '中签股数', value: `${subscriptions.filter((s) => s.status === 'won').reduce((sum, s) => sum + s.allottedShares, 0)}` },
        { label: '中签手数', value: `${subscriptions.filter((s) => s.status === 'won').reduce((sum, s) => sum + s.allottedLots, 0)}` },
        { label: '已实现收益', value: formatHKD(rows.reduce((sum, row) => sum + (row.amount ?? 0), 0), 'profit') },
      ],
      rows,
    }
  }

  const rows: DashboardDetailRow[] = subscriptions
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((subscription) => {
      const ipo = ipoOf(subscription)
      const account = accountOf(subscription)
      const metrics = getSubscriptionMetrics(subscription, ipo, sales)
      return {
        id: subscription.id,
        title: ipo ? `${ipo.name}（${ipo.stockCode || '-'}）` : '已删除新股',
        subtitle: account ? formatAccountName(account) : '已删除账户',
        meta: `${subscription.subscriptionDate || '-'} · ${formatSubscriptionStatus(subscription.status)} · 已卖 ${metrics.soldShares} 股`,
        amount: metrics.netProfit,
        amountKind: 'profit',
        extra: (
          <div className="flex flex-wrap gap-2 text-[11px] font-medium text-[#8C8273]">
            <span className="rounded-full bg-[#F8F4F1] px-2 py-1">卖出金额 {formatHKD(metrics.saleIncome, 'amount')}</span>
            <span className="rounded-full bg-[#F8F4F1] px-2 py-1">发行成本 {formatHKD(metrics.issueCost, 'amount')}</span>
            <span className="rounded-full bg-[#F8F4F1] px-2 py-1">手续费 {formatHKD(metrics.fee, 'amount')}</span>
            <span className="rounded-full bg-[#F8F4F1] px-2 py-1">佣金 {formatHKD(metrics.commissions, 'amount')}</span>
          </div>
        ),
      }
    })
  return {
    title: '累计收益明细',
    description: '按申购记录汇总，净收益 = 卖出金额 - 发行成本 - 申购手续费 - 卖出佣金。',
    summary: [
      { label: '累计收益', value: formatHKD(rows.reduce((sum, row) => sum + (row.amount ?? 0), 0), 'profit') },
      { label: '申购记录', value: `${rows.length}` },
      { label: '盈利记录', value: `${rows.filter((row) => (row.amount ?? 0) > 0).length}` },
      { label: '亏损记录', value: `${rows.filter((row) => (row.amount ?? 0) < 0).length}` },
    ],
    rows,
  }
}

function getScopedDashboardStats(
  accounts: Account[],
  scopedSubscriptions: Subscription[],
  accountMatchedSubscriptions: Subscription[],
  ipos: Ipo[],
  scopedSales: Sale[],
) {
  const accountIds = new Set(accounts.map((account) => account.id))
  const subscriptionMap = new Map(accountMatchedSubscriptions.map((subscription) => [subscription.id, subscription]))
  const ipoMap = new Map(ipos.map((ipo) => [ipo.id, ipo]))
  const decided = scopedSubscriptions.filter((subscription) => subscription.status === 'won' || subscription.status === 'lost')
  const winCount = scopedSubscriptions.filter((subscription) => subscription.status === 'won').length
  const saleRows = scopedSales
    .map((sale) => {
      const subscription = subscriptionMap.get(sale.subscriptionId)
      if (!subscription || !accountIds.has(subscription.accountId)) return null
      const ipo = ipoMap.get(subscription.ipoId)
      return {
        sale,
        ...getSaleDetailMetrics(sale, subscription, ipo, scopedSales),
      }
    })
    .filter((row): row is {
      sale: Sale
      issueCost: number
      allocatedFee: number
      profit: number
    } => Boolean(row))
  const subscriptionFees = scopedSubscriptions.reduce((sum, subscription) => sum + subscription.fee, 0)
  const saleCommissions = scopedSales.reduce((sum, sale) => sum + (sale.commission ?? 0), 0)
  const issueCost = saleRows.reduce((sum, row) => sum + row.issueCost, 0)
  const totalProfit = saleRows.reduce((sum, row) => sum + row.profit, 0)
  const totalCost = subscriptionFees + saleCommissions
  const investedCost = issueCost + saleRows.reduce((sum, row) => sum + row.allocatedFee, 0) + saleCommissions

  return {
    participationCount: scopedSubscriptions.length,
    winCount,
    winRate: decided.length > 0 ? (winCount / decided.length) * 100 : 0,
    totalProfit,
    totalCost,
    subscriptionFees,
    saleCommissions,
    profitRate: investedCost > 0 ? (totalProfit / investedCost) * 100 : 0,
    greyProfit: saleRows
      .filter((row) => row.sale.method === 'grey_market')
      .reduce((sum, row) => sum + row.profit, 0),
    firstDayProfit: saleRows
      .filter((row) => row.sale.method === 'first_day')
      .reduce((sum, row) => sum + row.profit, 0),
  }
}

function getSaleDetailMetrics(
  sale: Sale,
  subscription: Subscription | undefined,
  ipo: Ipo | undefined,
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
  const profit = sale.shares * (sale.price - (ipo?.issuePrice ?? 0)) - allocatedFee - (sale.commission ?? 0)
  return { issueCost, allocatedFee, profit }
}

function getActiveDateRange(filter: DashboardFilter) {
  if (filter.rangePreset === 'custom' && filter.customStartMonth && filter.customEndMonth) {
    const start = filter.customStartMonth <= filter.customEndMonth ? filter.customStartMonth : filter.customEndMonth
    const end = filter.customStartMonth <= filter.customEndMonth ? filter.customEndMonth : filter.customStartMonth
    return {
      start: `${start}-01`,
      end: monthEndDate(end),
    }
  }

  const months = filter.rangePreset === '3m' ? 3 : filter.rangePreset === '6m' ? 6 : 12
  const now = new Date()
  const endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
  const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`
  return {
    start: `${startMonth}-01`,
    end: monthEndDate(endMonth),
  }
}

function monthEndDate(month: string) {
  const [yearText, monthText] = month.split('-')
  const year = Number(yearText)
  const monthIndex = Number(monthText)
  if (!year || !monthIndex) return `${month}-31`
  const end = new Date(year, monthIndex, 0)
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
}

function isDateInRange(value: string | undefined, range: { start: string; end: string }) {
  if (!value) return false
  const date = value.slice(0, 10)
  return date >= range.start && date <= range.end
}

function formatSaleMethod(method: Sale['method']) {
  const map: Record<Sale['method'], string> = {
    grey_market: '暗盘卖出',
    first_day: '首日卖出',
    held_sale: '持有后卖出',
  }
  return map[method]
}

function formatSubscriptionStatus(status: Subscription['status']) {
  const map: Record<Subscription['status'], string> = {
    applied: '已申购',
    announced: '已公布',
    won: '已中签',
    lost: '未中签',
  }
  return map[status]
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
