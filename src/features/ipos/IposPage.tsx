import { Eye, Pencil, Plus, Rocket, Search, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { SortButton } from '../../components/ui/SortButton'
import { compareValues, useThreeStateSort, type SortState } from '../../hooks/useThreeStateSort'
import { useAppData } from '../../hooks/useAppData'
import type { Ipo, IpoInput } from '../../types/ipo'
import { formatHKD, formatPercent } from '../../utils/currency'
import { COMMON_INDUSTRIES } from '../../utils/industry'
import { getProfitColor } from '../../utils/profit'
import { getIpoStats } from '../../utils/statistics'
import { IpoBatchForm } from './IpoBatchForm'
import { IpoForm } from './IpoForm'

type IpoSortKey = 'name' | 'subscriptionDate' | 'profit' | 'profitRate' | 'winRate' | 'participants'
const C = { text1: '#111827', text2: '#6B7280', text3: '#9CA3AF', brand: '#2563EB', danger: '#EF4444', border: '#EEF2F7', bg: '#F8FAFC' }

export function IposPage({ onViewIpo }: { onViewIpo?: (ipoId: string) => void }) {
  const { ipos, subscriptions, sales, addIpos, updateIpo, deleteIpo } = useAppData()
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
    () => [...new Set([...COMMON_INDUSTRIES, ...ipos.map((i) => i.industry.trim()).filter(Boolean)])],
    [ipos],
  )

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return ipos
      .map((ipo) => ({ ipo, stats: getIpoStats(ipo, subscriptions, sales) }))
      .filter(({ ipo }) =>
        (industryFilter === 'all' || ipo.industry.split(/[、,，/]/).map((s) => s.trim()).includes(industryFilter)) &&
        (!query || ipo.name.toLowerCase().includes(query) || ipo.stockCode.toLowerCase().includes(query) || ipo.industry.toLowerCase().includes(query))
      )
      .sort((a, b) => {
        if (!sort) return b.ipo.createdAt.localeCompare(a.ipo.createdAt)
        const vals = { name: [a.ipo.name, b.ipo.name], subscriptionDate: [a.ipo.subscriptionDate, b.ipo.subscriptionDate], profit: [a.stats.totalProfit, b.stats.totalProfit], profitRate: [a.stats.profitRate, b.stats.profitRate], winRate: [a.stats.winRate, b.stats.winRate], participants: [a.stats.participantCount, b.stats.participantCount] }[sort.key]
        const c = compareValues(vals[0], vals[1])
        return sort.direction === 'asc' ? c : -c
      })
  }, [industryFilter, ipos, sales, search, sort, subscriptions])

  const showNotice = (msg: string) => { window.clearTimeout(timer.current); setNotice(msg); timer.current = window.setTimeout(() => setNotice(''), 2200) }
  const saveIpo = (input: IpoInput) => {
    if (editing) { updateIpo(editing.id, input); showNotice('新股资料已更新') }
    else { addIpos([input]); showNotice('新股资料已创建') }
    setEditing(null); setFormOpen(false)
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.text3 }}>基础资料</p>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]" style={{ color: C.text1 }}>新股资料</h1>
          <p className="mt-1.5 text-[13px]" style={{ color: C.text2 }}>维护新股发行资料，并查看参与账户、中签和收益表现。</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="os-button-secondary" onClick={() => setBatchOpen(true)}>批量录入</button>
          <button type="button" className="os-button-primary gap-2" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={15} />新增新股
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="os-card mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.text3 }} />
          <input value={search} placeholder="搜索新股名称、股票代码或行业" className="os-input w-full pl-9"
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={industryFilter} className="os-input" onChange={(e) => setIndustryFilter(e.target.value)}>
          <option value="all">全部行业</option>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      {/* ── Table ── */}
      {rows.length === 0 ? (
        <div className="os-card mt-4 py-16 text-center">
          <Rocket size={24} className="mx-auto" style={{ color: C.text3 }} />
          <p className="mt-4 text-[13px]" style={{ color: C.text3 }}>暂无匹配的新股资料</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[16px] border" style={{ borderColor: C.border, background: '#fff', boxShadow: '0 2px 2px rgba(16,24,40,0.04),0 4px 12px rgba(16,24,40,0.06)' }}>
          {/* Mobile cards */}
          <div className="divide-y md:hidden" style={{ borderColor: C.border }}>
            {rows.map(({ ipo, stats }) => (
              <article key={ipo.id} className="p-4" onClick={() => onViewIpo?.(ipo.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-[14px] font-semibold" style={{ color: C.text1 }}>{ipo.name}（{ipo.stockCode}）</h2>
                    <p className="mt-0.5 text-[11px]" style={{ color: C.text3 }}>{ipo.industry || '未填写行业'}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <ActionBtn onClick={(e) => { e.stopPropagation(); setEditing(ipo); setFormOpen(true) }}><Pencil size={14} /></ActionBtn>
                    <ActionBtn danger onClick={(e) => { e.stopPropagation(); setDeleting(ipo) }}><Trash2 size={14} /></ActionBtn>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-[10px] p-3 text-[12px]" style={{ background: C.bg }}>
                  <MobileDatum label="发行价" value={formatHKD(ipo.issuePrice)} />
                  <MobileDatum label="一手股数" value={`${ipo.lotSize} 股`} />
                  <MobileDatum label="参与账户" value={`${stats.participantCount} 个`} />
                  <MobileDatum label="中签" value={`${stats.winnerCount} 个 · ${formatPercent(stats.winRate)}`} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div className="text-[11px] leading-5" style={{ color: C.text3 }}>
                    <p>申购 {ipo.subscriptionDate}</p>
                    <p>上市 {ipo.listingDate}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[16px] font-bold ${getProfitColor(stats.totalProfit)}`}>{formatHKD(stats.totalProfit, 'profit')}</p>
                    <p className={`mt-0.5 text-[11px] font-semibold ${getProfitColor(stats.profitRate)}`}>{formatPercent(stats.profitRate, 'profitRate')}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px]">
              <thead style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                <tr>
                  <SortTh label="新股" sortKey="name" sort={sort} onSort={toggleSort} />
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold" style={{ color: C.text2 }}>发行资料</th>
                  <SortTh label="申购 / 上市" sortKey="subscriptionDate" sort={sort} onSort={toggleSort} />
                  <SortTh label="参与账户" sortKey="participants" sort={sort} onSort={toggleSort} />
                  <SortTh label="中签账户" sortKey="winRate" sort={sort} onSort={toggleSort} />
                  <SortTh label="总收益" sortKey="profit" sort={sort} onSort={toggleSort} />
                  <SortTh label="收益率" sortKey="profitRate" sort={sort} onSort={toggleSort} />
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: C.border }}>
                {rows.map(({ ipo, stats }) => (
                  <tr key={ipo.id} className="cursor-pointer transition hover:bg-[#F8FAFC]" onClick={() => onViewIpo?.(ipo.id)}>
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-semibold" style={{ color: C.text1 }}>{ipo.name}（{ipo.stockCode}）</p>
                      <p className="mt-0.5 text-[11px]" style={{ color: C.text3 }}>{ipo.industry || '未填写行业'}</p>
                    </td>
                    <td className="px-5 py-4 text-[13px]" style={{ color: C.text2 }}>{formatHKD(ipo.issuePrice)} · {ipo.lotSize} 股/手</td>
                    <td className="px-5 py-4 text-[11px] leading-5" style={{ color: C.text2 }}>
                      <p>申购 {ipo.subscriptionDate}</p><p>上市 {ipo.listingDate}</p>
                    </td>
                    <td className="px-5 py-4 text-[13px]" style={{ color: C.text2 }}>{stats.participantCount}</td>
                    <td className="px-5 py-4 text-[13px]" style={{ color: C.text2 }}>
                      {stats.winnerCount}<span className="ml-1 text-[11px]" style={{ color: C.text3 }}>({formatPercent(stats.winRate)})</span>
                    </td>
                    <td className={`px-5 py-4 text-[13px] font-semibold ${getProfitColor(stats.totalProfit)}`}>{formatHKD(stats.totalProfit, 'profit')}</td>
                    <td className={`px-5 py-4 text-[13px] ${getProfitColor(stats.profitRate)}`}>{formatPercent(stats.profitRate, 'profitRate')}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <ActionBtn onClick={(e) => { e.stopPropagation(); onViewIpo?.(ipo.id) }}><Eye size={14} /></ActionBtn>
                        <ActionBtn onClick={(e) => { e.stopPropagation(); setEditing(ipo); setFormOpen(true) }}><Pencil size={14} /></ActionBtn>
                        <ActionBtn danger onClick={(e) => { e.stopPropagation(); setDeleting(ipo) }}><Trash2 size={14} /></ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={formOpen} title={editing ? '编辑新股资料' : '新增新股'} fullScreenOnMobile onClose={() => { setFormOpen(false); setEditing(null) }}>
        <IpoForm ipo={editing} onSubmit={saveIpo} onCancel={() => { setFormOpen(false); setEditing(null) }} />
      </Modal>
      <Modal open={batchOpen} title="批量录入新股" description="一次可添加多只新股。" fullScreenOnMobile onClose={() => setBatchOpen(false)}>
        <IpoBatchForm onSubmit={(inputs) => { addIpos(inputs); setBatchOpen(false); showNotice(`已添加 ${inputs.length} 只新股`) }} onCancel={() => setBatchOpen(false)} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="删除新股" message={`删除"${deleting?.name ?? ''}"会同时删除关联申购和卖出记录。`}
        onConfirm={() => { if (deleting) deleteIpo(deleting.id); setDeleting(null); showNotice('新股及关联记录已删除') }}
        onClose={() => setDeleting(null)} />
      {notice && <Toast>{notice}</Toast>}
    </>
  )
}

function MobileDatum({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px]" style={{ color: '#9CA3AF' }}>{label}</p><p className="mt-0.5 break-words text-[12px] font-semibold" style={{ color: '#374151' }}>{value}</p></div>
}

function SortTh({ label, sortKey, sort, onSort }: { label: string; sortKey: IpoSortKey; sort: SortState<IpoSortKey> | null; onSort: (k: IpoSortKey) => void }) {
  return (
    <th className="px-5 py-3.5 text-left text-[11px]">
      <SortButton label={label} direction={sort?.key === sortKey ? sort.direction : undefined} onClick={() => onSort(sortKey)} />
    </th>
  )
}

function ActionBtn({ children, danger, onClick }: { children: React.ReactNode; danger?: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-[8px] transition ${danger ? 'text-[#9CA3AF] hover:bg-red-50 hover:text-red-500' : 'text-[#9CA3AF] hover:bg-[#F8FAFC] hover:text-[#374151]'}`}>
      {children}
    </button>
  )
}

function Toast({ children }: { children: React.ReactNode }) {
  return <div role="status" className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-[10px] px-4 py-3 text-[13px] font-medium text-white shadow-xl" style={{ background: '#111827' }}>{children}</div>
}
