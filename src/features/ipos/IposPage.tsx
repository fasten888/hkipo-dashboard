import { Eye, Pencil, Plus, Rocket, Search, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { SortButton } from '../../components/ui/SortButton'
import {
  compareValues,
  useThreeStateSort,
} from '../../hooks/useThreeStateSort'
import { useAppData } from '../../hooks/useAppData'
import type { Ipo, IpoInput } from '../../types/ipo'
import { formatHKD, formatPercent } from '../../utils/currency'
import { COMMON_INDUSTRIES } from '../../utils/industry'
import { getProfitColor } from '../../utils/profit'
import { getIpoStats } from '../../utils/statistics'
import { IpoBatchForm } from './IpoBatchForm'
import { IpoForm } from './IpoForm'

type IpoSortKey =
  | 'name'
  | 'subscriptionDate'
  | 'profit'
  | 'profitRate'
  | 'winRate'
  | 'participants'

export function IposPage({
  onViewIpo,
}: {
  onViewIpo?: (ipoId: string) => void
}) {
  const {
    ipos,
    subscriptions,
    sales,
    addIpos,
    updateIpo,
    deleteIpo,
  } = useAppData()
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('all')
  const { sort, toggleSort } = useThreeStateSort<IpoSortKey>('ipos')
  const [formOpen, setFormOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [editing, setEditing] = useState<Ipo | null>(null)
  const [deleting, setDeleting] = useState<Ipo | null>(null)
  const [notice, setNotice] = useState('')
  const timer = useRef<number>()
  const industries = useMemo(
    () =>
      [
        ...new Set([
          ...COMMON_INDUSTRIES,
          ...ipos.map((ipo) => ipo.industry.trim()).filter(Boolean),
        ]),
      ],
    [ipos],
  )

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return ipos
      .map((ipo) => ({
        ipo,
        stats: getIpoStats(ipo, subscriptions, sales),
      }))
      .filter(
        ({ ipo }) =>
          (industryFilter === 'all' ||
            ipo.industry
              .split(/[、,，/]/)
              .map((item) => item.trim())
              .includes(industryFilter)) &&
          (!query ||
            ipo.name.toLowerCase().includes(query) ||
            ipo.stockCode.toLowerCase().includes(query) ||
            ipo.industry.toLowerCase().includes(query)),
      )
      .sort((a, b) => {
        if (!sort) return b.ipo.createdAt.localeCompare(a.ipo.createdAt)
        const values = {
          name: [a.ipo.name, b.ipo.name],
          subscriptionDate: [
            a.ipo.subscriptionDate,
            b.ipo.subscriptionDate,
          ],
          profit: [a.stats.totalProfit, b.stats.totalProfit],
          profitRate: [a.stats.profitRate, b.stats.profitRate],
          winRate: [a.stats.winRate, b.stats.winRate],
          participants: [
            a.stats.participantCount,
            b.stats.participantCount,
          ],
        }[sort.key]
        const compared = compareValues(values[0], values[1])
        return sort.direction === 'asc' ? compared : -compared
      })
  }, [industryFilter, ipos, sales, search, sort, subscriptions])

  const showNotice = (message: string) => {
    window.clearTimeout(timer.current)
    setNotice(message)
    timer.current = window.setTimeout(() => setNotice(''), 2200)
  }

  const saveIpo = (input: IpoInput) => {
    if (editing) {
      updateIpo(editing.id, input)
      showNotice('新股资料已更新')
    } else {
      addIpos([input])
      showNotice('新股资料已创建')
    }
    setEditing(null)
    setFormOpen(false)
  }

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            V1 · 基础资料
          </div>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            新股资料
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            维护新股发行资料，并查看参与账户、中签和收益表现。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
            onClick={() => setBatchOpen(true)}
          >
            批量录入
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus size={17} />
            新增新股
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            placeholder="搜索新股名称、股票代码或行业"
            className="focus-ring w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          value={industryFilter}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-600"
          onChange={(event) => setIndustryFilter(event.target.value)}
        >
          <option value="all">全部行业</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-card">
          <Rocket size={28} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm text-slate-400">暂无匹配的新股资料</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="divide-y divide-slate-100 md:hidden">
            {rows.map(({ ipo, stats }) => (
              <article
                key={ipo.id}
                className="p-4"
                onClick={() => onViewIpo?.(ipo.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-base font-bold text-slate-900">
                      {ipo.name}（{ipo.stockCode}）
                    </h2>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      {ipo.industry || '未填写行业'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"
                      aria-label="编辑新股"
                      onClick={(event) => {
                        event.stopPropagation()
                        setEditing(ipo)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      type="button"
                      className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="删除新股"
                      onClick={(event) => {
                        event.stopPropagation()
                        setDeleting(ipo)
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <MobileDatum label="发行价" value={formatHKD(ipo.issuePrice)} />
                  <MobileDatum label="一手股数" value={`${ipo.lotSize} 股`} />
                  <MobileDatum label="参与账户" value={`${stats.participantCount} 个`} />
                  <MobileDatum
                    label="中签"
                    value={`${stats.winnerCount} 个 · ${formatPercent(stats.winRate)}`}
                  />
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div className="text-xs leading-5 text-slate-400">
                    <p>申购 {ipo.subscriptionDate}</p>
                    <p>上市 {ipo.listingDate}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getProfitColor(stats.totalProfit)}`}>
                      {formatHKD(stats.totalProfit, 'profit')}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${getProfitColor(stats.profitRate)}`}>
                      {formatPercent(stats.profitRate, 'profitRate')}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px]">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <IpoSortHead label="新股" sortKey="name" sort={sort} onSort={toggleSort} />
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">发行资料</th>
                  <IpoSortHead label="申购 / 上市" sortKey="subscriptionDate" sort={sort} onSort={toggleSort} />
                  <IpoSortHead label="参与账户" sortKey="participants" sort={sort} onSort={toggleSort} />
                  <IpoSortHead label="中签账户" sortKey="winRate" sort={sort} onSort={toggleSort} />
                  <IpoSortHead label="总收益" sortKey="profit" sort={sort} onSort={toggleSort} />
                  <IpoSortHead label="收益率" sortKey="profitRate" sort={sort} onSort={toggleSort} />
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ ipo, stats }) => (
                  <tr
                    key={ipo.id}
                    className="cursor-pointer hover:bg-slate-50/70"
                    onClick={() => onViewIpo?.(ipo.id)}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-900">
                        {ipo.name}（{ipo.stockCode}）
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-400">
                        {ipo.industry || '未填写行业'}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatHKD(ipo.issuePrice)} · {ipo.lotSize} 股/手
                    </td>
                    <td className="px-5 py-4 text-xs leading-5 text-slate-500">
                      <p>申购 {ipo.subscriptionDate}</p>
                      <p>上市 {ipo.listingDate}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {stats.participantCount}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {stats.winnerCount}
                      <span className="ml-1 text-xs text-slate-400">
                        ({formatPercent(stats.winRate)})
                      </span>
                    </td>
                    <td
                      className={`px-5 py-4 text-sm font-semibold ${getProfitColor(
                        stats.totalProfit,
                      )}`}
                    >
                      {formatHKD(stats.totalProfit, 'profit')}
                    </td>
                    <td
                      className={`px-5 py-4 text-sm ${getProfitColor(
                        stats.profitRate,
                      )}`}
                    >
                      {formatPercent(stats.profitRate, 'profitRate')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-700"
                          aria-label="查看新股详情"
                          onClick={(event) => {
                            event.stopPropagation()
                            onViewIpo?.(ipo.id)
                          }}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={(event) => {
                            event.stopPropagation()
                            setEditing(ipo)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={(event) => {
                            event.stopPropagation()
                            setDeleting(ipo)
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={formOpen}
        title={editing ? '编辑新股资料' : '新增新股'}
        fullScreenOnMobile
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      >
        <IpoForm
          ipo={editing}
          onSubmit={saveIpo}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      </Modal>
      <Modal
        open={batchOpen}
        title="批量录入新股"
        description="一次可添加多只新股。"
        fullScreenOnMobile
        onClose={() => setBatchOpen(false)}
      >
        <IpoBatchForm
          onSubmit={(inputs) => {
            addIpos(inputs)
            setBatchOpen(false)
            showNotice(`已添加 ${inputs.length} 只新股`)
          }}
          onCancel={() => setBatchOpen(false)}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="删除新股"
        message={`删除“${deleting?.name ?? ''}”会同时删除关联申购和卖出记录。`}
        onConfirm={() => {
          if (deleting) deleteIpo(deleting.id)
          setDeleting(null)
          showNotice('新股及关联记录已删除')
        }}
        onClose={() => setDeleting(null)}
      />
      {notice && (
        <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">
          {notice}
        </div>
      )}
    </>
  )
}

function MobileDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-700">{value}</p>
    </div>
  )
}

function IpoSortHead({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: IpoSortKey
  sort: ReturnType<typeof useThreeStateSort<IpoSortKey>>['sort']
  onSort: (key: IpoSortKey) => void
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
