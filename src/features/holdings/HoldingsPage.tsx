import { Landmark, Pencil, Plus, Search, Trash2, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { StatCard } from '../../components/ui/StatCard'
import { useAppData } from '../../hooks/useAppData'
import type { Holding, HoldingInput } from '../../types/holding'
import { formatAccountName } from '../../utils/account'
import { formatHKD } from '../../utils/currency'
import { HoldingForm } from './HoldingForm'

export function HoldingsPage() {
  const data = useAppData()
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Holding | null>(null)
  const [deleting, setDeleting] = useState<Holding | null>(null)
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return data.holdings
      .filter((item) => accountFilter === 'all' || item.accountId === accountFilter)
      .filter((item) => {
        const account = data.accounts.find((entry) => entry.id === item.accountId)
        return !query || item.stockName.toLowerCase().includes(query) ||
          item.stockCode.toLowerCase().includes(query) ||
          account?.name.toLowerCase().includes(query) ||
          account?.accountSuffix.includes(query)
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [accountFilter, data.accounts, data.holdings, search])
  const totalMarketValue = rows.reduce((total, item) => total + item.marketValue, 0)
  const totalCollateral = rows.reduce(
    (total, item) => total + item.marketValue * item.collateralRate / 100,
    0,
  )
  const totalCost = rows.reduce((total, item) => total + item.cost, 0)

  const save = (input: HoldingInput) => {
    if (editing) data.updateHolding(editing.id, input)
    else data.addHolding(input)
    setEditing(null)
    setFormOpen(false)
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-end gap-2 flex-wrap">
        <button
          type="button"
          disabled={data.accounts.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() => { setEditing(null); setFormOpen(true) }}
        >
          <Plus size={17} />新增持仓
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="持仓数量" value={String(rows.length)} hint="当前筛选范围" icon={WalletCards} tone="blue" />
        <StatCard label="持仓成本" value={formatHKD(totalCost)} hint="录入成本合计" icon={Landmark} tone="violet" />
        <StatCard label="持仓市值" value={formatHKD(totalMarketValue)} hint="当前市值合计" icon={WalletCards} tone="amber" />
        <StatCard label="可融资额度" value={formatHKD(totalCollateral)} hint="市值 × 抵押率" icon={Landmark} tone="emerald" />
      </section>

      <div className="mt-6 grid gap-3 rounded-2xl border border-[#E4DFD6] bg-white p-4 shadow-card sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A296]" />
          <input value={search} placeholder="搜索股票、账户或后四位" className="focus-ring w-full rounded-xl border border-[#E4DFD6] py-2.5 pl-10 pr-4 text-sm" onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select value={accountFilter} className="rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-2.5 text-sm" onChange={(event) => setAccountFilter(event.target.value)}>
          <option value="all">全部账户</option>
          {data.accounts.map((account) => <option key={account.id} value={account.id}>{formatAccountName(account)}</option>)}
        </select>
      </div>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((holding) => {
          const financing = holding.marketValue * holding.collateralRate / 100
          return (
            <article key={holding.id} className="rounded-2xl border border-[#E4DFD6]/80 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="font-bold text-[#2E2A24]">{holding.stockName}（{holding.stockCode}）</h2></div>
                <div className="flex gap-1">
                  <button type="button" className="grid h-11 w-11 place-items-center rounded-xl text-[#A8A296] hover:bg-[#F4F1ED]" onClick={() => { setEditing(holding); setFormOpen(true) }}><Pencil size={16} /></button>
                  <button type="button" className="grid h-11 w-11 place-items-center rounded-xl text-[#A8A296] hover:bg-[#F9F2F0] hover:text-[#9A7468]" onClick={() => setDeleting(holding)}><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#F4F1ED] p-3 text-sm">
                <Datum label="持仓数量" value={holding.quantity.toLocaleString()} />
                <Datum label="持仓成本" value={formatHKD(holding.cost)} />
                <Datum label="当前市值" value={formatHKD(holding.marketValue)} />
                <Datum label="抵押率" value={`${holding.collateralRate.toFixed(1)}%`} />
              </div>
              <div className="mt-4 flex items-end justify-between"><span className="text-xs text-[#A8A296]">可融资额度</span><strong className="text-xl text-[#2E2A24]">{formatHKD(financing)}</strong></div>
            </article>
          )
        })}
        {rows.length === 0 && <p className="rounded-2xl border border-[#E4DFD6] bg-white px-6 py-16 text-center text-sm text-[#A8A296] md:col-span-2 xl:col-span-3">暂无持仓记录</p>}
      </section>

      <Modal open={formOpen} title={editing ? '编辑持仓' : '新增持仓'} fullScreenOnMobile onClose={() => { setFormOpen(false); setEditing(null) }}>
        <HoldingForm accounts={data.accounts} holding={editing} onSubmit={save} onCancel={() => { setFormOpen(false); setEditing(null) }} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="删除持仓" message="删除后可融资额度会自动重新计算。" onConfirm={() => { if (deleting) data.deleteHolding(deleting.id); setDeleting(null) }} onClose={() => setDeleting(null)} />
    </>
  )
}

function Datum({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] text-[#A8A296]">{label}</p><p className="mt-1 font-semibold text-[#5A5246]">{value}</p></div>
}
