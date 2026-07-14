import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Database,
  Layers3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { DashboardFilter } from '../../types/dashboardFilter'

type DashboardPageProps = {
  filter: DashboardFilter
}

type DashboardPayload = {
  ok: boolean
  message?: string
  dashboard?: DashboardData
}

type DashboardData = {
  generatedAt: string
  today: string
  todayActions: TodayAction[]
  marketOverview: {
    ipoThisRound: number
    closingToday: number
    allotmentToday: number
    listingToday: number
    capitalConflict: boolean
    capitalConflictAmount: number
  }
  capitalStatus: {
    accounts: number
    availableCash: number
    frozenCash: number
    margin: number
    estimatedFees: number
  }
  activeIpos: IpoCardData[]
  recommendedIpos: RecommendedIpo[]
  recentSync: {
    id: string
    provider: string
    status: string
    lastSync: string
    added: number
    updated: number
    failed: number
    message: string | null
  } | null
}

type TodayAction = {
  id: string
  type: 'closing' | 'allotment' | 'listing' | 'dark' | 'event'
  title: string
  eventTime: string
  source: string
  ipo: IpoCardData
}

type IpoCardData = {
  id: string
  code: string
  name: string
  status: string
  board: string | null
  industry: string | null
  lotSize: number | null
  lotAmount: number | null
  marginMultiple: number | null
  subscribeStart: string | null
  subscribeEnd: string | null
  listingDate: string | null
  updatedAt: string
}

type RecommendedIpo = {
  ipo: IpoCardData
  rating: string | null
  recommendation: string | null
  risk: string | null
  expectedDark: number | null
  note: string | null
}

const actionLabels: Record<TodayAction['type'], string> = {
  closing: '今天截止',
  allotment: '今天公布',
  listing: '今天上市',
  dark: '今天暗盘',
  event: '今日事件',
}

const actionStyles: Record<TodayAction['type'], string> = {
  closing: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  allotment: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  listing: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  dark: 'border-violet-400/30 bg-violet-400/10 text-violet-100',
  event: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
}

export function DashboardPage({ filter }: DashboardPageProps) {
  const [payload, setPayload] = useState<DashboardPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()
        if (filter.accountId && filter.accountId !== 'all') {
          params.set('accountId', filter.accountId)
        }

        const response = await fetch(`/api/dashboard${params.size ? `?${params}` : ''}`, {
          headers: { accept: 'application/json' },
        })
        const body = (await response.json()) as DashboardPayload

        if (!response.ok || !body.ok || !body.dashboard) {
          throw new Error(body.message || 'Dashboard 数据读取失败')
        }

        if (!cancelled) setPayload(body)
      } catch (err) {
        if (!cancelled) {
          setPayload(null)
          setError(err instanceof Error ? err.message : 'Dashboard 数据读取失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [filter.accountId])

  if (loading) {
    return (
      <DashboardFrame>
        <div className="grid min-h-[520px] place-items-center rounded-[32px] border border-slate-800/80 bg-[#0B1020] text-slate-400 shadow-[0_24px_80px_rgba(2,6,23,0.22)]">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Loader2 className="animate-spin text-blue-300" size={18} />
            正在加载 Command Center 数据
          </div>
        </div>
      </DashboardFrame>
    )
  }

  if (error || !payload?.dashboard) {
    return (
      <DashboardFrame>
        <div className="rounded-[32px] border border-red-500/20 bg-red-950/20 p-8 text-red-100">
          <div className="flex items-center gap-3">
            <AlertTriangle size={22} />
            <h2 className="text-xl font-bold">Dashboard 数据读取失败</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-red-200/75">{error}</p>
        </div>
      </DashboardFrame>
    )
  }

  const dashboard = payload.dashboard

  return (
    <DashboardFrame generatedAt={dashboard.generatedAt}>
      <TodayActionCenter actions={dashboard.todayActions} today={dashboard.today} />

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <MarketOverview data={dashboard.marketOverview} />
        <RecentSync sync={dashboard.recentSync} />
      </section>

      <CapitalStatus data={dashboard.capitalStatus} />

      <ActiveIpoSection ipos={dashboard.activeIpos} />

      <RecommendedIpoSection ipos={dashboard.recommendedIpos} />
    </DashboardFrame>
  )
}

function DashboardFrame({
  children,
  generatedAt,
}: {
  children: ReactNode
  generatedAt?: string
}) {
  return (
    <div className="min-h-full rounded-[34px] border border-slate-800/80 bg-[#070B12] p-4 text-slate-100 shadow-[0_30px_100px_rgba(2,6,23,0.18)] md:p-6">
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300/80">
            HKIPO OS
          </p>
          <h1 className="mt-3 text-[34px] font-bold tracking-[-0.05em] text-white md:text-[46px]">
            Command Center
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-400 md:text-base">
            今天该处理什么、市场有什么变化、资金是否够用，一屏判断。
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-slate-400">
          <Database size={15} className="text-emerald-300" />
          数据库驱动
          {generatedAt && <span className="text-slate-600">·</span>}
          {generatedAt && <span>{formatDateTime(generatedAt)}</span>}
        </div>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  )
}

function TodayActionCenter({ actions, today }: { actions: TodayAction[]; today: string }) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.22),transparent_36%),linear-gradient(135deg,#101827,#070B12)] shadow-[0_24px_80px_rgba(2,6,23,0.22)]">
      <div className="flex flex-col gap-4 border-b border-white/10 p-6 md:flex-row md:items-end md:justify-between md:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300/80">
            Today Action Center
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white md:text-[32px]">
            今日关键 IPO 动作
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-400">
            {today} · 来自 IPO 时间线与数据库官方日期字段
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white">
          {actions.length} 个待关注动作
        </div>
      </div>

      {actions.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={24} />}
          title="今天没有待处理 IPO 事件"
          description="如果同步源更新了 IPO 时间线，这里会自动出现今天截止、公布、上市或暗盘的新股。"
        />
      ) : (
        <div className="divide-y divide-white/10">
          {actions.map((action) => (
            <a
              key={action.id}
              href={`/ipo/${encodeURIComponent(action.ipo.code)}`}
              className="group grid gap-4 p-5 transition hover:bg-white/[0.04] md:grid-cols-[150px_1fr_auto] md:items-center md:p-6"
            >
              <div className="flex items-center gap-3">
                <span className={`rounded-2xl border px-3 py-2 text-xs font-bold ${actionStyles[action.type]}`}>
                  {actionLabels[action.type]}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {formatTime(action.eventTime)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white">
                  {action.ipo.name} <span className="text-slate-500">({action.ipo.code})</span>
                </p>
                <p className="mt-1 text-sm font-medium text-slate-400">
                  {action.title} · {action.source}
                </p>
              </div>
              <ArrowRight className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-white" size={18} />
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

function MarketOverview({ data }: { data: DashboardData['marketOverview'] }) {
  return (
    <Panel title="Market Overview" subtitle="来自 IPO 数据库的本轮市场概览">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="IPO This Round" value={data.ipoThisRound} icon={<Layers3 size={18} />} tone="blue" />
        <MetricCard label="Closing Today" value={data.closingToday} icon={<Clock3 size={18} />} tone="rose" />
        <MetricCard label="Allotment Today" value={data.allotmentToday} icon={<Target size={18} />} tone="amber" />
        <MetricCard label="Listing Today" value={data.listingToday} icon={<TrendingUp size={18} />} tone="emerald" />
        <MetricCard
          label="Capital Conflict"
          value={data.capitalConflict ? 'Yes' : 'No'}
          hint={data.capitalConflict ? formatHKD(data.capitalConflictAmount) : 'No conflict'}
          icon={<AlertTriangle size={18} />}
          tone={data.capitalConflict ? 'rose' : 'emerald'}
        />
      </div>
    </Panel>
  )
}

function CapitalStatus({ data }: { data: DashboardData['capitalStatus'] }) {
  return (
    <Panel title="Capital Status" subtitle="账户现金、冻结资金、融资额度与预计费用">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Accounts" value={data.accounts} icon={<WalletCards size={18} />} tone="blue" />
        <MetricCard label="Available Cash" value={formatHKD(data.availableCash)} icon={<CircleDollarSign size={18} />} tone="emerald" />
        <MetricCard label="Frozen Cash" value={formatHKD(data.frozenCash)} icon={<ShieldCheck size={18} />} tone="amber" />
        <MetricCard label="Margin" value={formatHKD(data.margin)} icon={<Layers3 size={18} />} tone="purple" />
        <MetricCard label="Estimated Fees" value={formatHKD(data.estimatedFees)} icon={<RefreshCw size={18} />} tone="rose" />
      </div>
    </Panel>
  )
}

function ActiveIpoSection({ ipos }: { ipos: IpoCardData[] }) {
  return (
    <Panel title="Active IPO" subtitle="当前招股中的 IPO，点击进入 IPO Detail Center">
      {ipos.length === 0 ? (
        <InlineEmpty title="暂无正在招股的新股" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ipos.map((ipo) => (
            <IpoCard key={ipo.id} ipo={ipo} />
          ))}
        </div>
      )}
    </Panel>
  )
}

function RecommendedIpoSection({ ipos }: { ipos: RecommendedIpo[] }) {
  return (
    <Panel title="Recommended IPO" subtitle="读取 IPO_ANALYSIS。没有分析时不展示模拟推荐。">
      {ipos.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={24} />}
          title="暂无数据库分析"
          description="IPO_ANALYSIS 为空。后续 AI 分析接入后，这里会展示评级、风险和推荐策略。"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ipos.map((item) => (
            <a
              key={item.ipo.id}
              href={`/ipo/${encodeURIComponent(item.ipo.code)}`}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">{item.ipo.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.ipo.code}</p>
                </div>
                <span className="rounded-2xl bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">
                  {item.rating || 'Analysis'}
                </span>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
                {item.recommendation || item.note || '已有分析记录，但推荐内容为空。'}
              </p>
              {item.risk && (
                <p className="mt-3 text-xs font-semibold text-amber-200">Risk · {item.risk}</p>
              )}
            </a>
          ))}
        </div>
      )}
    </Panel>
  )
}

function RecentSync({ sync }: { sync: DashboardData['recentSync'] }) {
  return (
    <Panel title="Recent Sync" subtitle="最近一次同步日志" compact>
      {!sync ? (
        <InlineEmpty title="暂无同步日志" />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <div>
              <p className="text-sm font-bold text-white">{sync.provider}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(sync.lastSync)}</p>
            </div>
            <span className="rounded-2xl bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
              {sync.status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Added" value={sync.added} />
            <MiniStat label="Updated" value={sync.updated} />
            <MiniStat label="Failed" value={sync.failed} danger={sync.failed > 0} />
          </div>
        </div>
      )}
    </Panel>
  )
}

function IpoCard({ ipo }: { ipo: IpoCardData }) {
  return (
    <a
      href={`/ipo/${encodeURIComponent(ipo.code)}`}
      className="group rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.07] hover:shadow-[0_24px_60px_rgba(2,6,23,0.28)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-white">{ipo.name}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {ipo.code} · {ipo.industry || ipo.board || 'Industry N/A'}
          </p>
        </div>
        <ArrowRight className="shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-white" size={18} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <IpoFact label="每手金额" value={formatHKD(ipo.lotAmount)} />
        <IpoFact label="每手股数" value={formatNumber(ipo.lotSize, ' 股')} />
        <IpoFact label="截止" value={formatDate(ipo.subscribeEnd)} />
        <IpoFact label="上市" value={formatDate(ipo.listingDate)} />
      </div>
    </a>
  )
}

function Panel({
  title,
  subtitle,
  children,
  compact = false,
}: {
  title: string
  subtitle: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[#0B1020] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.16)] md:p-6">
      <div className={`flex flex-col gap-2 ${compact ? 'mb-4' : 'mb-5'} md:flex-row md:items-end md:justify-between`}>
        <div>
          <h2 className="text-xl font-bold tracking-[-0.03em] text-white">{title}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon: ReactNode
  tone: 'blue' | 'rose' | 'amber' | 'emerald' | 'purple'
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${toneClass(tone)}`}>
          {icon}
        </span>
      </div>
      <p className="mt-5 whitespace-nowrap text-[28px] font-bold tracking-[-0.04em] text-white tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs font-semibold text-slate-500">{hint}</p>}
    </div>
  )
}

function MiniStat({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold tabular-nums ${danger ? 'text-rose-300' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function IpoFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className="mt-2 truncate text-sm font-bold text-slate-200">{value}</p>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="grid min-h-[220px] place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400">
          {icon}
        </div>
        <p className="mt-4 text-base font-bold text-white">{title}</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function InlineEmpty({ title }: { title: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm font-semibold text-slate-500">
      {title}
    </div>
  )
}

function toneClass(tone: 'blue' | 'rose' | 'amber' | 'emerald' | 'purple') {
  const classes = {
    blue: 'bg-blue-400/10 text-blue-200',
    rose: 'bg-rose-400/10 text-rose-200',
    amber: 'bg-amber-400/10 text-amber-200',
    emerald: 'bg-emerald-400/10 text-emerald-200',
    purple: 'bg-violet-400/10 text-violet-200',
  }

  return classes[tone]
}

function formatHKD(value: number | null | undefined) {
  return `HK$ ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)}`
}

function formatNumber(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) return '--'
  return `${new Intl.NumberFormat('en-US').format(value)}${suffix}`
}

function formatDate(value: string | null) {
  if (!value) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
