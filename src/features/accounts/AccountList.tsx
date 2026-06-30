import {
  CreditCard,
  Eye,
  MoreHorizontal,
  Pencil,
  SearchX,
  Trash2,
  Trophy,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SortButton } from '../../components/ui/SortButton'
import type { SortState } from '../../hooks/useThreeStateSort'
import type { Account, AccountStats } from '../../types/account'
import { formatAccountName } from '../../utils/account'
import {
  formatHKD,
  formatPercent,
  formatSignedPercent,
  formatSignedHKD,
} from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import {
  getAccountDefaultSubscriptionMethod,
  getSubscriptionMethodLabel,
} from '../../utils/subscriptionMethod'

interface AccountListProps {
  accounts: Account[]
  stats: Record<string, AccountStats>
  hasSearch: boolean
  onView: (account: Account) => void
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
  onCreate: () => void
  sort: SortState<AccountSortKey> | null
  onSort: (key: AccountSortKey) => void
}

export type AccountSortKey =
  | 'name'
  | 'currentAssets'
  | 'profit'
  | 'profitRate'
  | 'participation'
  | 'wins'
  | 'winRate'

export function AccountList({
  accounts,
  stats,
  hasSearch,
  onView,
  onEdit,
  onDelete,
  onCreate,
  sort,
  onSort,
}: AccountListProps) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E4DFD6]/80 bg-white px-6 py-16 text-center shadow-card">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#F4F1ED] text-[#A8A296]">
          {hasSearch ? <SearchX size={25} /> : <CreditCard size={25} />}
        </div>
        <h3 className="mt-5 font-bold text-[#2E2A24]">
          {hasSearch ? '没有匹配的账户' : '还没有账户'}
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#F4F1ED]0">
          {hasSearch
            ? '请尝试其他账户名称、后四位或券商名称。'
            : '添加第一个港股账户，开始记录打新数据。'}
        </p>
        {!hasSearch && (
          <button
            type="button"
            className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            onClick={onCreate}
          >
            新增账户
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            stats={stats[account.id]}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#E4DFD6]/80 bg-white shadow-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[#F4F1ED] bg-[#F4F1ED]/70 text-left">
                <SortableHead label="账户" sortKey="name" sort={sort} onSort={onSort} />
                <SortableHead label="当前资产" sortKey="currentAssets" sort={sort} onSort={onSort} />
                <SortableHead label="累计收益" sortKey="profit" sort={sort} onSort={onSort} />
                <SortableHead label="收益率" sortKey="profitRate" sort={sort} onSort={onSort} />
                <SortableHead label="参与次数" sortKey="participation" sort={sort} onSort={onSort} />
                <SortableHead label="中签次数" sortKey="wins" sort={sort} onSort={onSort} />
                <SortableHead label="中签率" sortKey="winRate" sort={sort} onSort={onSort} />
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F1ED]">
              {accounts.map((account) => {
                const accountStats = stats[account.id]
                return (
                  <tr
                    key={account.id}
                    className="cursor-pointer transition hover:bg-[#F4F1ED]/80"
                    tabIndex={0}
                    onClick={() => onView(account)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') onView(account)
                    }}
                  >
                    <td className="px-5 py-4">
                      <AccountIdentity
                        account={account}
                        active={accountStats.participationCount > 0}
                      />
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#2E2A24]">
                      {formatHKD(account.currentAssets)}
                    </td>
                    <td
                      className={`px-5 py-4 text-lg font-bold tabular-nums ${getProfitColor(
                        accountStats.totalProfit,
                      )}`}
                    >
                      {formatSignedHKD(accountStats.totalProfit, 'profit')}
                    </td>
                    <td
                      className={`px-5 py-4 text-sm font-semibold ${getProfitColor(
                        accountStats.profitRate,
                      )}`}
                    >
                      {formatSignedPercent(accountStats.profitRate)}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#736A5C]">
                      {accountStats.participationCount}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#736A5C]">
                      {accountStats.winCount}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                        {formatPercent(accountStats.winRate)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <RowActions
                        account={account}
                        onView={onView}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: AccountSortKey
  sort: SortState<AccountSortKey> | null
  onSort: (key: AccountSortKey) => void
}) {
  return (
    <th className="px-5 py-4 text-left text-xs">
      <SortButton
        label={label}
        direction={sort?.key === sortKey ? sort.direction : undefined}
        onClick={() => onSort(sortKey)}
      />
    </th>
  )
}

function AccountCard({
  account,
  stats,
  onView,
  onEdit,
  onDelete,
}: {
  account: Account
  stats: AccountStats
  onView: (account: Account) => void
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}) {
  return (
    <article
      className="cursor-pointer rounded-2xl border border-[#E4DFD6]/80 bg-white p-5 shadow-card"
      onClick={() => onView(account)}
    >
      <div className="flex items-start justify-between gap-4">
        <AccountIdentity account={account} active={stats.participationCount > 0} />
        <RowActions
          account={account}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#F4F1ED] pt-5">
        <Metric label="当前资产" value={formatHKD(account.currentAssets)} />
        <Metric
          label="累计收益"
          value={formatSignedHKD(stats.totalProfit, 'profit')}
          profitValue={stats.totalProfit}
          prominent
        />
        <Metric
          label="收益率"
          value={formatSignedPercent(stats.profitRate)}
          profitValue={stats.profitRate}
        />
        <Metric label="参与次数" value={String(stats.participationCount)} />
        <Metric label="中签率" value={formatPercent(stats.winRate)} />
      </div>
    </article>
  )
}

function AccountIdentity({
  account,
  active,
}: {
  account: Account
  active: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#4A4540] to-[#2E2A24] text-white shadow-sm">
        <CreditCard size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#2E2A24]">
          {formatAccountName(account)}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-[#F4F1ED] px-2 py-0.5 text-[10px] font-semibold text-[#F4F1ED]0">
            {getSubscriptionMethodLabel(
              getAccountDefaultSubscriptionMethod(account),
            )}
          </span>
          {active && (
            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
              活跃
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  profitValue,
  prominent = false,
}: {
  label: string
  value: string
  profitValue?: number
  prominent?: boolean
}) {
  const toneClass =
    profitValue === undefined ? 'text-[#5A5246]' : getProfitColor(profitValue)

  return (
    <div>
      <p className="text-[11px] font-medium text-[#A8A296]">{label}</p>
      <p
        className={`mt-1 font-semibold tabular-nums ${toneClass} ${
          prominent ? 'text-lg' : 'text-sm'
        }`}
      >
        {value}
      </p>
    </div>
  )
}


function RowActions({
  account,
  onView,
  onEdit,
  onDelete,
}: {
  account: Account
  onView: (account: Account) => void
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  const runAction = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="rounded-xl p-2 text-[#A8A296] hover:bg-[#F4F1ED] hover:text-[#5A5246]"
        aria-label={`${account.name}操作菜单`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={19} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-[#E4DFD6] bg-white p-1.5 text-left shadow-lg">
          <ActionButton
            icon={Eye}
            label="查看详情"
            onClick={() => runAction(() => onView(account))}
          />
          <ActionButton
            icon={Pencil}
            label="编辑"
            onClick={() => runAction(() => onEdit(account))}
          />
          <ActionButton
            icon={Trash2}
            label="删除"
            danger
            onClick={() => runAction(() => onDelete(account))}
          />
        </div>
      )}
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  danger = false,
  onClick,
}: {
  icon: typeof Eye
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
        danger
          ? 'text-[#9A7468] hover:bg-[#F9F2F0]'
          : 'text-[#5A5246] hover:bg-[#F4F1ED]'
      }`}
      onClick={onClick}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

export function WinRateNote() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#A8A296]">
      <Trophy size={13} />
      中签率按已公布申购记录计算
    </span>
  )
}
