import {
  CheckCircle2,
  ListChecks,
  Search,
  Trophy,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { SortButton } from '../../components/ui/SortButton'
import { StatCard } from '../../components/ui/StatCard'
import { useAppData } from '../../hooks/useAppData'
import {
  compareValues,
  useThreeStateSort,
} from '../../hooks/useThreeStateSort'
import type { SellPlan, Subscription } from '../../types/subscription'
import { formatAccountName } from '../../utils/account'
import { formatHKD, formatPercent } from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import { getSubscriptionMetrics } from '../../utils/statistics'

type AppAccount = ReturnType<typeof useAppData>['accounts'][number]
type AppIpo = ReturnType<typeof useAppData>['ipos'][number]
type AllotmentViewStatus = 'pending' | 'won' | 'lost'

interface AllotmentViewRow {
  ipo: AppIpo
  subscriptions: Subscription[]
  participantAccounts: AppAccount[]
  winningAccounts: AppAccount[]
  status: AllotmentViewStatus
  createdAt: string
  subscriptionDate: string
  allottedAmount: number
  netProfit: number
  profitRate: number
}

export function AllotmentsPage() {
  const { accounts, ipos, subscriptions, updateSubscription, sales, deleteSale } =
    useAppData()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | AllotmentViewStatus>('all')
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchIpoId, setBatchIpoId] = useState('')
  const { sort, toggleSort } = useThreeStateSort<
    'name' | 'date' | 'profit' | 'profitRate'
  >('allotments')

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const accountById = new Map(accounts.map((account) => [account.id, account]))
    const subscriptionsByIpo = new Map<string, Subscription[]>()

    subscriptions.forEach((subscription) => {
      const related = subscriptionsByIpo.get(subscription.ipoId) ?? []
      related.push(subscription)
      subscriptionsByIpo.set(subscription.ipoId, related)
    })

    return ipos
      .flatMap((ipo): AllotmentViewRow[] => {
        const related = subscriptionsByIpo.get(ipo.id) ?? []
        if (related.length === 0) return []

        const winningSubscriptions = related.filter(
          (subscription) => subscription.status === 'won',
        )
        const viewStatus: AllotmentViewStatus =
          winningSubscriptions.length > 0
            ? 'won'
            : related.some((subscription) => subscription.status === 'applied')
              ? 'pending'
              : 'lost'
        if (status !== 'all' && viewStatus !== status) return []

        const participantAccounts = uniqueAccounts(related, accountById)
        const winningAccounts = uniqueAccounts(
          winningSubscriptions,
          accountById,
        )
        const searchable = [
          ipo.name,
          ipo.stockCode,
          ...participantAccounts.flatMap((account) => [
            account.name,
            account.accountSuffix,
          ]),
        ]
          .join(' ')
          .toLowerCase()
        if (query && !searchable.includes(query)) return []

        const metrics = related.map((subscription) =>
          getSubscriptionMetrics(subscription, ipo, sales),
        )
        const investedCost = metrics.reduce(
          (total, item) => total + item.investedCost,
          0,
        )
        const netProfit = metrics.reduce(
          (total, item) => total + item.netProfit,
          0,
        )

        return [
          {
            ipo,
            subscriptions: related,
            participantAccounts,
            winningAccounts,
            status: viewStatus,
            createdAt: latestValue(related.map((item) => item.createdAt)),
            subscriptionDate: latestValue(
              related.map((item) => item.subscriptionDate),
            ),
            allottedAmount: winningSubscriptions.reduce(
              (total, item) =>
                total + item.allottedShares * (ipo.issuePrice ?? 0),
              0,
            ),
            netProfit,
            profitRate:
              investedCost > 0 ? (netProfit / investedCost) * 100 : 0,
          },
        ]
      })
      .sort((a, b) => {
        if (!sort) return b.createdAt.localeCompare(a.createdAt)
        const values = {
          name: [a.ipo.name, b.ipo.name],
          date: [a.subscriptionDate, b.subscriptionDate],
          profit: [a.netProfit, b.netProfit],
          profitRate: [a.profitRate, b.profitRate],
        }[sort.key]
        const compared = compareValues(values[0], values[1])
        return sort.direction === 'asc' ? compared : -compared
      })
  }, [accounts, ipos, sales, search, sort, status, subscriptions])

  const wins = subscriptions.filter((item) => item.status === 'won').length
  const losses = subscriptions.filter(
    (item) => item.status === 'lost' || item.status === 'announced',
  ).length
  const decided = wins + losses

  const openBatch = (ipoId = '') => {
    setBatchIpoId(ipoId)
    setBatchOpen(true)
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/15"
          onClick={() => openBatch()}
        >
          <ListChecks size={17} />
          批量录入结果
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 text-xs shadow-sm">
        <span className="text-[#A8A296]">排序：</span>
        {[
          ['name', '名称'],
          ['date', '日期'],
          ['profit', '收益'],
          ['profitRate', '收益率'],
        ].map(([key, label]) => (
          <SortButton
            key={key}
            label={label}
            direction={sort?.key === key ? sort.direction : undefined}
            onClick={() =>
              toggleSort(key as 'name' | 'date' | 'profit' | 'profitRate')
            }
          />
        ))}
        {!sort && <span className="text-[#A8A296]">默认最新录入</span>}
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="已中签"
          value={String(wins)}
          hint="中签申购记录"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="未中签"
          value={String(losses)}
          hint="已公布未中签"
          icon={XCircle}
          tone="violet"
        />
        <StatCard
          label="系统中签率"
          value={formatPercent(decided > 0 ? (wins / decided) * 100 : 0)}
          hint={`${decided} 条已确定结果`}
          icon={Trophy}
          tone="amber"
        />
      </section>

      <div className="mt-8 grid gap-3 rounded-2xl border border-[#E4DFD6] bg-white p-4 shadow-card sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A296]"
          />
          <input
            value={search}
            placeholder="搜索账户、新股名称或代码"
            className="focus-ring w-full rounded-xl border border-[#E4DFD6] py-2.5 pl-10 pr-4 text-sm"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          value={status}
          className="rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-2.5 text-sm"
          onChange={(event) =>
            setStatus(event.target.value as 'all' | AllotmentViewStatus)
          }
        >
          <option value="all">全部状态</option>
          <option value="pending">待公布</option>
          <option value="won">已中签</option>
          <option value="lost">未中签</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#E4DFD6] bg-white shadow-card">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-[#A8A296]">
            暂无符合条件的中签项目
          </p>
        ) : (
          <div className="divide-y divide-[#F4F1ED]">
            {rows.map((row) => (
              <article
                key={row.ipo.id}
                className="grid gap-4 px-5 py-5 lg:grid-cols-[1.1fr_1.5fr_1.2fr_0.7fr_0.9fr_auto] lg:items-center"
              >
                <div>
                  <p className="text-sm font-bold text-[#4A4540]">
                    {row.ipo.name}（{row.ipo.stockCode || '-'}）
                  </p>
                  <p className="mt-1 text-xs text-[#A8A296]">
                    申购日期：{row.subscriptionDate || '-'}
                  </p>
                </div>
                <AccountList
                  label={`参与账户 ${row.participantAccounts.length}`}
                  accounts={row.participantAccounts}
                />
                <AccountList
                  label={`中签账户 ${row.winningAccounts.length}`}
                  accounts={row.winningAccounts}
                  emptyLabel="无中签账户"
                />
                <StatusBadge status={row.status} />
                <div>
                  <p className="text-xs text-[#A8A296]">
                    中签金额 {formatHKD(row.allottedAmount, 'investment')}
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold ${getProfitColor(
                      row.netProfit,
                    )}`}
                  >
                    {formatHKD(row.netProfit, 'profit')}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#A8A296]">
                    收益率 {formatPercent(row.profitRate, 'profitRate')}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E4DFD6] px-3 py-2 text-xs font-semibold text-[#736A5C]"
                  onClick={() => openBatch(row.ipo.id)}
                >
                  <ListChecks size={14} />
                  录入或编辑结果
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={batchOpen}
        title="批量录入中签结果"
        description="选择新股后，可按账户姓名或账号后四位快速录入。"
        fullScreenOnMobile
        onClose={() => setBatchOpen(false)}
      >
        <BatchAllotmentForm
          accounts={accounts}
          ipos={ipos}
          subscriptions={subscriptions}
          initialIpoId={batchIpoId}
          onSave={(changes) => {
            changes.forEach(({ subscription, status, shares, lots, sellPlan }) => {
              if (status !== 'won') {
                sales
                  .filter((sale) => sale.subscriptionId === subscription.id)
                  .forEach((sale) => deleteSale(sale.id))
              }
              updateSubscription(subscription.id, {
                ...subscription,
                status,
                allottedShares: status === 'won' ? shares : 0,
                allottedLots: status === 'won' ? lots : 0,
                sellPlan: status === 'won' ? sellPlan : 'hold',
              })
            })
            setBatchOpen(false)
          }}
          onCancel={() => setBatchOpen(false)}
        />
      </Modal>
    </>
  )
}

function uniqueAccounts(
  records: Subscription[],
  accountById: Map<string, AppAccount>,
) {
  const ids = new Set(records.map((record) => record.accountId))
  return [...ids]
    .map((id) => accountById.get(id))
    .filter((account): account is AppAccount => Boolean(account))
}

function latestValue(values: string[]) {
  return values.reduce((latest, value) => (value > latest ? value : latest), '')
}

function AccountList({
  label,
  accounts,
  emptyLabel = '暂无',
}: {
  label: string
  accounts: AppAccount[]
  emptyLabel?: string
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#736A5C]">{label}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#A8A296]">
        {accounts.length > 0
          ? accounts.map((account) => formatAccountName(account)).join('、')
          : emptyLabel}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: AllotmentViewStatus }) {
  const meta: Record<AllotmentViewStatus, { label: string; className: string }> = {
    pending: {
      label: '待公布',
      className: 'bg-amber-50 text-amber-700',
    },
    won: {
      label: '已中签',
      className: 'bg-emerald-50 text-emerald-700',
    },
    lost: {
      label: '未中签',
      className: 'bg-slate-100 text-slate-600',
    },
  }
  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${meta[status].className}`}
    >
      {meta[status].label}
    </span>
  )
}

type BatchResultStatus = 'applied' | 'won' | 'lost'

interface BatchDraft {
  status: BatchResultStatus
  shares: number
  lots: number
  sellPlan: SellPlan
}

function BatchAllotmentForm({
  accounts,
  ipos,
  subscriptions,
  initialIpoId,
  onSave,
  onCancel,
}: {
  accounts: ReturnType<typeof useAppData>['accounts']
  ipos: ReturnType<typeof useAppData>['ipos']
  subscriptions: Subscription[]
  initialIpoId: string
  onSave: (
    changes: {
      subscription: Subscription
      status: BatchResultStatus
      shares: number
      lots: number
      sellPlan: SellPlan
    }[],
  ) => void
  onCancel: () => void
}) {
  const subscribedIpoIds = useMemo(
    () => new Set(subscriptions.map((subscription) => subscription.ipoId)),
    [subscriptions],
  )
  const ipoOptions = useMemo(
    () => ipos.filter((ipo) => subscribedIpoIds.has(ipo.id)),
    [ipos, subscribedIpoIds],
  )
  const [ipoId, setIpoId] = useState(initialIpoId || ipoOptions[0]?.id || '')
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<string, BatchDraft>>({})

  useEffect(() => {
    if (initialIpoId && subscribedIpoIds.has(initialIpoId)) {
      setIpoId(initialIpoId)
    } else if (!subscribedIpoIds.has(ipoId)) {
      setIpoId(ipoOptions[0]?.id ?? '')
    }
  }, [initialIpoId, ipoId, ipoOptions, subscribedIpoIds])

  const selectedIpo = ipos.find((ipo) => ipo.id === ipoId)
  const records = useMemo(
    () =>
      subscriptions.filter((subscription) => subscription.ipoId === ipoId),
    [ipoId, subscriptions],
  )

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        records.map((subscription) => [
          subscription.id,
          {
            status:
              subscription.status === 'won'
                ? 'won'
                : subscription.status === 'applied'
                  ? 'applied'
                  : 'lost',
            shares:
              subscription.allottedShares || selectedIpo?.lotSize || 0,
            lots: subscription.allottedLots || 1,
            sellPlan: subscription.sellPlan,
          },
        ]),
      ),
    )
  }, [records, selectedIpo?.lotSize])

  const query = search.trim().toLowerCase()
  const lotSize = selectedIpo?.lotSize ?? 0
  const visibleRecords = records.filter((subscription) => {
    const account = accounts.find(
      (item) => item.id === subscription.accountId,
    )
    return (
      !query ||
      account?.name.toLowerCase().includes(query) ||
      account?.accountSuffix.includes(query)
    )
  })

  const updateDraft = (id: string, changes: Partial<BatchDraft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...changes },
    }))
  }

  const setDraftShares = (id: string, shares: number) => {
    updateDraft(id, {
      shares,
      lots: lotSize > 0 && shares > 0 ? Math.ceil(shares / lotSize) : 0,
    })
  }

  const setDraftLots = (id: string, lots: number) => {
    updateDraft(id, {
      lots,
      shares: lotSize > 0 && lots > 0 ? lots * lotSize : 0,
    })
  }

  const updateAllVisible = (changes: Partial<BatchDraft>) => {
    setDrafts((current) => {
      const next = { ...current }
      visibleRecords.forEach((subscription) => {
        const base = next[subscription.id] ?? {
          status: 'applied',
          shares: 0,
          lots: 0,
          sellPlan: 'hold',
        }
        next[subscription.id] = { ...base, ...changes }
      })
      return next
    })
  }

  return (
    <div className="mobile-safe-bottom">
      <div className="sticky top-[77px] z-[5] space-y-3 border-b border-[#F4F1ED] bg-white px-5 py-4 sm:static sm:px-7">
        <select
          value={ipoId}
          className="focus-ring w-full rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-3 text-sm"
          onChange={(event) => setIpoId(event.target.value)}
        >
          {ipoOptions.map((ipo) => (
            <option key={ipo.id} value={ipo.id}>
              {ipo.name}（{ipo.stockCode}）
            </option>
          ))}
        </select>
        <label className="relative block">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A296]"
          />
          <input
            value={search}
            placeholder="搜索账户姓名或后四位，如 7143"
            className="focus-ring w-full rounded-xl border border-[#E4DFD6] py-3 pl-10 pr-4 text-sm"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="grid gap-2 rounded-2xl bg-[#F4F1ED] p-3 sm:grid-cols-3">
          <button
            type="button"
            className="rounded-xl border border-[#E4DFD6] bg-white px-3 py-2 text-xs font-semibold text-[#736A5C]"
            onClick={() =>
              updateAllVisible({ status: 'lost', shares: 0, lots: 0 })
            }
          >
            全部未中签
          </button>
          <button
            type="button"
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
            onClick={() =>
              updateAllVisible({
                status: 'won',
                shares: lotSize,
                lots: lotSize > 0 ? 1 : 0,
              })
            }
          >
            全部中签
          </button>
          <button
            type="button"
            className="rounded-xl border border-[#E4DFD6] bg-white px-3 py-2 text-xs font-semibold text-[#736A5C]"
            onClick={() =>
              updateAllVisible({ status: 'applied', shares: 0, lots: 0 })
            }
          >
            清空输入
          </button>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4 sm:px-7">
        {visibleRecords.map((subscription) => {
          const account = accounts.find(
            (item) => item.id === subscription.accountId,
          )
          const draft = drafts[subscription.id]
          if (!draft) return null
          return (
            <article
              key={subscription.id}
              className="rounded-2xl border border-[#E4DFD6] p-4"
            >
              <p className="font-bold text-[#2E2A24]">
                {formatAccountName(account)}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {([
                  ['won', '已中签'],
                  ['lost', '未中签'],
                  ['applied', '待公布'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`rounded-xl px-2 py-2 text-xs font-semibold ${
                      draft.status === value
                        ? value === 'won'
                          ? 'bg-emerald-600 text-white'
                          : value === 'lost'
                            ? 'bg-slate-500 text-white'
                            : 'bg-amber-500 text-white'
                        : 'bg-[#F4F1ED] text-[#736A5C]'
                    }`}
                    onClick={() =>
                      updateDraft(subscription.id, { status: value })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draft.status === 'won' && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <BatchNumberField
                    label="中签股数"
                    value={draft.shares}
                    onChange={(shares) =>
                      setDraftShares(subscription.id, shares)
                    }
                  />
                  <BatchNumberField
                    label="中签手数"
                    value={draft.lots}
                    onChange={(lots) => setDraftLots(subscription.id, lots)}
                  />
                  <label>
                    <span className="mb-1.5 block text-xs font-medium text-[#736A5C]">
                      卖出方式
                    </span>
                    <select
                      value={draft.sellPlan}
                      className="focus-ring w-full rounded-xl border border-[#E4DFD6] bg-white px-3 py-2.5 text-sm"
                      onChange={(event) =>
                        updateDraft(subscription.id, {
                          sellPlan: event.target.value as SellPlan,
                        })
                      }
                    >
                      <option value="grey_market">暗盘卖出</option>
                      <option value="first_day">首日卖出</option>
                      <option value="hold">持有</option>
                    </select>
                  </label>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <div className="sticky bottom-0 flex gap-3 border-t border-[#F4F1ED] bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
        <button
          type="button"
          className="flex-1 rounded-xl border border-[#E4DFD6] px-4 py-3 text-sm font-semibold text-[#736A5C]"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="flex-[1.5] rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white"
          onClick={() =>
            onSave(
              records.map((subscription) => {
                const draft = drafts[subscription.id]
                return {
                  subscription,
                  status: draft?.status ?? 'applied',
                  shares: draft?.shares ?? 0,
                  lots: draft?.lots ?? 0,
                  sellPlan: draft?.sellPlan ?? subscription.sellPlan,
                }
              }),
            )
          }
        >
          保存全部结果
        </button>
      </div>
    </div>
  )
}

function BatchNumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-[#736A5C]">
        {label}
      </span>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        className="focus-ring w-full rounded-xl border border-[#E4DFD6] px-3 py-2.5 text-base"
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  )
}