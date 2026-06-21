import { useEffect, useState, type FormEvent } from 'react'
import type { Account } from '../../types/account'
import type {
  Withdrawal,
  WithdrawalInput,
} from '../../types/withdrawal'
import { formatAccountName } from '../../utils/account'
import { FormActions } from '../subscriptions/SubscriptionForm'

export function WithdrawalForm({
  accounts,
  withdrawal,
  onSubmit,
  onCancel,
}: {
  accounts: Account[]
  withdrawal?: Withdrawal | null
  onSubmit: (input: WithdrawalInput) => void
  onCancel: () => void
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setAccountId(withdrawal?.accountId ?? accounts[0]?.id ?? '')
    setDate(withdrawal?.date ?? '')
    setAmount(withdrawal ? String(withdrawal.amount) : '')
    setRemarks(withdrawal?.remarks ?? '')
    setError('')
  }, [accounts, withdrawal])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accountId || !date || Number(amount) <= 0) {
      setError('请选择账户，并填写有效日期和金额。')
      return
    }
    onSubmit({
      accountId,
      date,
      amount: Number(amount),
      remarks: remarks.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
        <label>
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            账户
          </span>
          <select
            value={accountId}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"
            onChange={(event) => setAccountId(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {formatAccountName(account)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            日期
          </span>
          <input
            type="date"
            value={date}
            className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm"
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            出金金额
          </span>
          <div className="relative">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">
              HK$
            </span>
            <input
              value={amount}
              inputMode="decimal"
              className="focus-ring w-full rounded-xl border border-slate-200 py-3 pl-12 pr-3.5 text-sm"
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
        </label>
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            备注
          </span>
          <textarea
            value={remarks}
            rows={3}
            className="focus-ring w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm"
            onChange={(event) => setRemarks(event.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </div>
      <FormActions
        submitLabel={withdrawal ? '保存出金' : '记录出金'}
        onCancel={onCancel}
      />
    </form>
  )
}
