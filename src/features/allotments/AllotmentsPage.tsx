import {
  CheckCircle2,
  ListChecks,
  Pencil,
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
import type { Subscription } from '../../types/subscription'
import { formatAccountName } from '../../utils/account'
import { formatHKD, formatPercent } from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import { getSubscriptionMetrics } from '../../utils/statistics'
import { AllotmentForm } from './AllotmentForm'

export function AllotmentsPage() {
  const { accounts, ipos, subscriptions, updateSubscription, sales, deleteSale } =
    useAppData()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<
    'all' | 'applied' | 'announced' | 'won' | 'lost'
  >('all')
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [batchOpen, setBatchOpen] = useState(false)
  const { sort, toggleSort } = useThreeStateSort<
    'name' | 'date' | 'profit' | 'profitRate'
  >('allotments')

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return subscriptions
      .filter((item) => status === 'all' || item.status === status)
      .filter((item) => {
        const account = accounts.find((entry) => entry.id === item.accountId)
        const ipo = ipos.find((entry) => entry.id === item.ipoId)
        return (
          !query ||
          account?.name.toLowerCase().includes(query) ||
          account?.accountSuffix.includes(query) ||
          ipo?.name.toLowerCase().includes(query) ||
          ipo?.stockCode.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        if (!sort) return b.createdAt.localeCompare(a.createdAt)
        const aIpo = ipos.find((item) => item.id === a.ipoId)
        const bIpo = ipos.find((item) => item.id === b.ipoId)
        const aMetrics = getSubscriptionMetrics(a, aIpo, sales)
        const bMetrics = getSubscriptionMetrics(b, bIpo, sales)
        const values = {
          name: [aIpo?.name ?? '', bIpo?.name ?? ''],
          date: [a.subscriptionDate, b.subscriptionDate],
          profit: [aMetrics.netProfit, bMetrics.netProfit],
          profitRate: [aMetrics.profitRate, bMetrics.profitRate],
        }[sort.key]
        const compared = compareValues(values[0], values[1])
        return sort.direction === 'asc' ? compared : -compared
      })
  }, [accounts, ipos, sales, search, sort, status, subscriptions])

  const wins = subscriptions.filter((item) => item.status === 'won').length
  const losses = subscriptions.filter((item) => item.status === 'lost').length
  const decided = wins + losses

  return (
    <>
      <div className="mb-5 flex items-center justify-end gap-2 flex-wrap">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/15"
          onClick={() => setBatchOpen(true)}
        >
          <ListChecks size={17} />
          批量录入结果
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 text-xs shadow-sm">
        <span className="text-slate-400">排序：</span>
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
              toggleSort(
                key as 'name' | 'date' | 'profit' | 'profitRate',
              )
            }
          />
        ))}
        {!sort && <span className="text-slate-400">默认最新录入</span>}
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

      <div className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            placeholder="搜索账户、新股名称或代码"
            className="focus-ring w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          value={status}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
          onChange={(event) =>
            setStatus(
              event.target.value as
                | 'all'
                | 'applied'
                | 'announced'
                | 'won'
                | 'lost',
            )
          }
        >
          <option value="all">全部结果</option>
          <option value="applied">已申购</option>
          <option value="announced">已公布</option>
          <option value="won">已中签</option>
          <option value="lost">未中签</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-slate-400">
            暂无匹配的申购记录
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((subscription) => {
              const ipo = ipos.find((item) => item.id === subscription.ipoId)
              const metrics = getSubscriptionMetrics(
                subscription,
                ipo,
                sales,
              )
              return (
                <div
                  key={subscription.id}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {ipo?.name ?? '-'}（{ipo?.stockCode ?? '-'}）
                    </p>
                    
                  </div>
                  <div className="text-sm text-slate-600">
                    {subscription.status === 'won'
                      ? `${subscription.allottedShares} 股 / ${subscription.allottedLots} 手`
                      : statusLabel[subscription.status]}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">中签金额</p>
                    
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">浮盈浮亏</p>
                    <p
                      className={`mt-1 text-sm font-semibold ${getProfitColor(
                        metrics.netProfit,
                      )}`}
                    >
                      {formatHKD(metrics.netProfit, 'profit')}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] ${getProfitColor(
                        metrics.profitRate,
                      )}`}
                    >
                      收益率{' '}
                      {formatPercent(metrics.profitRate, 'profitRate')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                    onClick={() => setEditing(subscription)}
                  >
                    <Pencil size={14} />
                    编辑结果
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(editing)}
        title="更新中签结果"
        description="发行价和上市日期自动取自关联新股资料。"
        fullScreenOnMobile
        onClose={() => setEditing(null)}
      >
        {editing && (
          <AllotmentForm
            subscription={editing}
            ipo={ipos.find((ipo) => ipo.id === editing.ipoId)}
            onSubmit={(input) => {
              if (input.status !== 'won') {
                sales
                  .filter((sale) => sale.subscriptionId === editing.id)
                  .forEach((sale) => deleteSale(sale.id))
              }
              updateSubscription(editing.id, input)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
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
          onSave={(changes) => {
            changes.forEach(({ subscription, status, shares, lots }) => {
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

const statusLabel = {
  applied: '已申购',
  announced: '已公布',
  won: '已中签',
  lost: '未中签',
}

type BatchResultStatus = 'announced' | 'won' | 'lost'

interface BatchDraft {
  status: BatchResultStatus
  shares: number
  lots: number
}

function BatchAllotmentForm({
  accounts,
  ipos,
  subscriptions,
  onSave,
  onCancel,
}: {
  accounts: ReturnType<typeof useAppData>['accounts']
  ipos: ReturnType<typeof useAppData>['ipos']
  subscriptions: Subscription[]
  onSave: (
    changes: {
      subscription: Subscription
      status: BatchResultStatus
      shares: number
      lots: number
    }[],
  ) => void
  onCancel: () => void
}) {
  const ipoOptions = ipos.filter((ipo) =>
    subscriptions.some((subscription) => subscription.ipoId === ipo.id),
  )
  const [ipoId, setIpoId] = useState(ipoOptions[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<string, BatchDraft>>({})
  const selectedIpo = ipos.find((ipo) => ipo.id === ipoId)
  const records = useMemo(
    () =>
      subscriptions.filter(
        (subscription) => subscription.ipoId === ipoId,
      ),
    [ipoId, subscriptions],
  )

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        records.map((subscription) => [
          subscription.id,
          {
            status:
              subscription.status === 'won' || subscription.status === 'lost'
                ? subscription.status
                : 'announced',
            shares:
              subscription.allottedShares || selectedIpo?.lotSize || 0,
            lots: subscription.allottedLots || 1,
          },
        ]),
      ),
    )
  }, [records, selectedIpo?.lotSize])

  const query = search.trim().toLowerCase()
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

  return (
    <div className="mobile-safe-bottom">
      <div className="sticky top-[77px] z-[5] space-y-3 border-b border-slate-100 bg-white px-5 py-4 sm:static sm:px-7">
        <select
          value={ipoId}
          className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"
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
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            placeholder="搜索账户姓名或后四位，如 7143"
            className="focus-ring w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
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
              className="rounded-2xl border border-slate-200 p-4"
            >
              <p className="font-bold text-slate-900">
                {formatAccountName(account)}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {([
                  ['won', '已中签'],
                  ['lost', '未中签'],
                  ['announced', '待公布'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`rounded-xl px-2 py-2 text-xs font-semibold ${
                      draft.status === value
                        ? value === 'won'
                          ? 'bg-red-500 text-white'
                          : value === 'lost'
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-500'
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
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <BatchNumberField
                    label="中签股数"
                    value={draft.shares}
                    onChange={(shares) =>
                      updateDraft(subscription.id, { shares })
                    }
                  />
                  <BatchNumberField
                    label="中签手数"
                    value={draft.lots}
                    onChange={(lots) =>
                      updateDraft(subscription.id, { lots })
                    }
                  />
                </div>
              )}
            </article>
          )
        })}
        {visibleRecords.length === 0 && (
          <p className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
            暂无匹配账户
          </p>
        )}
      </div>

      <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
        <button
          type="button"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
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
                  status: draft?.status ?? 'announced',
                  shares: draft?.shares ?? 0,
                  lots: draft?.lots ?? 0,
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
      <span className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </span>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        className="focus-ring w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base"
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  )
}
