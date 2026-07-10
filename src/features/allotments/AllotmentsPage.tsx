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

type AllotmentRow =
  | {
      kind: 'subscription'
      subscription: Subscription
      ipo: ReturnType<typeof useAppData>['ipos'][number] | undefined
      account: ReturnType<typeof useAppData>['accounts'][number] | undefined
      createdAt: string
    }
  | {
      kind: 'ipo'
      ipo: ReturnType<typeof useAppData>['ipos'][number]
      createdAt: string
    }

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
    const subscriptionRows: AllotmentRow[] = subscriptions
      .filter((item) => status === 'all' || item.status === status)
      .map((subscription) => ({
        kind: 'subscription' as const,
        subscription,
        ipo: ipos.find((entry) => entry.id === subscription.ipoId),
        account: accounts.find((entry) => entry.id === subscription.accountId),
        createdAt: subscription.createdAt,
      }))
      .filter((row) => {
        const { account, ipo } = row
        return (
          !query ||
          account?.name.toLowerCase().includes(query) ||
          account?.accountSuffix.includes(query) ||
          ipo?.name.toLowerCase().includes(query) ||
          ipo?.stockCode.toLowerCase().includes(query)
        )
      })

    const ipoIdsWithSubscriptions = new Set(
      subscriptions.map((item) => item.ipoId),
    )
    const emptyIpoRows: AllotmentRow[] =
      status === 'all'
        ? ipos
            .filter((ipo) => !ipoIdsWithSubscriptions.has(ipo.id))
            .filter(
              (ipo) =>
                !query ||
                ipo.name.toLowerCase().includes(query) ||
                ipo.stockCode.toLowerCase().includes(query),
            )
            .map((ipo) => ({
              kind: 'ipo' as const,
              ipo,
              createdAt: ipo.createdAt,
            }))
        : []

    return [...subscriptionRows, ...emptyIpoRows]
      .sort((a, b) => {
        if (!sort) return b.createdAt.localeCompare(a.createdAt)
        const aIpo = a.ipo
        const bIpo = b.ipo
        const aMetrics =
          a.kind === 'subscription'
            ? getSubscriptionMetrics(a.subscription, aIpo, sales)
            : { netProfit: 0, profitRate: 0 }
        const bMetrics =
          b.kind === 'subscription'
            ? getSubscriptionMetrics(b.subscription, bIpo, sales)
            : { netProfit: 0, profitRate: 0 }
        const values = {
          name: [aIpo?.name ?? '', bIpo?.name ?? ''],
          date: [
            a.kind === 'subscription'
              ? a.subscription.subscriptionDate
              : aIpo?.subscriptionDate ?? '',
            b.kind === 'subscription'
              ? b.subscription.subscriptionDate
              : bIpo?.subscriptionDate ?? '',
          ],
          profit: [aMetrics.netProfit, bMetrics.netProfit],
          profitRate: [aMetrics.profitRate, bMetrics.profitRate],
        }[sort.key]
        const compared = compareValues(values[0], values[1])
        return sort.direction === 'asc' ? compared : -compared
      })
  }, [accounts, ipos, sales, search, sort, status, subscriptions])

  const ipoSummary = useMemo(() => {
    const map = new Map<
      string,
      { participationCount: number; winCount: number }
    >()
    ipos.forEach((ipo) =>
      map.set(ipo.id, { participationCount: 0, winCount: 0 }),
    )
    subscriptions.forEach((subscription) => {
      const current =
        map.get(subscription.ipoId) ??
        { participationCount: 0, winCount: 0 }
      current.participationCount += 1
      if (subscription.status === 'won') current.winCount += 1
      map.set(subscription.ipoId, current)
    })
    return map
  }, [ipos, subscriptions])

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
              toggleSort(
                key as 'name' | 'date' | 'profit' | 'profitRate',
              )
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

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#E4DFD6] bg-white shadow-card">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-[#A8A296]">
            暂无匹配的新股或申购记录
          </p>
        ) : (
          <div className="divide-y divide-[#F4F1ED]">
            {rows.map((row) => {
              const ipo = row.ipo
              const summary = ipo
                ? ipoSummary.get(ipo.id) ?? {
                    participationCount: 0,
                    winCount: 0,
                  }
                : { participationCount: 0, winCount: 0 }
              if (row.kind === 'ipo') {
                return (
                  <div
                    key={`ipo-${row.ipo.id}`}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#4A4540]">
                        {row.ipo.name}（{row.ipo.stockCode || '-'}）
                      </p>
                      <p className="mt-1 text-xs text-[#A8A296]">
                        参与账户：0 · 中签账户：0
                      </p>
                    </div>
                    <div className="text-sm text-[#736A5C]">暂无申购记录</div>
                    <div>
                      <p className="text-xs text-[#A8A296]">中签金额</p>
                      <p className="mt-1 text-sm font-semibold text-[#736A5C]">
                        {formatHKD(0, 'investment')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#A8A296]">浮盈浮亏</p>
                      <p className="mt-1 text-sm font-semibold text-[#736A5C]">
                        {formatHKD(0, 'profit')}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#A8A296]">
                        收益率 {formatPercent(0, 'profitRate')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#E4DFD6] px-3 py-2 text-xs font-semibold text-[#A8A296]"
                    >
                      待创建申购
                    </button>
                  </div>
                )
              }

              const { subscription, account } = row
              const metrics = getSubscriptionMetrics(subscription, ipo, sales)
              const allottedAmount =
                subscription.allottedShares * (ipo?.issuePrice ?? 0)
              return (
                <div
                  key={subscription.id}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-bold text-[#4A4540]">
                      {ipo?.name ?? '-'}（{ipo?.stockCode ?? '-'}）
                    </p>
                    <p className="mt-1 text-xs text-[#A8A296]">
                      {formatAccountName(account)} · 参与账户：
                      {summary.participationCount} · 中签账户：
                      {summary.winCount}
                    </p>
                  </div>
                  <div className="text-sm text-[#736A5C]">
                    {subscription.status === 'won'
                      ? `${subscription.allottedShares} 股 / ${subscription.allottedLots} 手`
                      : statusLabel[subscription.status]}
                  </div>
                  <div>
                    <p className="text-xs text-[#A8A296]">中签金额</p>
                    <p className="mt-1 text-sm font-semibold text-[#736A5C]">
                      {formatHKD(allottedAmount, 'investment')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#A8A296]">浮盈浮亏</p>
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E4DFD6] px-3 py-2 text-xs font-semibold text-[#736A5C]"
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
  const ipoOptions = ipos
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
          status: 'announced',
          shares: 0,
          lots: 0,
        }
        next[subscription.id] = {
          ...base,
          ...changes,
        }
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
            className="rounded-xl bg-[#4A4540] px-3 py-2 text-xs font-semibold text-white"
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
              updateAllVisible({ status: 'announced', shares: 0, lots: 0 })
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
                  ['announced', '待公布'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`rounded-xl px-2 py-2 text-xs font-semibold ${
                      draft.status === value
                        ? value === 'won'
                          ? 'bg-[#F9F2F0]0 text-white'
                          : value === 'lost'
                            ? 'bg-[#F2F5F2]0 text-white'
                            : 'bg-[#4A4540] text-white'
                        : 'bg-[#F4F1ED] text-[#F4F1ED]'
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
	                    onChange={(shares) => setDraftShares(subscription.id, shares)}
	                  />
	                  <BatchNumberField
	                    label="中签手数"
	                    value={draft.lots}
	                    onChange={(lots) => setDraftLots(subscription.id, lots)}
	                  />
                </div>
              )}
            </article>
          )
        })}
        {visibleRecords.length === 0 && (
          <p className="rounded-2xl bg-[#F4F1ED] px-4 py-12 text-center text-sm text-[#A8A296]">
            这只新股暂无申购记录，可先到申购记录页面创建参与账户。
          </p>
        )}
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
      <span className="mb-1.5 block text-xs font-medium text-[#F4F1ED]0">
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
