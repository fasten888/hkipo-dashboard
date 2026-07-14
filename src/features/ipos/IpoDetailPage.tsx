import {
  ArrowLeft,
  BarChart3,
  BookOpenText,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  FileText,
  Layers3,
  LineChart,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

type IpoDetailPageProps = {
  ipoCode: string
  onBack: () => void
}

type IpoDetailPayload = {
  ok: boolean
  message?: string
  ipo?: DatabaseIpo
}

type DatabaseIpo = {
  id: string
  code: string
  name: string
  status: string
  board: string | null
  industry: string | null
  offerPriceMin: number | null
  offerPriceMax: number | null
  lotSize: number | null
  lotAmount: number | null
  marginMultiple: number | null
  subscribeStart: string | null
  subscribeEnd: string | null
  listingDate: string | null
  createdAt: string
  updatedAt: string
  events: IpoEvent[]
  analysis: IpoAnalysis | null
  accountIpos: AccountIpo[]
}

type IpoEvent = {
  id: string
  type: string
  title: string
  eventDate: string
  pdfUrl: string | null
  createdAt: string
}

type IpoAnalysis = {
  rating: string | null
  recommendation: string | null
  risk: string | null
  expectedDark: number | null
  note: string | null
}

type AccountIpo = {
  id: string
  applyLots: number
  applyAmount: number
  status: string
  commission: number
  financingFee: number
  profit: number
  createdAt: string
  account: {
    id: string
    name: string
    broker: string | null
    currency: string
    cash: number
    frozen: number
    marginLimit: number
    availableMargin: number
  }
}

type TabKey =
  | 'overview'
  | 'timeline'
  | 'subscription'
  | 'margin'
  | 'performance'
  | 'analysis'
  | 'documents'

const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Overview', icon: Layers3 },
  { key: 'timeline', label: 'Timeline', icon: CalendarDays },
  { key: 'subscription', label: 'Subscription', icon: ClipboardList },
  { key: 'margin', label: 'Margin', icon: ShieldCheck },
  { key: 'performance', label: 'Performance', icon: LineChart },
  { key: 'analysis', label: 'Analysis', icon: Sparkles },
  { key: 'documents', label: 'Documents', icon: FileText },
]

export function IpoDetailPage({ ipoCode, onBack }: IpoDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [payload, setPayload] = useState<IpoDetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadIpo() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/ipo?code=${encodeURIComponent(ipoCode)}`, {
          headers: { accept: 'application/json' },
        })
        const body = (await response.json()) as IpoDetailPayload

        if (!response.ok || !body.ok || !body.ipo) {
          throw new Error(body.message || `IPO ${ipoCode} 暂未进入数据库`)
        }

        if (!cancelled) setPayload(body)
      } catch (err) {
        if (!cancelled) {
          setPayload(null)
          setError(err instanceof Error ? err.message : '读取 IPO 数据失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadIpo()

    return () => {
      cancelled = true
    }
  }, [ipoCode])

  if (loading) {
    return (
      <ShellFrame onBack={onBack}>
        <div className="grid min-h-[420px] place-items-center rounded-[28px] border border-slate-800/80 bg-[#0D111A] text-slate-400">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Loader2 className="animate-spin" size={18} />
            正在从数据库读取 IPO 详情
          </div>
        </div>
      </ShellFrame>
    )
  }

  if (error || !payload?.ipo) {
    return (
      <ShellFrame onBack={onBack}>
        <div className="rounded-[28px] border border-red-500/20 bg-red-950/20 p-8 text-center">
          <p className="text-lg font-bold text-red-100">数据库里没有找到这只 IPO</p>
          <p className="mt-3 text-sm leading-6 text-red-200/70">{error}</p>
          <button
            type="button"
            className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
            onClick={onBack}
          >
            返回 IPO 列表
          </button>
        </div>
      </ShellFrame>
    )
  }

  const ipo = payload.ipo
  const derived = getDerivedIpoData(ipo)

  return (
    <ShellFrame onBack={onBack}>
      <section className="overflow-hidden rounded-[30px] border border-slate-800/80 bg-[#090D14] shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
        <div className="border-b border-slate-800/80 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.22),transparent_34%),linear-gradient(135deg,#0B1220,#080B12)] p-6 text-white md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">{statusLabel(ipo.status)}</Badge>
                <Badge tone="slate">{ipo.code}</Badge>
                {ipo.board && <Badge tone="slate">{ipo.board}</Badge>}
              </div>
              <h1 className="mt-5 break-words text-[34px] font-bold tracking-[-0.04em] text-white md:text-[48px]">
                {ipo.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-400 md:text-base">
                IPO Detail Center · 数据来自数据库 Single Source of Truth。当前页不使用 Mock，也不读取本地缓存。
              </p>
            </div>

            <div className="grid min-w-[280px] grid-cols-2 gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <QuickFact label="每手金额" value={formatMoney(ipo.lotAmount)} />
              <QuickFact label="每手股数" value={formatNumber(ipo.lotSize, ' 股')} />
              <QuickFact label="招股截止" value={formatDate(ipo.subscribeEnd)} />
              <QuickFact label="上市日期" value={formatDate(ipo.listingDate)} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-800/80 bg-[#0B1018] p-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickCard
            icon={CircleDollarSign}
            label="Offer Price"
            value={formatOfferRange(ipo.offerPriceMin, ipo.offerPriceMax)}
            hint="发行价区间"
            tone="red"
          />
          <QuickCard
            icon={Layers3}
            label="Lot Amount"
            value={formatMoney(ipo.lotAmount)}
            hint={`${formatNumber(ipo.lotSize, ' 股')} / 手`}
            tone="emerald"
          />
          <QuickCard
            icon={Target}
            label="Subscriptions"
            value={`${ipo.accountIpos.length}`}
            hint="数据库 ACCOUNT_IPO 记录"
            tone="amber"
          />
          <QuickCard
            icon={BarChart3}
            label="Profit"
            value={formatMoney(derived.totalProfit)}
            hint="来自账户 IPO 记录"
            tone="purple"
          />
        </div>

        <div className="overflow-x-auto border-b border-slate-800/80 bg-[#090D14] px-4">
          <div className="flex min-w-max gap-2 py-3">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition',
                    active
                      ? 'bg-white text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.08)]'
                      : 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
                  ].join(' ')}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-[#090D14] p-4 md:p-6">
          {activeTab === 'overview' && <OverviewTab ipo={ipo} derived={derived} />}
          {activeTab === 'timeline' && <TimelineTab ipo={ipo} events={derived.timeline} />}
          {activeTab === 'subscription' && <SubscriptionTab ipo={ipo} />}
          {activeTab === 'margin' && <MarginTab ipo={ipo} derived={derived} />}
          {activeTab === 'performance' && <PerformanceTab ipo={ipo} derived={derived} />}
          {activeTab === 'analysis' && <AnalysisTab ipo={ipo} />}
          {activeTab === 'documents' && <DocumentsTab ipo={ipo} />}
        </div>
      </section>
    </ShellFrame>
  )
}

function ShellFrame({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <button
        type="button"
        className="mb-5 inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        返回 IPO 列表
      </button>
      {children}
    </div>
  )
}

function OverviewTab({ ipo, derived }: { ipo: DatabaseIpo; derived: DerivedIpoData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Panel title="Overview" description="核心发行信息与数据库更新时间">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile label="股票代码" value={ipo.code} />
          <InfoTile label="股票名称" value={ipo.name} />
          <InfoTile label="状态" value={statusLabel(ipo.status)} />
          <InfoTile label="行业" value={ipo.industry || '暂无'} />
          <InfoTile label="发行价" value={formatOfferRange(ipo.offerPriceMin, ipo.offerPriceMax)} />
          <InfoTile label="每手金额" value={formatMoney(ipo.lotAmount)} />
          <InfoTile label="申购开始" value={formatDate(ipo.subscribeStart)} />
          <InfoTile label="申购截止" value={formatDate(ipo.subscribeEnd)} />
          <InfoTile label="上市日期" value={formatDate(ipo.listingDate)} />
          <InfoTile label="更新时间" value={formatDateTime(ipo.updatedAt)} />
        </div>
      </Panel>

      <Panel title="Database Coverage" description="当前数据库已覆盖的模块">
        <div className="space-y-3">
          <CoverageRow label="IPO Master" ready detail="code / name / status / lot / dates" />
          <CoverageRow label="Timeline" ready={derived.timeline.length > 0} detail={`${derived.timeline.length} events`} />
          <CoverageRow label="Subscription" ready detail={`${ipo.accountIpos.length} account records`} />
          <CoverageRow label="Margin" ready={Boolean(ipo.marginMultiple || derived.totalFinancingFee)} detail="margin multiple / financing fee" />
          <CoverageRow label="Performance" ready={ipo.accountIpos.length > 0} detail="profit / commission / account participation" />
          <CoverageRow label="Analysis" ready={Boolean(ipo.analysis)} detail="manual or AI-ready analysis" />
          <CoverageRow label="Documents" ready={ipo.events.some((event) => event.pdfUrl)} detail="prospectus / announcement" />
        </div>
      </Panel>
    </div>
  )
}

function TimelineTab({ events }: { ipo: DatabaseIpo; events: TimelineEvent[] }) {
  return (
    <Panel title="Timeline" description="招股、截止、上市及后续公告时间线">
      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="暂无时间线数据" description="同步器写入 IPO_TIMELINE 或 IPO_EVENT 后会显示在这里。" />
      ) : (
        <div className="relative space-y-4">
          {events.map((event, index) => (
            <div key={`${event.type}-${event.date}-${index}`} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-300">
                  <CalendarDays size={17} />
                </div>
                {index < events.length - 1 && <div className="mt-2 h-full min-h-8 w-px bg-slate-800" />}
              </div>
              <div className="min-w-0 flex-1 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-white">{event.title}</p>
                  <p className="text-sm font-semibold text-slate-400">{formatDate(event.date)}</p>
                </div>
                <p className="mt-1 text-sm text-slate-500">{event.source}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function SubscriptionTab({ ipo }: { ipo: DatabaseIpo }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel title="Subscription Terms" description="发行条款来自 IPO Master Database">
        <div className="grid gap-3">
          <InfoTile label="发行价区间" value={formatOfferRange(ipo.offerPriceMin, ipo.offerPriceMax)} />
          <InfoTile label="一手股数" value={formatNumber(ipo.lotSize, ' 股')} />
          <InfoTile label="一手金额" value={formatMoney(ipo.lotAmount)} />
          <InfoTile label="申购期" value={`${formatDate(ipo.subscribeStart)} → ${formatDate(ipo.subscribeEnd)}`} />
        </div>
      </Panel>

      <Panel title="Account Subscriptions" description="未来账户参与记录统一从 ACCOUNT_IPO 读取">
        <AccountIpoTable records={ipo.accountIpos} />
      </Panel>
    </div>
  )
}

function MarginTab({ ipo, derived }: { ipo: DatabaseIpo; derived: DerivedIpoData }) {
  return (
    <Panel title="Margin" description="融资倍数、融资费与账户融资参与情况">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="融资倍数" value={ipo.marginMultiple ? `${ipo.marginMultiple}x` : '暂无'} />
        <MetricTile label="融资费用" value={formatMoney(derived.totalFinancingFee)} />
        <MetricTile label="融资账户数" value={`${derived.marginAccountCount}`} />
      </div>
      <div className="mt-5">
        <AccountIpoTable records={ipo.accountIpos.filter((record) => record.financingFee > 0)} emptyLabel="暂无融资参与记录" />
      </div>
    </Panel>
  )
}

function PerformanceTab({ ipo, derived }: { ipo: DatabaseIpo; derived: DerivedIpoData }) {
  return (
    <Panel title="Performance" description="收益、手续费和账户表现来自数据库">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricTile label="总收益" value={formatMoney(derived.totalProfit)} />
        <MetricTile label="总手续费" value={formatMoney(derived.totalCommission)} />
        <MetricTile label="总融资费" value={formatMoney(derived.totalFinancingFee)} />
        <MetricTile label="参与账户" value={`${ipo.accountIpos.length}`} />
      </div>
      <div className="mt-5">
        <AccountIpoTable records={ipo.accountIpos} />
      </div>
    </Panel>
  )
}

function AnalysisTab({ ipo }: { ipo: DatabaseIpo }) {
  return (
    <Panel title="Analysis" description="先读取数据库，AI 分析以后接入">
      {!ipo.analysis ? (
        <EmptyState icon={Sparkles} title="暂无分析记录" description="IPO_ANALYSIS 目前为空。后续 AI 或人工分析写入数据库后会在这里展示。" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <InfoTile label="评级" value={ipo.analysis.rating || '暂无'} />
          <InfoTile label="建议" value={ipo.analysis.recommendation || '暂无'} />
          <InfoTile label="风险" value={ipo.analysis.risk || '暂无'} />
          <InfoTile label="预期暗盘" value={ipo.analysis.expectedDark === null ? '暂无' : formatMoney(ipo.analysis.expectedDark)} />
          <div className="md:col-span-2">
            <InfoTile label="备注" value={ipo.analysis.note || '暂无'} />
          </div>
        </div>
      )}
    </Panel>
  )
}

function DocumentsTab({ ipo }: { ipo: DatabaseIpo }) {
  const documents = ipo.events.filter((event) => event.pdfUrl)

  return (
    <Panel title="Documents" description="招股书、公告和未来扩展文档">
      {documents.length === 0 ? (
        <EmptyState icon={BookOpenText} title="暂无文档" description="IPO_EVENT 写入招股书或公告 pdf_url 后会显示在这里。" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {documents.map((event) => (
            <a
              key={event.id}
              href={event.pdfUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{event.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{eventTypeLabel(event.type)} · {formatDate(event.eventDate)}</p>
                </div>
                <ExternalLink className="text-slate-500 transition group-hover:text-white" size={17} />
              </div>
            </a>
          ))}
        </div>
      )}
    </Panel>
  )
}

function AccountIpoTable({ records, emptyLabel = '暂无账户参与记录' }: { records: AccountIpo[]; emptyLabel?: string }) {
  if (records.length === 0) {
    return <EmptyState icon={Building2} title={emptyLabel} description="账户参与 IPO 后会从数据库展示在这里。" compact />
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] bg-slate-900/80 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 md:grid">
        <span>Account</span>
        <span>Lots</span>
        <span>Amount</span>
        <span>Status</span>
        <span>Fees</span>
        <span>Profit</span>
      </div>
      <div className="divide-y divide-slate-800">
        {records.map((record) => (
          <div key={record.id} className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] md:items-center">
            <div>
              <p className="font-bold text-white">{record.account.name}</p>
              <p className="mt-1 text-xs text-slate-500">{record.account.broker || 'Broker N/A'}</p>
            </div>
            <Cell label="Lots" value={`${record.applyLots}`} />
            <Cell label="Amount" value={formatMoney(record.applyAmount)} />
            <Cell label="Status" value={record.status} />
            <Cell label="Fees" value={formatMoney(record.commission + record.financingFee)} />
            <Cell label="Profit" value={formatMoney(record.profit)} accent={record.profit >= 0 ? 'text-red-300' : 'text-emerald-300'} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-slate-800 bg-[#0D111A] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-[-0.02em] text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <ChevronRight className="mt-1 text-slate-700" size={18} />
      </div>
      {children}
    </section>
  )
}

function QuickCard({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: string; hint: string; tone: 'red' | 'emerald' | 'amber' | 'purple' }) {
  const toneClass = {
    red: 'bg-red-500/10 text-red-300',
    emerald: 'bg-emerald-500/10 text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-300',
    purple: 'bg-violet-500/10 text-violet-300',
  }[tone]

  return (
    <div className="rounded-[22px] border border-slate-800 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${toneClass}`}>
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-4 break-words text-[28px] font-bold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{hint}</p>
    </div>
  )
}

function QuickFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] px-4 py-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-slate-200">{value || '暂无'}</p>
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-[-0.04em] text-white">{value}</p>
    </div>
  )
}

function Cell({ label, value, accent = 'text-slate-300' }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 md:hidden">{label}</p>
      <p className={`mt-1 font-bold md:mt-0 ${accent}`}>{value}</p>
    </div>
  )
}

function CoverageRow({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
      <div>
        <p className="font-bold text-white">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
      <Badge tone={ready ? 'green' : 'slate'}>{ready ? 'Ready' : 'Empty'}</Badge>
    </div>
  )
}

function EmptyState({ icon: Icon, title, description, compact = false }: { icon: LucideIcon; title: string; description: string; compact?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 text-center ${compact ? 'p-6' : 'p-10'}`}>
      <Icon size={compact ? 20 : 26} className="text-slate-600" />
      <p className="mt-3 font-bold text-slate-300">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'blue' | 'slate' | 'green' }) {
  const className = {
    blue: 'border-blue-400/20 bg-blue-500/10 text-blue-200',
    slate: 'border-slate-700 bg-slate-900 text-slate-300',
    green: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
  }[tone]

  return (
    <span className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-bold ${className}`}>
      {children}
    </span>
  )
}

type TimelineEvent = {
  type: string
  title: string
  date: string
  source: string
}

type DerivedIpoData = {
  timeline: TimelineEvent[]
  totalProfit: number
  totalCommission: number
  totalFinancingFee: number
  marginAccountCount: number
}

function getDerivedIpoData(ipo: DatabaseIpo): DerivedIpoData {
  const timeline: TimelineEvent[] = [
    ipo.subscribeStart && {
      type: 'subscribe_start',
      title: '开始招股',
      date: ipo.subscribeStart,
      source: 'IPO.subscribe_start',
    },
    ipo.subscribeEnd && {
      type: 'subscribe_end',
      title: '招股截止',
      date: ipo.subscribeEnd,
      source: 'IPO.subscribe_end',
    },
    ipo.listingDate && {
      type: 'listing_date',
      title: '上市日期',
      date: ipo.listingDate,
      source: 'IPO.listing_date',
    },
    ...ipo.events.map((event) => ({
      type: event.type,
      title: event.title,
      date: event.eventDate,
      source: 'IPO_EVENT',
    })),
  ].filter(Boolean) as TimelineEvent[]

  timeline.sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())

  return {
    timeline,
    totalProfit: ipo.accountIpos.reduce((total, record) => total + record.profit, 0),
    totalCommission: ipo.accountIpos.reduce((total, record) => total + record.commission, 0),
    totalFinancingFee: ipo.accountIpos.reduce((total, record) => total + record.financingFee, 0),
    marginAccountCount: ipo.accountIpos.filter((record) => record.financingFee > 0).length,
  }
}

function formatOfferRange(min: number | null, max: number | null) {
  if (min === null && max === null) return '暂无'
  if (min !== null && max !== null && min !== max) return `${formatMoney(min)} - ${formatMoney(max)}`
  return formatMoney(min ?? max)
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return '暂无'
  return `HK$ ${value.toLocaleString('zh-HK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatNumber(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) return '暂无'
  return `${value.toLocaleString('zh-HK')}${suffix}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '暂无'
  return new Intl.DateTimeFormat('zh-HK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Hong_Kong',
  }).format(new Date(value))
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '暂无'
  return new Intl.DateTimeFormat('zh-HK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Hong_Kong',
  }).format(new Date(value))
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: '草稿',
    subscribing: '正在招股',
    closed: '已截止',
    listed: '已上市',
  }

  return labels[status] ?? status
}

function eventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    prospectus: '招股书',
    announcement: '公告',
    subscribe_start: '开始招股',
    subscribe_end: '招股截止',
    listing_date: '上市日期',
  }

  return labels[type] ?? type
}
