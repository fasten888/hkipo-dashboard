import { Landmark, Pencil, Plus, Trash2, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { StatCard } from '../../components/ui/StatCard'
import { useAppData } from '../../hooks/useAppData'
import type {
  Withdrawal,
  WithdrawalInput,
} from '../../types/withdrawal'
import { formatAccountName } from '../../utils/account'
import { formatHKD } from '../../utils/currency'
import { WithdrawalForm } from './WithdrawalForm'

export function WithdrawalsPage() {
  const {
    accounts,
    withdrawals,
    addWithdrawal,
    updateWithdrawal,
    deleteWithdrawal,
  } = useAppData()
  const [accountFilter, setAccountFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Withdrawal | null>(null)
  const [deleting, setDeleting] = useState<Withdrawal | null>(null)

  const rows = useMemo(
    () =>
      withdrawals
        .filter(
          (item) =>
            accountFilter === 'all' || item.accountId === accountFilter,
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [accountFilter, withdrawals],
  )
  const initialDeposit = accounts.reduce(
    (total, account) => total + account.initialDeposit,
    0,
  )
  const currentAssets = accounts.reduce(
    (total, account) => total + account.currentAssets,
    0,
  )
  const withdrawalTotal = withdrawals.reduce(
    (total, item) => total + item.amount,
    0,
  )
  const actualProfit = currentAssets + withdrawalTotal - initialDeposit

  const save = (input: WithdrawalInput) => {
    if (editing) updateWithdrawal(editing.id, input)
    else addWithdrawal(input)
    setEditing(null)
    setFormOpen(false)
  }

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            V1 · 资金管理
          </div>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            出金管理
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            记录各账户出金，并计算净投入和账户实际收益。
          </p>
        </div>
        <button
          type="button"
          disabled={accounts.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus size={17} />
          记录出金
        </button>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="净入金"
          value={formatHKD(initialDeposit, 'investment')}
          hint="全部账户初始入金"
          icon={Landmark}
          tone="blue"
        />
        <StatCard
          label="累计净出金"
          value={formatHKD(withdrawalTotal)}
          hint={`${withdrawals.length} 条出金记录`}
          icon={WalletCards}
          tone="violet"
        />
        <StatCard
          label="当前净投入"
          value={formatHKD(
            initialDeposit - withdrawalTotal,
            'investment',
          )}
          hint="初始入金 - 已出金"
          icon={Landmark}
          tone="amber"
        />
        <StatCard
          label="实际收益"
          value={formatHKD(actualProfit, 'profit')}
          hint="当前资产 + 出金 - 初始入金"
          icon={WalletCards}
          tone="emerald"
          profitValue={actualProfit}
        />
      </section>

      <div className="mt-8 flex justify-end">
        <select
          value={accountFilter}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-600"
          onChange={(event) => setAccountFilter(event.target.value)}
        >
          <option value="all">全部账户</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {formatAccountName(account)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-slate-400">
            暂无出金记录
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((withdrawal) => {
              const account = accounts.find(
                (item) => item.id === withdrawal.accountId,
              )
              return (
                <div
                  key={withdrawal.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {account ? formatAccountName(account) : '已删除账户'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {withdrawal.date} · {withdrawal.remarks || '无备注'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="text-base font-bold text-slate-800">
                      {formatHKD(withdrawal.amount)}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                      onClick={() => {
                        setEditing(withdrawal)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setDeleting(withdrawal)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        title={editing ? '编辑出金记录' : '记录出金'}
        fullScreenOnMobile
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      >
        <WithdrawalForm
          accounts={accounts}
          withdrawal={editing}
          onSubmit={save}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="删除出金记录"
        message="删除后净投入与实际收益会重新计算。"
        onConfirm={() => {
          if (deleting) deleteWithdrawal(deleting.id)
          setDeleting(null)
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}
