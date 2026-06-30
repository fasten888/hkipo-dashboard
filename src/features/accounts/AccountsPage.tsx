import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Gauge,
  Plus,
  Search,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { useIpos } from '../ipos/useIpos'
import { useSubscriptions } from '../subscriptions/useSubscriptions'
import { useAppData } from '../../hooks/useAppData'
import { compareValues, useThreeStateSort } from '../../hooks/useThreeStateSort'
import type { Account, AccountInput, AccountStats } from '../../types/account'
import { formatAccountName } from '../../utils/account'
import { formatHKD, formatPercent, formatSignedPercent } from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import { getAccountStats, getPerformanceSummary } from '../../utils/statistics'
import { AccountForm } from './AccountForm'
import { AccountList, type AccountSortKey, WinRateNote } from './AccountList'
import { useAccounts } from './useAccounts'

// ── Design tokens ──────────────────────────────
const C = {
  text1: '#4A4540', text2: '#8C8273', text3: '#A8A296',
  brand: '#B08B7E', danger: '#9A7468', success: '#7E9587',
  warning: '#BC9A5F', info: '#8E87A6', border: '#E4DFD6', bg: '#F4F1ED',
}

interface AccountsPageProps { onViewAccount: (accountId: string) => void }

export function AccountsPage({ onViewAccount }: AccountsPageProps) {
  const { accounts, summary, addAccount, updateAccount, deleteAccount } = useAccounts()
  const { ipos } = useIpos()
  const { subscriptions } = useSubscriptions()
  const { sales, withdrawals, exchangeRecords } = useAppData()
  const [searchTerm, setSearchTerm] = useState('')
  const [rankingMetric, setRankingMetric] = useState<'profit' | 'profitRate' | 'winRate' | 'participation'>('profit')
  const { sort, toggleSort } = useThreeStateSort<AccountSortKey>('accounts')
  const [formOpen, setFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef<number>()

  const accountStats = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, getAccountStats(a, subscriptions, ipos, sales, withdrawals)])) as Record<string, AccountStats>,
    [accounts, subscriptions, ipos, sales, withdrawals],
  )

  const filteredAccounts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return accounts
      .filter((a) => !query || a.name.toLowerCase().includes(query) || a.accountSuffix.includes(query) || a.brokerName.toLowerCase().includes(query))
      .sort((a, b) => {
        if (!sort) return b.createdAt.localeCompare(a.createdAt)
        const compared = compareValues(accountSortValue(sort.key, a, accountStats[a.id]), accountSortValue(sort.key, b, accountStats[b.id]))
        return sort.direction === 'asc' ? compared : -compared
      })
  }, [accountStats, accounts, searchTerm, sort])

  const totals = Object.values(accountStats).reduce(
    (r, s) => ({ participationCount: r.participationCount + s.participationCount, winCount: r.winCount + s.winCount, totalProfit: r.totalProfit + s.totalProfit }),
    { participationCount: 0, winCount: 0, totalProfit: 0 },
  )
  const decidedCount = subscriptions.filter((s) => s.status === 'won' || s.status === 'lost').length
  const historicalCount = accounts.reduce((t, a) => t + a.legacyParticipationCount, 0)
  const overallWinRate = historicalCount + decidedCount > 0 ? (totals.winCount / (historicalCount + decidedCount)) * 100 : 0
  const netInvestment = Math.max(0, summary.initialDeposit - withdrawals.reduce((t, i) => t + i.amount, 0))
  const totalProfitRate = netInvestment > 0 ? (totals.totalProfit / netInvestment) * 100 : 0
  const performance = getPerformanceSummary(subscriptions, ipos, sales)
  const rankings = accounts.map((a) => ({ account: a, stats: accountStats[a.id] }))
    .sort((l, r) => {
      const vals = { profit: [l.stats.totalProfit, r.stats.totalProfit], profitRate: [l.stats.profitRate, r.stats.profitRate], winRate: [l.stats.winRate, r.stats.winRate], participation: [l.stats.participationCount, r.stats.participationCount] }[rankingMetric]
      return vals[1] - vals[0]
    })

  const showNotice = (msg: string) => { window.clearTimeout(noticeTimer.current); setNotice(msg); noticeTimer.current = window.setTimeout(() => setNotice(''), 2200) }
  const handleSubmit = (input: AccountInput) => {
    if (editingAccount) { updateAccount(editingAccount.id, input); showNotice('账户信息已更新') }
    else { addAccount(input); showNotice('账户已创建') }
    setFormOpen(false); setEditingAccount(null)
  }
  const handleDelete = () => { if (!deletingAccount) return; deleteAccount(deletingAccount.id); setDeletingAccount(null); showNotice('账户及关联申购记录已删除') }

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-5 flex items-center justify-end gap-2 flex-wrap">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.text3 }}>账户中心</p>
          <p className="mt-1.5 text-[13px]" style={{ color: C.text2 }}>管理账户资料，并自动汇总打新参与、中签与收益。</p>
        </div>
        <button type="button" className="os-button-primary gap-2" onClick={() => { setEditingAccount(null); setFormOpen(true) }}>
          <Plus size={15} />新增账户
        </button>
      </div>

      {/* ── KPI row 1 ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PageKpi label="总收益" value={formatHKD(totals.totalProfit, 'profit')} hint="全部账户累计净收益" iconBg="#E5EBE5" iconColor={C.success} icon={<TrendingUp size={18} />} profitVal={totals.totalProfit} />
        <PageKpi label="总收益率" value={formatPercent(totalProfitRate, 'profitRate')} hint="总收益 ÷ 当前投入资金" iconBg="#E9E7EE" iconColor={C.info} icon={<Gauge size={18} />} profitVal={totalProfitRate} />
        <PageKpi label="总投入资金" value={formatHKD(netInvestment, 'investment')} hint="初始入金减累计出金" iconBg="#E8D9D3" iconColor={C.brand} icon={<CircleDollarSign size={18} />} />
        <PageKpi label="整体中签率" value={formatPercent(overallWinRate)} hint={`${totals.winCount} 次中签`} iconBg="#F3EAD7" iconColor={C.warning} icon={<Trophy size={18} />} />
      </div>

      {/* ── KPI row 2 ── */}
      <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <PageKpiSm label="账户数量" value={String(accounts.length)} hint="当前管理账户" icon={<Users size={15} />} iconBg="#E8D9D3" iconColor={C.brand} />
        <PageKpiSm label="参与次数" value={String(totals.participationCount)} hint="全部账户累计参与" icon={<Activity size={15} />} iconBg="#E8D9D3" iconColor={C.brand} />
        <PageKpiSm label="中签次数" value={String(totals.winCount)} hint={`${historicalCount + decidedCount} 次已确定结果`} icon={<Trophy size={15} />} iconBg="#F3EAD7" iconColor={C.warning} />
        <PageKpiSm label="打新胜率" value={formatPercent(performance.overallWinRate)} hint="已卖出申购中的盈利占比" icon={<BarChart3 size={15} />} iconBg="#E9E7EE" iconColor={C.info} />
      </div>

      {/* ── Ranking section ── */}
      <div className="os-card mt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: C.text1 }}>账户盈利排行榜</h2>
            <p className="mt-1 text-[12px]" style={{ color: C.text3 }}>快速识别最赚钱、效率最高和最值得继续参与的账户</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-[10px] p-1" style={{ background: C.bg }}>
            {([['profit', '收益排行'], ['profitRate', '收益率排行'], ['winRate', '中签率排行'], ['participation', '参与次数排行']] as const).map(([key, label]) => (
              <button key={key} type="button"
                className={`whitespace-nowrap rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition ${rankingMetric === key ? 'bg-white shadow-sm font-semibold' : ''}`}
                style={{ color: rankingMetric === key ? C.text1 : C.text2 }}
                onClick={() => setRankingMetric(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {rankings.slice(0, 4).map(({ account, stats }, i) => (
            <button key={account.id} type="button"
              className="rounded-[12px] border p-4 text-left transition hover:-translate-y-0.5"
              style={{ borderColor: C.border }}
              onClick={() => onViewAccount(account.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold" style={{ color: C.text3 }}>TOP {i + 1}</p>
                  <p className="mt-1 truncate text-[13px] font-semibold" style={{ color: C.text1 }}>{formatAccountName(account)}</p>
                </div>
                <Trophy size={14} style={{ color: i === 0 ? C.warning : C.text3, flexShrink: 0 }} />
              </div>
              <p className={`mt-4 text-[18px] font-bold tabular-nums ${rankingMetric === 'profit' || rankingMetric === 'profitRate' ? getProfitColor(rankingMetric === 'profit' ? stats.totalProfit : stats.profitRate) : ''}`}
                style={rankingMetric !== 'profit' && rankingMetric !== 'profitRate' ? { color: C.text1 } : {}}>
                {rankingValue(rankingMetric, stats)}
              </p>
              <p className="mt-1.5 text-[11px]" style={{ color: C.text3 }}>{stats.winCount} 次中签 · {stats.participationCount} 次参与</p>
            </button>
          ))}
          {rankings.length === 0 && <p className="py-8 text-center text-[13px] md:col-span-2 xl:col-span-4" style={{ color: C.text3 }}>暂无账户数据</p>}
        </div>
      </div>

      {/* ── Account list ── */}
      <div className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: C.text1 }}>全部账户</h2>
            <div className="mt-1"><WinRateNote /></div>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.text3 }} />
            <input type="search" value={searchTerm} placeholder="搜索名称、后四位或券商"
              className="os-input w-full pl-9"
              onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <AccountList accounts={filteredAccounts} stats={accountStats} hasSearch={Boolean(searchTerm.trim())}
          onView={(a) => onViewAccount(a.id)}
          onEdit={(a) => { setEditingAccount(a); setFormOpen(true) }}
          onDelete={setDeletingAccount}
          onCreate={() => setFormOpen(true)}
          sort={sort} onSort={toggleSort} />
      </div>

      <Modal open={formOpen} title={editingAccount ? '编辑账户' : '新增账户'} description="账户数据仅保存在当前浏览器。" fullScreenOnMobile
        onClose={() => { setFormOpen(false); setEditingAccount(null) }}>
        <AccountForm account={editingAccount}
          exchangeRecords={exchangeRecords.filter((r) => !editingAccount || r.accountId === editingAccount.id)}
          onSubmit={handleSubmit}
          onCancel={() => { setFormOpen(false); setEditingAccount(null) }} />
      </Modal>
      <ConfirmDialog open={Boolean(deletingAccount)} title="删除账户"
        message={`确定删除"${deletingAccount?.name ?? ''}"吗？关联申购记录也会一并删除，且无法恢复。`}
        onConfirm={handleDelete} onClose={() => setDeletingAccount(null)} />
      {notice && <Toast>{notice}</Toast>}
    </>
  )
}

// ── Sub-components ──────────────────────────────
function PageKpi({ label, value, hint, iconBg, iconColor, icon, profitVal }: { label: string; value: string; hint: string; iconBg: string; iconColor: string; icon: React.ReactNode; profitVal?: number }) {
  return (
    <div className="os-card os-card-hover">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium" style={{ color: '#8C8273' }}>{label}</span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: iconBg, color: iconColor }}>{icon}</span>
      </div>
      <p className={`mt-4 text-[clamp(1.4rem,1.7vw,1.85rem)] font-bold leading-none tracking-[-0.04em] tabular-nums ${profitVal !== undefined ? getProfitColor(profitVal) : ''}`}
        style={profitVal === undefined ? { color: '#4A4540' } : {}}>
        {value}
      </p>
      <p className="mt-3 text-[12px]" style={{ color: '#A8A296' }}>{hint}</p>
    </div>
  )
}

function PageKpiSm({ label, value, hint, iconBg, iconColor, icon }: { label: string; value: string; hint: string; iconBg: string; iconColor: string; icon: React.ReactNode }) {
  return (
    <div className="os-card os-card-hover">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px]" style={{ background: iconBg, color: iconColor }}>{icon}</span>
        <span className="text-[12px] font-medium" style={{ color: '#8C8273' }}>{label}</span>
      </div>
      <p className="mt-3 text-[22px] font-bold leading-none tracking-[-0.03em]" style={{ color: '#4A4540' }}>{value}</p>
      <p className="mt-2 text-[11px]" style={{ color: '#A8A296' }}>{hint}</p>
    </div>
  )
}

function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-[10px] px-4 py-3 text-[13px] font-medium text-white shadow-xl" style={{ background: '#4A4540' }}>
      {children}
    </div>
  )
}

function accountSortValue(key: AccountSortKey, account: Account, stats: AccountStats) {
  return ({ name: account.name, currentAssets: account.currentAssets, profit: stats.totalProfit, profitRate: stats.profitRate, participation: stats.participationCount, wins: stats.winCount, winRate: stats.winRate })[key]
}

function rankingValue(metric: 'profit' | 'profitRate' | 'winRate' | 'participation', stats: AccountStats) {
  if (metric === 'profit') return formatHKD(stats.totalProfit, 'profit')
  if (metric === 'profitRate') return formatSignedPercent(stats.profitRate)
  if (metric === 'winRate') return formatPercent(stats.winRate)
  return `${stats.participationCount} 次`
}
