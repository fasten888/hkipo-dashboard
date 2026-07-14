import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Layers3,
  Loader2,
  Play,
  Route,
  ShieldAlert,
  WalletCards,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

type PlannerPayload = {
  ok: boolean
  message?: string
  planner?: PlannerData
}

type GeneratePayload = {
  ok: boolean
  message?: string
  result?: AllocationResult
}

type PlannerData = {
  generatedAt: string
  roundOverview: {
    ipoCount: number
    accountCount: number
    selectedIpoCost: number
    estimatedFees: number
    availableCash: number
    frozenCash: number
    margin: number
    fundingCapacity: number
    capitalGap: number
  }
  ipos: PlannerIpo[]
  accounts: PlannerAccount[]
  timeline: PlannerTimelineItem[]
  conflictAdvisor: {
    hasConflict: boolean
    required: number
    capacity: number
    gap: number
    message: string
  }
}

type PlannerIpo = {
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
  analysis: {
    rating: string | null
    recommendation: string | null
    risk: string | null
  } | null
}

type PlannerAccount = {
  id: string
  name: string
  broker: string | null
  currency: string
  cash: number
  frozen: number
  marginLimit: number
  availableMargin: number
  availableCapacity: number
}

type PlannerTimelineItem = {
  id: string
  type: string
  title: string
  eventTime: string
  ipoCode: string
  ipoName: string
  source: string
}

type AllocationResult = {
  generatedAt: string
  summary: {
    selectedIpos: number
    selectedAccounts: number
    allocationCount: number
    totalApplyAmount: number
    totalEstimatedFee: number
  }
  allocations: Array<{
    id: string
    ipoCode: string
    ipoName: string
    accountId: string
    accountName: string
    broker: string | null
    applyLots: number
    applyAmount: number
    estimatedFee: number
    fundingSource: 'cash' | 'margin'
    confidence: string
    note: string
  }>
  warnings: string[]
}

export function CapitalAllocationPage() {
  const [planner, setPlanner] = useState<PlannerData | null>(null)
  const [result, setResult] = useState<AllocationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadPlanner() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/planner', {
          headers: { accept: 'application/json' },
        })
        const body = (await response.json()) as PlannerPayload

        if (!response.ok || !body.ok || !body.planner) {
          throw new Error(body.message || '资金分配数据读取失败')
        }

        if (!cancelled) setPlanner(body.planner)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '资金分配数据读取失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPlanner()

    return () => {
      cancelled = true
    }
  }, [])

  const generatePlan = async () => {
    setGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { accept: 'application/json' },
      })
      const body = (await response.json()) as GeneratePayload

      if (!response.ok || !body.ok || !body.result) {
        throw new Error(body.message || '生成资金分配方案失败')
      }

      setResult(body.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成资金分配方案失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <PlannerFrame>
        <div className="grid min-h-[520px] place-items-center rounded-[32px] border border-white/10 bg-[#0B1020] text-slate-400">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Loader2 className="animate-spin text-blue-300" size={18} />
            正在读取数据库中的 IPO 和账户
          </div>
        </div>
      </PlannerFrame>
    )
  }

  if (!planner) {
    return (
      <PlannerFrame>
        <Panel title="读取失败" subtitle="Capital Allocation Center 暂时无法载入">
          <p className="text-sm text-rose-200">{error}</p>
        </Panel>
      </PlannerFrame>
    )
  }

  return (
    <PlannerFrame generatedAt={planner.generatedAt}>
      {error && (
        <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-100">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <RoundOverview planner={planner} />
          <IpoSelection ipos={planner.ipos} />
          <AccountAllocation accounts={planner.accounts} />
          <GeneratedPlan result={result} generating={generating} onGenerate={generatePlan} />
        </div>

        <aside className="flex flex-col gap-5">
          <TimelinePanel timeline={planner.timeline} />
          <ConflictAdvisor advisor={planner.conflictAdvisor} />
        </aside>
      </div>
    </PlannerFrame>
  )
}

function PlannerFrame({
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
            Capital Allocation Center
          </p>
          <h1 className="mt-3 text-[34px] font-bold tracking-[-0.05em] text-white md:text-[46px]">
            资金分配中心
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-400 md:text-base">
            从数据库读取本轮 IPO 和账户资金，先打通 Generate 数据流，下一 Sprint 接入真实算法。
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-slate-400">
          <Route size={15} className="text-emerald-300" />
          Database Driven
          {generatedAt && <span className="text-slate-600">·</span>}
          {generatedAt && <span>{formatDateTime(generatedAt)}</span>}
        </div>
      </div>
      {children}
    </div>
  )
}

function RoundOverview({ planner }: { planner: PlannerData }) {
  const overview = planner.roundOverview

  return (
    <Panel title="1. Round Overview" subtitle="当前可参与的新股轮次与资金容量概览">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active IPO" value={overview.ipoCount} icon={<Layers3 size={18} />} tone="blue" />
        <MetricCard label="Accounts" value={overview.accountCount} icon={<WalletCards size={18} />} tone="purple" />
        <MetricCard label="One-lot Cost" value={formatHKD(overview.selectedIpoCost)} icon={<CircleDollarSign size={18} />} tone="emerald" />
        <MetricCard label="Capital Gap" value={formatHKD(overview.capitalGap)} icon={<AlertTriangle size={18} />} tone={overview.capitalGap > 0 ? 'rose' : 'emerald'} />
      </div>
    </Panel>
  )
}

function IpoSelection({ ipos }: { ipos: PlannerIpo[] }) {
  return (
    <Panel title="2. IPO Selection" subtitle="数据库中当前招股的 IPO。这里不使用手写 IPO。">
      {ipos.length === 0 ? (
        <InlineEmpty title="暂无当前招股中的 IPO" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {ipos.map((ipo) => (
            <a
              key={ipo.id}
              href={`/ipo/${encodeURIComponent(ipo.code)}`}
              className="group rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">{ipo.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {ipo.code} · {ipo.industry || ipo.board || 'Industry N/A'}
                  </p>
                </div>
                <ArrowRight size={18} className="shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-white" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniFact label="每手金额" value={formatHKD(ipo.lotAmount)} />
                <MiniFact label="倍数" value={ipo.marginMultiple ? `${ipo.marginMultiple}x` : '--'} />
                <MiniFact label="截止" value={formatDate(ipo.subscribeEnd)} />
              </div>
            </a>
          ))}
        </div>
      )}
    </Panel>
  )
}

function AccountAllocation({ accounts }: { accounts: PlannerAccount[] }) {
  return (
    <Panel title="3. Account Allocation" subtitle="账户资金、冻结、融资额度。数据来自 ACCOUNT。">
      {accounts.length === 0 ? (
        <InlineEmpty title="数据库暂无账户，无法生成分配方案" />
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-white/10">
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-3 bg-white/[0.04] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            <span>Account</span>
            <span>Cash</span>
            <span>Frozen</span>
            <span>Capacity</span>
          </div>
          <div className="divide-y divide-white/10">
            {accounts.map((account) => (
              <div key={account.id} className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-3 px-4 py-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">{account.name}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{account.broker || account.currency}</p>
                </div>
                <span className="font-semibold text-emerald-200">{formatHKD(account.cash)}</span>
                <span className="font-semibold text-amber-200">{formatHKD(account.frozen)}</span>
                <span className="font-semibold text-blue-200">{formatHKD(account.availableCapacity)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

function GeneratedPlan({
  result,
  generating,
  onGenerate,
}: {
  result: AllocationResult | null
  generating: boolean
  onGenerate: () => void
}) {
  return (
    <Panel title="4. Generated Plan" subtitle="本 Sprint 返回基于真实账户和 IPO 的 Draft Allocation；下一 Sprint 替换成正式算法。">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm leading-6 text-slate-400">
          点击 Generate 后，后端会重新读取数据库里的 IPO 和账户，再返回一份占位分配结果。
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(37,99,235,0.26)] transition hover:-translate-y-0.5 hover:bg-blue-400 disabled:cursor-wait disabled:opacity-70"
        >
          {generating ? <Loader2 className="animate-spin" size={17} /> : <Play size={17} />}
          Generate
        </button>
      </div>

      {!result ? (
        <div className="mt-5">
          <InlineEmpty title="尚未生成分配方案" />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniSummary label="分配记录" value={result.summary.allocationCount} />
            <MiniSummary label="申购金额" value={formatHKD(result.summary.totalApplyAmount)} />
            <MiniSummary label="预估费用" value={formatHKD(result.summary.totalEstimatedFee)} />
          </div>

          {result.warnings.length > 0 && (
            <div className="rounded-[20px] border border-amber-400/20 bg-amber-400/10 p-4 text-sm font-semibold text-amber-100">
              {result.warnings.join('；')}
            </div>
          )}

          <div className="divide-y divide-white/10 overflow-hidden rounded-[24px] border border-white/10">
            {result.allocations.length === 0 ? (
              <InlineEmpty title="数据库 IPO 或账户为空，Draft Allocation 无法生成" />
            ) : (
              result.allocations.map((allocation) => (
                <div key={allocation.id} className="grid gap-3 p-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
                  <div>
                    <p className="font-bold text-white">{allocation.ipoName} <span className="text-slate-500">({allocation.ipoCode})</span></p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{allocation.note}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{allocation.accountName}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{allocation.broker || allocation.fundingSource}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-200">{formatHKD(allocation.applyAmount)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{allocation.applyLots} 手 · {allocation.fundingSource}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}

function TimelinePanel({ timeline }: { timeline: PlannerTimelineItem[] }) {
  return (
    <Panel title="Timeline" subtitle="未来 30 天关键节点">
      {timeline.length === 0 ? (
        <InlineEmpty title="暂无即将发生的 IPO 时间线" />
      ) : (
        <div className="space-y-3">
          {timeline.slice(0, 10).map((item) => (
            <a
              key={item.id}
              href={`/ipo/${encodeURIComponent(item.ipoCode)}`}
              className="block rounded-[22px] border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-blue-400/10 text-blue-200">
                  <CalendarClock size={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{item.ipoName}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.title} · {formatDateTime(item.eventTime)}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </Panel>
  )
}

function ConflictAdvisor({ advisor }: { advisor: PlannerData['conflictAdvisor'] }) {
  return (
    <Panel title="Conflict Advisor" subtitle="资金冲突预警">
      <div className={[
        'rounded-[24px] border p-5',
        advisor.hasConflict
          ? 'border-rose-500/20 bg-rose-500/10'
          : 'border-emerald-400/20 bg-emerald-400/10',
      ].join(' ')}>
        <div className="flex items-start gap-3">
          <div className={[
            'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
            advisor.hasConflict ? 'bg-rose-400/10 text-rose-200' : 'bg-emerald-400/10 text-emerald-200',
          ].join(' ')}>
            {advisor.hasConflict ? <ShieldAlert size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <div>
            <p className="text-base font-bold text-white">
              {advisor.hasConflict ? '发现资金冲突' : '资金容量正常'}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{advisor.message}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <MiniFact label="Required" value={formatHKD(advisor.required)} />
          <MiniFact label="Capacity" value={formatHKD(advisor.capacity)} />
          <MiniFact label="Gap" value={formatHKD(advisor.gap)} />
          <MiniFact label="Status" value={advisor.hasConflict ? 'Conflict' : 'Clear'} />
        </div>
      </div>
    </Panel>
  )
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[#0B1020] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.16)] md:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-[-0.03em] text-white">{title}</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: ReactNode
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
    </div>
  )
}

function MiniFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className="mt-2 truncate text-sm font-bold text-slate-200">{value}</p>
    </div>
  )
}

function MiniSummary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-white tabular-nums">{value}</p>
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

function formatDate(value: string | null) {
  if (!value) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
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
