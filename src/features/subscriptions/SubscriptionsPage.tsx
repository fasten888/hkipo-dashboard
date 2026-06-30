import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ListChecks,
  Layers3,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { SortButton } from '../../components/ui/SortButton'
import { StatCard } from '../../components/ui/StatCard'
import { useAppData } from '../../hooks/useAppData'
import {
  compareValues,
  useThreeStateSort,
} from '../../hooks/useThreeStateSort'
import type { Sale, SaleInput } from '../../types/sale'
import type {
  Subscription,
  SubscriptionInput,
  SubscriptionStatus,
} from '../../types/subscription'
import { formatAccountName } from '../../utils/account'
import { formatHKD } from '../../utils/currency'
import { getSubscriptionMetrics } from '../../utils/statistics'
import { SaleForm } from '../sales/SaleForm'
import { BatchSubscriptionEditForm } from './BatchSubscriptionEditForm'
import { BatchSubscriptionForm } from './BatchSubscriptionForm'
import { SubscriptionForm } from './SubscriptionForm'
import { SubscriptionRecordCard } from './SubscriptionRecordCard'

type SubscriptionSortKey = 'name' | 'date' | 'profit'

export function SubscriptionsPage() {
  const {
    accounts,
    ipos,
    subscriptions,
    sales,
    addSubscriptions,
    updateSubscription,
    deleteSubscription,
    batchUpdateSubscriptions,
    batchDeleteSubscriptions,
    canUndoSubscriptionBatch,
    undoLastSubscriptionBatch,
    addSale,
    updateSale,
    deleteSale,
  } = useAppData()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<SubscriptionStatus | 'all'>('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [ipoFilter, setIpoFilter] = useState('all')
  const { sort, toggleSort } =
    useThreeStateSort<SubscriptionSortKey>('subscriptions')
  const [formOpen, setFormOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchEditOpen, setBatchEditOpen] = useState(false)
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [deleting, setDeleting] = useState<Subscription | null>(null)
  const [saleTarget, setSaleTarget] = useState<Subscription | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null)
  const [notice, setNotice] = useState('')
  const [expandedIpos, setExpandedIpos] = useState<string[]>([])
  const noticeTimer = useRef<number>()
  const subscriptionSignatureRef = useRef('')

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return subscriptions
      .map((subscription) => {
        const account = accounts.find((item) => item.id === subscription.accountId)
        const ipo = ipos.find((item) => item.id === subscription.ipoId)
        const metrics = getSubscriptionMetrics(subscription, ipo, sales)
        return { subscription, account, ipo, metrics }
      })
      .filter(({ subscription, account, ipo }) => {
        const matchesStatus =
          status === 'all' || subscription.status === status
        const matchesAccount =
          accountFilter === 'all' || subscription.accountId === accountFilter
        const matchesIpo =
          ipoFilter === 'all' || subscription.ipoId === ipoFilter
        const matchesSearch =
          !query ||
          account?.name.toLowerCase().includes(query) ||
          account?.accountSuffix.includes(query) ||
          ipo?.name.toLowerCase().includes(query) ||
          ipo?.stockCode.toLowerCase().includes(query)
        return matchesStatus && matchesAccount && matchesIpo && matchesSearch
      })
      .sort((a, b) => {
        if (!sort) {
          return b.subscription.createdAt.localeCompare(
            a.subscription.createdAt,
          )
        }
        const values = {
          name: [a.ipo?.name ?? '', b.ipo?.name ?? ''],
          date: [
            a.subscription.subscriptionDate,
            b.subscription.subscriptionDate,
          ],
          profit: [a.metrics.netProfit, b.metrics.netProfit],
        }[sort.key]
        const compared = compareValues(values[0], values[1])
        return sort.direction === 'asc' ? compared : -compared
      })
  }, [
    accountFilter,
    accounts,
    ipoFilter,
    ipos,
    sales,
    search,
    sort,
    status,
    subscriptions,
  ])

  const totalProfit = subscriptions.reduce((total, subscription) => {
    const ipo = ipos.find((item) => item.id === subscription.ipoId)
    return total + getSubscriptionMetrics(subscription, ipo, sales).netProfit
  }, 0)
  const wonCount = subscriptions.filter(
    (item) => item.status === 'won',
  ).length
  const decidedCount = subscriptions.filter(
    (item) => item.status === 'won' || item.status === 'lost',
  ).length
  const accountParticipation = accounts
    .map((account) => ({
      id: account.id,
      name: formatAccountName(account),
      count: subscriptions.filter((item) => item.accountId === account.id)
        .length,
    }))
    .sort((a, b) => b.count - a.count)
  const ipoParticipation = ipos
    .map((ipo) => ({
      id: ipo.id,
      name: `${ipo.name}（${ipo.stockCode}）`,
      count: new Set(
        subscriptions
          .filter((item) => item.ipoId === ipo.id)
          .map((item) => item.accountId),
      ).size,
    }))
    .sort((a, b) => b.count - a.count)
  const visibleIds = useMemo(
    () => rows.map(({ subscription }) => subscription.id),
    [rows],
  )
  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.includes(id))
  const groupedRows = useMemo(() => {
    const groups = new Map<string, typeof rows>()
    rows.forEach((row) => {
      const key = row.ipo?.id ?? `deleted-${row.subscription.ipoId}`
      groups.set(key, [...(groups.get(key) ?? []), row])
    })
    return [...groups.entries()].map(([id, records]) => ({
      id,
      ipo: records[0]?.ipo,
      records,
      winCount: records.filter(
        ({ subscription }) => subscription.status === 'won',
      ).length,
      lossCount: records.filter(
        ({ subscription }) => subscription.status === 'lost',
      ).length,
    }))
  }, [rows])

  useEffect(() => {
    const visible = new Set(visibleIds)
    setSelectedIds((current) => {
      const next = current.filter((id) => visible.has(id))
      return next.length === current.length ? current : next
    })
  }, [visibleIds])

  useEffect(() => {
    const signature = subscriptions
      .map((item) => `${item.id}:${item.updatedAt}:${item.status}`)
      .join('|')
    if (!subscriptionSignatureRef.current) {
      subscriptionSignatureRef.current = signature
      return
    }
    if (subscriptionSignatureRef.current === signature) return
    subscriptionSignatureRef.current = signature

    setSearch('')
    setStatus('all')
    setAccountFilter('all')
    setIpoFilter('all')
    setSelectedIds([])
    setSelectionMode(false)

    const latest = subscriptions
      .slice()
      .sort((a, b) =>
        (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt),
      )[0]
    if (latest?.ipoId) {
      setExpandedIpos((current) =>
        current.includes(latest.ipoId)
          ? current
          : [latest.ipoId, ...current].slice(0, 4),
      )
    }
    showNotice('数据已刷新，已显示最新申购记录')
  }, [subscriptions])

  const showNotice = (message: string) => {
    window.clearTimeout(noticeTimer.current)
    setNotice(message)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2200)
  }

  const canCreate = () => {
    if (accounts.length === 0 || ipos.length === 0) {
      showNotice('请先创建账户并录入新股资料')
      return false
    }
    return true
  }

  const saveSubscription = (input: SubscriptionInput) => {
    if (editing) {
      const relatedSales = sales.filter(
        (sale) => sale.subscriptionId === editing.id,
      )
      const soldShares = relatedSales.reduce(
        (total, sale) => total + sale.shares,
        0,
      )
      if (input.status === 'won' && input.allottedShares < soldShares) {
        showNotice(`中签股数不能少于已卖出的 ${soldShares} 股`)
        return
      }
      if (input.status !== 'won') {
        relatedSales.forEach((sale) => deleteSale(sale.id))
      }
      updateSubscription(editing.id, input)
      showNotice('申购记录已更新')
    } else {
      addSubscriptions([input])
      showNotice('申购记录已创建')
    }
    setEditing(null)
    setFormOpen(false)
  }

  const saveSale = (input: SaleInput) => {
    if (editingSale) {
      updateSale(editingSale.id, input)
      showNotice('卖出记录已更新')
    } else {
      addSale(input)
      showNotice('卖出记录已添加')
    }
    setSaleTarget(null)
    setEditingSale(null)
  }

  const renderSubscriptionCard = ({
    subscription,
    account,
    ipo,
    metrics,
  }: (typeof rows)[number]) => (
    <SubscriptionRecordCard
      key={subscription.id}
      subscription={subscription}
      account={account}
      ipo={ipo}
      metrics={metrics}
      sales={sales.filter(
        (sale) => sale.subscriptionId === subscription.id,
      )}
      onEdit={() => {
        setEditing(subscription)
        setFormOpen(true)
      }}
      onDelete={() => setDeleting(subscription)}
      onAddSale={() => {
        setSaleTarget(subscription)
        setEditingSale(null)
      }}
      onEditSale={(sale) => {
        setSaleTarget(subscription)
        setEditingSale(sale)
      }}
      onDeleteSale={setDeletingSale}
      selectionEnabled={selectionMode}
      selected={selectedIds.includes(subscription.id)}
      onToggleSelection={() =>
        setSelectedIds((current) =>
          current.includes(subscription.id)
            ? current.filter((id) => id !== subscription.id)
            : [...current, subscription.id],
        )
      }
    />
  )

  return (
    <>
      <div className="mb-5 flex items-center justify-end gap-2 flex-wrap">
        <div className="flex flex-col gap-2 sm:flex-row">
          {canUndoSubscriptionBatch && (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#EFE3D2] bg-[#FAF6EF] px-4 py-3 text-sm font-semibold text-[#7D653C] hover:bg-[#F3EAD7]"
              onClick={() => {
                const restored = undoLastSubscriptionBatch()
                setSelectedIds([])
                showNotice(
                  restored
                    ? '已撤销最近一次批量操作'
                    : '数据已发生其它变化，无法直接撤销',
                )
              }}
            >
              <RotateCcw size={17} />
              撤销批量操作
            </button>
          )}
          <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm ${
              selectionMode
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-[#E4DFD6] bg-white text-[#5A5246] hover:bg-[#F4F1ED]'
            }`}
            onClick={() => {
              setSelectionMode((current) => !current)
              setSelectedIds([])
            }}
          >
            <ListChecks size={17} />
            {selectionMode ? '退出批量编辑' : '批量编辑'}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E4DFD6] bg-white px-4 py-3 text-sm font-semibold text-[#5A5246] shadow-sm hover:bg-[#F4F1ED]"
            onClick={() => canCreate() && setBatchOpen(true)}
          >
            <Layers3 size={17} />
            批量申购
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/15 hover:bg-brand-700"
            onClick={() => {
              if (!canCreate()) return
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus size={17} />
            新增申购
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="总参与次数"
          value={String(subscriptions.length)}
          hint={`${accounts.length} 个账户`}
          icon={ClipboardList}
          tone="blue"
        />
        <StatCard
          label="总中签次数"
          value={String(wonCount)}
          hint={`${decidedCount} 条已公布`}
          icon={CheckCircle2}
          tone="amber"
        />
        <StatCard
          label="已录入卖出"
          value={String(sales.length)}
          hint="支持多次及部分卖出"
          icon={Layers3}
          tone="violet"
        />
        <StatCard
          label="累计收益"
          value={formatHKD(totalProfit, 'profit')}
          hint="按卖出收入自动计算"
          icon={TrendingUp}
          tone="emerald"
          profitValue={totalProfit}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <ParticipationSummary
          title="各账户申购次数"
          rows={accountParticipation}
          unit="次"
        />
        <ParticipationSummary
          title="各新股参与人数"
          rows={ipoParticipation}
          unit="人"
        />
      </section>

      <div className="mt-8 grid gap-3 rounded-2xl border border-[#E4DFD6]/80 bg-white p-4 shadow-card sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A296]"
          />
          <input
            value={search}
            placeholder="搜索账户、新股名称或股票代码"
            className="focus-ring w-full rounded-xl border border-[#E4DFD6] py-2.5 pl-10 pr-4 text-sm"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          value={status}
          className="rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-2.5 text-sm text-[#736A5C]"
          onChange={(event) =>
            setStatus(event.target.value as SubscriptionStatus | 'all')
          }
        >
          <option value="all">全部状态</option>
          <option value="applied">已申购</option>
          <option value="announced">已公布</option>
          <option value="lost">未中签</option>
          <option value="won">已中签</option>
        </select>
        <select
          value={accountFilter}
          className="rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-2.5 text-sm text-[#736A5C]"
          onChange={(event) => setAccountFilter(event.target.value)}
        >
          <option value="all">全部账户</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {formatAccountName(account)}
            </option>
          ))}
        </select>
        <select
          value={ipoFilter}
          className="rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-2.5 text-sm text-[#736A5C]"
          onChange={(event) => setIpoFilter(event.target.value)}
        >
          <option value="all">全部新股</option>
          {ipos.map((ipo) => (
            <option key={ipo.id} value={ipo.id}>
              {ipo.name}（{ipo.stockCode}）
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 text-xs shadow-sm">
        <span className="text-[#A8A296]">排序：</span>
        {[
          ['name', '名称'],
          ['date', '日期'],
          ['profit', '收益'],
        ].map(([key, label]) => (
          <SortButton
            key={key}
            label={label}
            direction={
              sort?.key === key ? sort.direction : undefined
            }
            onClick={() => toggleSort(key as SubscriptionSortKey)}
          />
        ))}
        {!sort && <span className="text-[#A8A296]">默认最新录入</span>}
      </div>

      {selectionMode && (
        <div className="sticky top-3 z-30 mt-4 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold text-[#4A4540]">
              已选择 {selectedIds.length} 条记录
            </span>
            <span className="text-xs text-[#A8A296]">
              当前筛选共 {visibleIds.length} 条
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <BatchAction
              label={allVisibleSelected ? '取消全选' : '全选'}
              onClick={() =>
                setSelectedIds(allVisibleSelected ? [] : visibleIds)
              }
            />
            <BatchAction
              label="反选"
              onClick={() =>
                setSelectedIds((current) => {
                  const selected = new Set(current)
                  return visibleIds.filter((id) => !selected.has(id))
                })
              }
            />
            <BatchAction
              label="批量修改"
              primary
              disabled={selectedIds.length === 0}
              onClick={() => setBatchEditOpen(true)}
            />
            <BatchAction
              label="批量删除"
              danger
              disabled={selectedIds.length === 0}
              icon={Trash2}
              onClick={() => setBatchDeleteOpen(true)}
            />
            <BatchAction
              label="取消选择"
              disabled={selectedIds.length === 0}
              icon={X}
              onClick={() => setSelectedIds([])}
            />
          </div>
        </div>
      )}

      <section className="mt-4 grid gap-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-[#E4DFD6] bg-white px-6 py-14 text-center text-sm text-[#A8A296] shadow-card">
            暂无匹配的申购记录
          </div>
        ) : (
          groupedRows.map((group) => {
            const expanded = expandedIpos.includes(group.id)
            return (
              <article
                key={group.id}
                className="overflow-hidden rounded-2xl border border-[#E4DFD6]/80 bg-white shadow-card"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                  onClick={() =>
                    setExpandedIpos((current) =>
                      current.includes(group.id)
                        ? current.filter((id) => id !== group.id)
                        : [...current, group.id],
                    )
                  }
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-[#2E2A24]">
                      {group.ipo?.name ?? '已删除新股'}
                    </h3>
                    
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-[#F9F2F0] px-2.5 py-1 text-[#F9F2F0]0">
                        中签 {group.winCount}
                      </span>
                      <span className="rounded-full bg-[#F2F5F2] px-2.5 py-1 text-[#677A6F]">
                        未中 {group.lossCount}
                      </span>
                      <span className="rounded-full bg-[#F4F1ED] px-2.5 py-1 text-[#F4F1ED]0">
                        待公布{' '}
                        {Math.max(
                          0,
                          group.records.length -
                            group.winCount -
                            group.lossCount,
                        )}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-[#A8A296] transition ${
                      expanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expanded && (
                  <div className="space-y-3 border-t border-[#F4F1ED] bg-[#F4F1ED] p-3">
                    {group.records.map(renderSubscriptionCard)}
                  </div>
                )}
              </article>
            )
          })
        )}
      </section>

      <section className="mt-4 hidden gap-4 md:grid">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-[#E4DFD6] bg-white px-6 py-14 text-center text-sm text-[#A8A296] shadow-card">
            暂无匹配的申购记录
          </div>
        ) : (
          rows.map(renderSubscriptionCard)
        )}
      </section>

      <Modal
        open={formOpen}
        title={editing ? '编辑申购记录' : '新增申购记录'}
        description="自动带出所选账户的默认申购方式，每笔记录均可按实际情况修改。"
        fullScreenOnMobile
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      >
        <SubscriptionForm
          accounts={accounts}
          ipos={ipos}
          subscription={editing}
          onSubmit={saveSubscription}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      </Modal>

      <Modal
        open={batchOpen}
        title="批量创建申购记录"
        description="选择一只新股并勾选多个账户，一次生成多条记录。"
        fullScreenOnMobile
        onClose={() => setBatchOpen(false)}
      >
        <BatchSubscriptionForm
          accounts={accounts}
          ipos={ipos}
          onSubmit={(inputs) => {
            addSubscriptions(inputs)
            setBatchOpen(false)
            showNotice(`已创建 ${inputs.length} 条申购记录`)
          }}
          onCancel={() => setBatchOpen(false)}
        />
      </Modal>

      <Modal
        open={batchEditOpen}
        title="批量修改申购记录"
        description="未勾选的字段保持原值。上市日期会更新所选记录关联的新股资料。"
        fullScreenOnMobile
        onClose={() => setBatchEditOpen(false)}
      >
        <BatchSubscriptionEditForm
          selectedCount={selectedIds.length}
          onSubmit={(changes) => {
            batchUpdateSubscriptions(selectedIds, changes)
            const count = selectedIds.length
            setBatchEditOpen(false)
            setSelectedIds([])
            showNotice(`已批量修改 ${count} 条申购记录，可一键撤销`)
          }}
          onCancel={() => setBatchEditOpen(false)}
        />
      </Modal>

      <Modal
        open={Boolean(saleTarget)}
        title={editingSale ? '编辑卖出记录' : '新增卖出记录'}
        description="同一笔中签可分多次卖出，系统会自动统计剩余持仓。"
        fullScreenOnMobile
        onClose={() => {
          setSaleTarget(null)
          setEditingSale(null)
        }}
      >
        {saleTarget && (
          <SaleForm
            subscription={saleTarget}
            soldShares={sales
              .filter((sale) => sale.subscriptionId === saleTarget.id)
              .reduce((total, sale) => total + sale.shares, 0)}
            sale={editingSale}
            onSubmit={saveSale}
            onCancel={() => {
              setSaleTarget(null)
              setEditingSale(null)
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="删除申购记录"
        message="该申购及其全部卖出记录将一并删除，统计结果会同步更新。"
        onConfirm={() => {
          if (deleting) deleteSubscription(deleting.id)
          setDeleting(null)
          showNotice('申购记录已删除')
        }}
        onClose={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={Boolean(deletingSale)}
        title="删除卖出记录"
        message="确定删除这条卖出记录吗？收益和剩余持仓会重新计算。"
        onConfirm={() => {
          if (deletingSale) deleteSale(deletingSale.id)
          setDeletingSale(null)
          showNotice('卖出记录已删除')
        }}
        onClose={() => setDeletingSale(null)}
      />
      <ConfirmDialog
        open={batchDeleteOpen}
        title="批量删除申购记录"
        message={`确定删除已选择的 ${selectedIds.length} 条申购记录吗？关联的卖出记录也会一并删除。操作前系统会自动创建快照。`}
        confirmLabel={`确认删除 ${selectedIds.length} 条`}
        onConfirm={() => {
          const count = selectedIds.length
          batchDeleteSubscriptions(selectedIds)
          setBatchDeleteOpen(false)
          setSelectedIds([])
          showNotice(`已批量删除 ${count} 条申购记录，可一键撤销`)
        }}
        onClose={() => setBatchDeleteOpen(false)}
      />
      {notice && (
        <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-[#2E2A24] px-4 py-3 text-sm font-medium text-white shadow-xl">
          {notice}
        </div>
      )}
    </>
  )
}

function BatchAction({
  label,
  icon: Icon,
  primary = false,
  danger = false,
  disabled = false,
  onClick,
}: {
  label: string
  icon?: typeof Trash2
  primary?: boolean
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const style = danger
    ? 'border-[#E8D2CC] bg-[#F9F2F0] text-[#9A7468] hover:bg-[#F0E0DC]'
    : primary
      ? 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700'
      : 'border-[#E4DFD6] bg-white text-[#736A5C] hover:bg-[#F4F1ED]'
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${style}`}
      onClick={onClick}
    >
      {Icon && <Icon size={13} />}
      {label}
    </button>
  )
}

function ParticipationSummary({
  title,
  rows,
  unit,
}: {
  title: string
  rows: { id: string; name: string; count: number }[]
  unit: string
}) {
  return (
    <div className="rounded-2xl border border-[#E4DFD6]/80 bg-white p-5 shadow-card">
      <h2 className="text-sm font-bold text-[#4A4540]">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#A8A296]">暂无数据</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {rows.slice(0, 10).map((row) => (
            <span
              key={row.id}
              className="rounded-lg bg-[#F4F1ED] px-3 py-2 text-xs text-[#736A5C]"
            >
              {row.name}
              <strong className="ml-2 text-[#2E2A24]">
                {row.count} {unit}
              </strong>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
