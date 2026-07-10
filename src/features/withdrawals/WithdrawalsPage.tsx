// ════════════════════════════════════════════════════════════════
// WithdrawalsPage.tsx  —  design-system unified
// ════════════════════════════════════════════════════════════════
import { Landmark, Pencil, Plus, Trash2, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { useAppData } from '../../hooks/useAppData'
import type { Withdrawal, WithdrawalInput } from '../../types/withdrawal'
import { formatAccountName } from '../../utils/account'
import { formatHKD } from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import { WithdrawalForm } from './WithdrawalForm'

const C = { text1: '#4A4540', text2: '#8C8273', text3: '#A8A296', brand: '#B08B7E', danger: '#9A7468', success: '#7E9587', warning: '#BC9A5F', info: '#8E87A6', border: '#E4DFD6', bg: '#F4F1ED' }

export function WithdrawalsPage() {
  const { accounts, withdrawals, addWithdrawal, updateWithdrawal, deleteWithdrawal } = useAppData()
  const [accountFilter, setAccountFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Withdrawal | null>(null)
  const [deleting, setDeleting] = useState<Withdrawal | null>(null)

  const rows = useMemo(() => withdrawals.filter((i) => accountFilter === 'all' || i.accountId === accountFilter).sort((a, b) => b.date.localeCompare(a.date)), [accountFilter, withdrawals])
  const initialDeposit = accounts.reduce((t, a) => t + a.initialDeposit, 0)
  const currentAssets = accounts.reduce((t, a) => t + a.currentAssets, 0)
  const withdrawalTotal = withdrawals.reduce((t, i) => t + i.amount, 0)
  const actualProfit = currentAssets + withdrawalTotal - initialDeposit

  const save = (input: WithdrawalInput) => { if (editing) updateWithdrawal(editing.id, input); else addWithdrawal(input); setEditing(null); setFormOpen(false) }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.text3 }}>资金管理</p>
          <p className="mt-1.5 text-[13px]" style={{ color: C.text2 }}>记录各账户出金，并计算净投入和账户实际收益。</p>
        </div>
        <button type="button" disabled={accounts.length === 0} className="os-button-primary gap-2" onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus size={15} />记录出金
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WdKpi label="净入金" value={formatHKD(initialDeposit, 'investment')} hint="全部账户初始入金" iconBg="#E8D9D3" iconColor={C.brand} icon={<Landmark size={17} />} />
        <WdKpi label="累计净出金" value={formatHKD(withdrawalTotal)} hint={`${withdrawals.length} 条出金记录`} iconBg="#E9E7EE" iconColor={C.info} icon={<WalletCards size={17} />} />
        <WdKpi label="当前净投入" value={formatHKD(initialDeposit - withdrawalTotal, 'investment')} hint="初始入金 - 已出金" iconBg="#F3EAD7" iconColor={C.warning} icon={<Landmark size={17} />} />
        <WdKpi label="实际收益" value={formatHKD(actualProfit, 'profit')} hint="当前资产 + 出金 - 初始入金" iconBg="#E5EBE5" iconColor={C.success} icon={<WalletCards size={17} />} profitVal={actualProfit} />
      </div>

      <div className="mt-6 flex justify-end">
        <select value={accountFilter} className="os-input" style={{ width: 'auto' }} onChange={(e) => setAccountFilter(e.target.value)}>
          <option value="all">全部账户</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{formatAccountName(a)}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-[16px] border" style={{ borderColor: C.border, background: '#FAF8F5', boxShadow: '0 2px 2px rgba(16,24,40,0.04),0 4px 12px rgba(16,24,40,0.06)' }}>
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-[13px]" style={{ color: C.text3 }}>暂无出金记录</p>
        ) : (
          <div className="divide-y" style={{ borderColor: C.border }}>
            {rows.map((w) => {
              const account = accounts.find((a) => a.id === w.accountId)
              return (
                <div key={w.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: C.text1 }}>{account ? formatAccountName(account) : '已删除账户'}</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: C.text3 }}>{w.date} · {w.remarks || '无备注'}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="text-[15px] font-bold" style={{ color: C.text1 }}>{formatHKD(w.amount)}</span>
                    <div className="flex gap-1">
                      <TblBtn onClick={() => { setEditing(w); setFormOpen(true) }}><Pencil size={13} /></TblBtn>
                      <TblBtn danger onClick={() => setDeleting(w)}><Trash2 size={13} /></TblBtn>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <InsightPanel title="资金趋势" eyebrow="TREND" description="净投入、出金和实际收益合并观察。">
          <div className="mt-4 space-y-3">
            <InsightLine label="净入金" value={formatHKD(initialDeposit, 'investment')} />
            <InsightLine label="累计净出金" value={formatHKD(withdrawalTotal)} />
            <InsightLine label="实际收益" value={formatHKD(actualProfit, 'profit')} className={getProfitColor(actualProfit)} />
          </div>
        </InsightPanel>
        <InsightPanel title="最近动态" eyebrow="ACTIVITY" description="最近出金动作，方便快速核对现金流。">
          <div className="mt-4 space-y-3">
            {rows.slice(0, 3).map((item) => {
              const account = accounts.find((entry) => entry.id === item.accountId)
              return (
                <InsightLine
                  key={item.id}
                  label={`${account ? formatAccountName(account) : '已删除账户'} · ${item.date}`}
                  value={formatHKD(item.amount)}
                />
              )
            })}
            {rows.length === 0 && <p className="text-sm font-medium text-[#A8A296]">暂无出金动态</p>}
          </div>
        </InsightPanel>
        <InsightPanel title="AI 建议" eyebrow="AI" description="先保留分析入口，后续接入真实建议。">
          <p className="mt-4 text-sm font-semibold leading-6 text-[#5A5246]">
            当前净投入为 {formatHKD(initialDeposit - withdrawalTotal, 'investment')}，建议年底复盘时与账户资产、汇率损益一起核对。
          </p>
        </InsightPanel>
      </section>

      <Modal open={formOpen} title={editing ? '编辑出金记录' : '记录出金'} fullScreenOnMobile onClose={() => { setFormOpen(false); setEditing(null) }}>
        <WithdrawalForm accounts={accounts} withdrawal={editing} onSubmit={save} onCancel={() => { setFormOpen(false); setEditing(null) }} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="删除出金记录" message="删除后净投入与实际收益会重新计算。"
        onConfirm={() => { if (deleting) deleteWithdrawal(deleting.id); setDeleting(null) }} onClose={() => setDeleting(null)} />
    </>
  )
}

function WdKpi({ label, value, hint, iconBg, iconColor, icon, profitVal }: { label: string; value: string; hint: string; iconBg: string; iconColor: string; icon: React.ReactNode; profitVal?: number }) {
  return (
    <div className="os-card os-card-hover">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium" style={{ color: '#8C8273' }}>{label}</span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: iconBg, color: iconColor }}>{icon}</span>
      </div>
      <p className={`mt-4 text-[clamp(1.3rem,1.6vw,1.75rem)] font-bold leading-none tracking-[-0.04em] tabular-nums ${profitVal !== undefined ? getProfitColor(profitVal) : ''}`}
        style={profitVal === undefined ? { color: '#4A4540' } : {}}>{value}</p>
      <p className="mt-3 text-[12px]" style={{ color: '#A8A296' }}>{hint}</p>
    </div>
  )
}

function TblBtn({ children, danger, onClick }: { children: React.ReactNode; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-[8px] transition ${danger ? 'text-[#A8A296] hover:bg-[#F9F2F0] hover:text-[#F9F2F0]' : 'text-[#A8A296] hover:bg-[#F4F1ED] hover:text-[#5A5246]'}`}>
      {children}
    </button>
  )
}

function InsightPanel({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E4DFD6]/80 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A8A296]">{eyebrow}</p>
      <h2 className="mt-2 text-lg font-bold text-[#2E2A24]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#8C8273]">{description}</p>
      {children}
    </section>
  )
}

function InsightLine({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F4F1ED]/70 px-3 py-2">
      <span className="min-w-0 truncate text-sm font-medium text-[#8C8273]">{label}</span>
      <span className={`shrink-0 whitespace-nowrap text-sm font-bold tabular-nums text-[#4A4540] ${className}`}>{value}</span>
    </div>
  )
}
