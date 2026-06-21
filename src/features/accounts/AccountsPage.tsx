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
import { StatCard } from '../../components/ui/StatCard'
import { useIpos } from '../ipos/useIpos'
import { useSubscriptions } from '../subscriptions/useSubscriptions'
import { useAppData } from '../../hooks/useAppData'
import {
  compareValues,
  useThreeStateSort,
} from '../../hooks/useThreeStateSort'
import type { Account, AccountInput, AccountStats } from '../../types/account'
import { formatAccountName } from '../../utils/account'
import {
  formatHKD,
  formatPercent,
  formatSignedPercent,
} from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import {
  getAccountStats,
  getPerformanceSummary,
} from '../../utils/statistics'
import { AccountForm } from './AccountForm'
import {
  AccountList,
  type AccountSortKey,
  WinRateNote,
} from './AccountList'
import { useAccounts } from './useAccounts'

interface AccountsPageProps {
  onViewAccount: (accountId: string) => void
}

export function AccountsPage({ onViewAccount }: AccountsPageProps) {
  const { accounts, summary, addAccount, updateAccount, deleteAccount } =
    useAccounts()
  const { ipos } = useIpos()
  const { subscriptions } = useSubscriptions()
  const { sales, withdrawals, exchangeRecords } = useAppData()
  const [searchTerm, setSearchTerm] = useState('')
  const [rankingMetric, setRankingMetric] = useState<
    'profit' | 'profitRate' | 'winRate' | 'participation'
  >('profit')
  const { sort, toggleSort } =
    useThreeStateSort<AccountSortKey>('accounts')
  const [formOpen, setFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef<number>()

  const accountStats = useMemo(
    () =>
      Object.fromEntries(
        accounts.map((account) => [
          account.id,
          getAccountStats(account, subscriptions, ipos, sales, withdrawals),
        ]),
      ) as Record<string, AccountStats>,
    [accounts, subscriptions, ipos, sales, withdrawals],
  )

  const filteredAccounts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return accounts
      .filter(
        (account) =>
          !query ||
          account.name.toLowerCase().includes(query) ||
          account.accountSuffix.includes(query) ||
          account.brokerName.toLowerCase().includes(query),
      )
      .sort((a, b) => {
        if (!sort) return b.createdAt.localeCompare(a.createdAt)
        const left = accountSortValue(sort.key, a, accountStats[a.id])
        const right = accountSortValue(sort.key, b, accountStats[b.id])
        const compared = compareValues(left, right)
        return sort.direction === 'asc' ? compared : -compared
      })
  }, [accountStats, accounts, searchTerm, sort])

  const totals = Object.values(accountStats).reduce(
    (result, stats) => ({
      participationCount: result.participationCount + stats.participationCount,
      winCount: result.winCount + stats.winCount,
      totalProfit: result.totalProfit + stats.totalProfit,
    }),
    { participationCount: 0, winCount: 0, totalProfit: 0 },
  )
  const decidedCount = subscriptions.filter(
    (subscription) =>
      subscription.status === 'won' || subscription.status === 'lost',
  ).length
  const historicalCount = accounts.reduce(
    (total, account) => total + account.legacyParticipationCount,
    0,
  )
  const overallWinRate =
    historicalCount + decidedCount > 0
      ? (totals.winCount / (historicalCount + decidedCount)) * 100
      : 0
  const netInvestment = Math.max(
    0,
    summary.initialDeposit -
      withdrawals.reduce((total, item) => total + item.amount, 0),
  )
  const totalProfitRate =
    netInvestment > 0 ? (totals.totalProfit / netInvestment) * 100 : 0
  const performance = getPerformanceSummary(subscriptions, ipos, sales)
  const rankings = accounts
    .map((account) => ({
      account,
      stats: accountStats[account.id],
    }))
    .sort((left, right) => {
      const values = {
        profit: [left.stats.totalProfit, right.stats.totalProfit],
        profitRate: [left.stats.profitRate, right.stats.profitRate],
        winRate: [left.stats.winRate, right.stats.winRate],
        participation: [
          left.stats.participationCount,
          right.stats.participationCount,
        ],
      }[rankingMetric]
      return values[1] - values[0]
    })

  const showNotice = (message: string) => {
    window.clearTimeout(noticeTimer.current)
    setNotice(message)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2200)
  }

  const handleSubmit = (input: AccountInput) => {
    if (editingAccount) {
      updateAccount(editingAccount.id, input)
      showNotice('账户信息已更新')
    } else {
      addAccount(input)
      showNotice('账户已创建')
    }
    setFormOpen(false)
    setEditingAccount(null)
  }

  const handleDelete = () => {
    if (!deletingAccount) return
    deleteAccount(deletingAccount.id)
    setDeletingAccount(null)
    showNotice('账户及关联申购记录已删除')
  }

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            V1 · 账户中心
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            账户管理
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            管理账户资料，并自动汇总打新参与、中签与收益。
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/15 transition hover:-translate-y-0.5 hover:bg-brand-700"
          onClick={() => {
            setEditingAccount(null)
            setFormOpen(true)
          }}
        >
          <Plus size={18} />
          新增账户
        </button>
      </div>

      <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="总收益"
          value={formatHKD(totals.totalProfit, 'profit')}
          hint="全部账户累计净收益"
          icon={TrendingUp}
          tone="emerald"
          profitValue={totals.totalProfit}
        />
        <StatCard
          label="总收益率"
          value={formatPercent(totalProfitRate, 'profitRate')}
          hint="总收益 ÷ 当前投入资金"
          icon={Gauge}
          tone="emerald"
          profitValue={totalProfitRate}
        />
        <StatCard
          label="总投入资金"
          value={formatHKD(netInvestment, 'investment')}
          hint={`初始入金减累计出金`}
          icon={CircleDollarSign}
          tone="violet"
        />
        <StatCard
          label="整体中签率"
          value={formatPercent(overallWinRate)}
          hint={`${totals.winCount} 次中签`}
          icon={Trophy}
          tone="amber"
        />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="账户数量"
          value={String(accounts.length)}
          hint="当前管理账户"
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="参与次数"
          value={String(totals.participationCount)}
          hint="全部账户累计参与"
          icon={Activity}
          tone="blue"
        />
        <StatCard
          label="中签次数"
          value={String(totals.winCount)}
          hint={`${historicalCount + decidedCount} 次已确定结果`}
          icon={Trophy}
          tone="amber"
        />
        <StatCard
          label="打新胜率"
          value={formatPercent(performance.overallWinRate)}
          hint="已卖出申购中的盈利占比"
          icon={BarChart3}
          tone="violet"
        />
      </section>

      <section className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">账户盈利排行榜</h2>
            <p className="mt-1 text-xs text-slate-400">
              快速识别最赚钱、效率最高和最值得继续参与的账户
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {[
              ['profit', '收益排行'],
              ['profitRate', '收益率排行'],
              ['winRate', '中签率排行'],
              ['participation', '参与次数排行'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${
                  rankingMetric === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
                onClick={() =>
                  setRankingMetric(
                    key as
                      | 'profit'
                      | 'profitRate'
                      | 'winRate'
                      | 'participation',
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {rankings.slice(0, 4).map(({ account, stats }, index) => (
            <button
              key={account.id}
              type="button"
              className="rounded-2xl border border-slate-100 p-4 text-left transition hover:border-brand-200 hover:bg-brand-50/30"
              onClick={() => onViewAccount(account.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-300">
                    TOP {index + 1}
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800">
                    {formatAccountName(account)}
                  </p>
                </div>
                <Trophy
                  size={16}
                  className={index === 0 ? 'text-amber-500' : 'text-slate-300'}
                />
              </div>
              <p
                className={`mt-4 text-xl font-bold tabular-nums ${
                  rankingMetric === 'profit' ||
                  rankingMetric === 'profitRate'
                    ? getProfitColor(
                        rankingMetric === 'profit'
                          ? stats.totalProfit
                          : stats.profitRate,
                      )
                    : 'text-slate-900'
                }`}
              >
                {rankingValue(rankingMetric, stats)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-400">
                {stats.winCount} 次中签 · {stats.participationCount} 次参与
              </p>
            </button>
          ))}
          {rankings.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400 md:col-span-2 xl:col-span-4">
              暂无账户数据
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">全部账户</h2>
            <div className="mt-1">
              <WinRateNote />
            </div>
          </div>
          <div className="w-full sm:w-80">
            <label className="relative block">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchTerm}
                placeholder="搜索名称、后四位或券商"
                className="focus-ring w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm placeholder:text-slate-400"
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          </div>
        </div>

        <AccountList
          accounts={filteredAccounts}
          stats={accountStats}
          hasSearch={Boolean(searchTerm.trim())}
          onView={(account) => onViewAccount(account.id)}
          onEdit={(account) => {
            setEditingAccount(account)
            setFormOpen(true)
          }}
          onDelete={setDeletingAccount}
          onCreate={() => setFormOpen(true)}
          sort={sort}
          onSort={toggleSort}
        />
      </section>

      <Modal
        open={formOpen}
        title={editingAccount ? '编辑账户' : '新增账户'}
        description="账户数据仅保存在当前浏览器。"
        fullScreenOnMobile
        onClose={() => {
          setFormOpen(false)
          setEditingAccount(null)
        }}
      >
        <AccountForm
          account={editingAccount}
          exchangeRecords={exchangeRecords.filter(
            (record) =>
              !editingAccount || record.accountId === editingAccount.id,
          )}
          onSubmit={handleSubmit}
          onCancel={() => {
            setFormOpen(false)
            setEditingAccount(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingAccount)}
        title="删除账户"
        message={`确定删除“${deletingAccount?.name ?? ''}”吗？关联申购记录也会一并删除，且无法恢复。`}
        onConfirm={handleDelete}
        onClose={() => setDeletingAccount(null)}
      />

      {notice && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl"
        >
          {notice}
        </div>
      )}
    </>
  )
}

function accountSortValue(
  key: AccountSortKey,
  account: Account,
  stats: AccountStats,
) {
  const values = {
    name: account.name,
    currentAssets: account.currentAssets,
    profit: stats.totalProfit,
    profitRate: stats.profitRate,
    participation: stats.participationCount,
    wins: stats.winCount,
    winRate: stats.winRate,
  }
  return values[key]
}

function rankingValue(
  metric: 'profit' | 'profitRate' | 'winRate' | 'participation',
  stats: AccountStats,
) {
  if (metric === 'profit') return formatHKD(stats.totalProfit, 'profit')
  if (metric === 'profitRate') {
    return formatSignedPercent(stats.profitRate)
  }
  if (metric === 'winRate') return formatPercent(stats.winRate)
  return `${stats.participationCount} 次`
}
