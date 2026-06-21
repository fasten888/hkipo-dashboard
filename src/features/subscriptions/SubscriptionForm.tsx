import { useEffect, useState, type FormEvent } from 'react'
import type { Account } from '../../types/account'
import type { Ipo } from '../../types/ipo'
import type {
  Subscription,
  SubscriptionInput,
  FundingSource,
  SubscriptionMethod,
  SubscriptionStatus,
} from '../../types/subscription'
import { formatAccountName } from '../../utils/account'
import {
  getAccountDefaultSubscriptionMethod,
  getSubscriptionMethod,
  SUBSCRIPTION_METHOD_OPTIONS,
} from '../../utils/subscriptionMethod'
import { FUNDING_SOURCE_OPTIONS } from '../../utils/fundingSource'

export function SubscriptionForm({
  accounts,
  ipos,
  subscription,
  onSubmit,
  onCancel,
}: {
  accounts: Account[]
  ipos: Ipo[]
  subscription?: Subscription | null
  onSubmit: (input: SubscriptionInput) => void
  onCancel: () => void
}) {
  const [accountId, setAccountId] = useState('')
  const [ipoId, setIpoId] = useState('')
  const [method, setMethod] = useState<SubscriptionMethod>('10x')
  const [amount, setAmount] = useState('')
  const [fee, setFee] = useState('100')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState<SubscriptionStatus>('applied')
  const [remarks, setRemarks] = useState('')
  const [fundingSource, setFundingSource] =
    useState<FundingSource>('financing')
  const [error, setError] = useState('')

  useEffect(() => {
    const firstIpo = ipos[0]
    const selectedAccountId =
      subscription?.accountId ?? accounts[0]?.id ?? ''
    const selectedAccount = accounts.find(
      (account) => account.id === selectedAccountId,
    )
    setAccountId(selectedAccountId)
    setIpoId(subscription?.ipoId ?? firstIpo?.id ?? '')
    setMethod(
      subscription
        ? getSubscriptionMethod(subscription, selectedAccount)
        : getAccountDefaultSubscriptionMethod(selectedAccount),
    )
    setAmount(subscription ? String(subscription.subscriptionAmount) : '')
    setFee(subscription ? String(subscription.fee) : '100')
    setDate(
      subscription?.subscriptionDate ?? firstIpo?.subscriptionDate ?? '',
    )
    setStatus(subscription?.status ?? 'applied')
    setRemarks(subscription?.remarks ?? '')
    setFundingSource(
      subscription?.fundingSource ??
        (getSubscriptionMethod(subscription ?? undefined, selectedAccount) === 'cash'
          ? 'cash'
          : 'financing'),
    )
    setError('')
  }, [accounts, ipos, subscription])

  const selectIpo = (value: string) => {
    setIpoId(value)
    if (!subscription) {
      setDate(ipos.find((ipo) => ipo.id === value)?.subscriptionDate ?? '')
    }
  }

  const selectAccount = (value: string) => {
    setAccountId(value)
    if (!subscription) {
      const nextMethod = getAccountDefaultSubscriptionMethod(
          accounts.find((account) => account.id === value),
        )
      setMethod(nextMethod)
      setFundingSource(nextMethod === 'cash' ? 'cash' : 'financing')
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const hasInvalidAmount =
      amount.trim() !== '' &&
      (!Number.isFinite(Number(amount)) || Number(amount) < 0)
    if (
      !accountId ||
      !ipoId ||
      !date ||
      hasInvalidAmount ||
      Number(fee) < 0
    ) {
      setError('请完整填写申购账户、新股和日期，并检查金额及手续费。')
      return
    }
    onSubmit({
      accountId,
      ipoId,
      method,
      subscriptionMethod: method,
      subscriptionAmount: amount.trim() === '' ? 0 : Number(amount),
      fee: Number(fee),
      subscriptionDate: date,
      remarks: remarks.trim(),
      status,
      allottedShares: subscription?.allottedShares ?? 0,
      allottedLots: subscription?.allottedLots ?? 0,
      sellPlan: subscription?.sellPlan ?? 'hold',
      fundingSource,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
        <Select
          label="账户"
          value={accountId}
          options={accounts.map((account) => ({
            value: account.id,
            label: formatAccountName(account),
          }))}
          onChange={selectAccount}
        />
        <Select
          label="新股"
          value={ipoId}
          options={ipos.map((ipo) => ({
            value: ipo.id,
            label: `${ipo.name}（${ipo.stockCode}）`,
          }))}
          onChange={selectIpo}
        />
        <Select
          label="申购方式"
          value={method}
          options={SUBSCRIPTION_METHOD_OPTIONS}
          onChange={(value) => setMethod(value as SubscriptionMethod)}
        />
        <Select
          label="资金来源"
          value={fundingSource}
          options={FUNDING_SOURCE_OPTIONS}
          onChange={(value) => setFundingSource(value as FundingSource)}
        />
        <Input
          label="申购日期"
          value={date}
          type="date"
          onChange={setDate}
        />
        <Input
          label="申购金额（选填）"
          value={amount}
          prefix="HK$"
          onChange={setAmount}
        />
        <Input
          label="手续费"
          value={fee}
          prefix="HK$"
          onChange={setFee}
        />
        <Select
          label="状态"
          value={status}
          options={[
            { value: 'applied', label: '已申购' },
            { value: 'announced', label: '已公布' },
            { value: 'won', label: '已中签' },
            { value: 'lost', label: '未中签' },
          ]}
          onChange={(value) => setStatus(value as SubscriptionStatus)}
        />
        <div />
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
        submitLabel={subscription ? '保存记录' : '创建申购记录'}
        onCancel={onCancel}
      />
    </form>
  )
}

function Input({
  label,
  value,
  prefix,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  prefix?: string
  type?: 'text' | 'date'
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <div className="relative">
        {prefix && (
          <span className="absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          inputMode={type === 'date' ? undefined : 'decimal'}
          className={`focus-ring w-full rounded-xl border border-slate-200 py-3 text-sm ${
            prefix ? 'pl-12 pr-3.5' : 'px-3.5'
          }`}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function FormActions({
  submitLabel,
  onCancel,
}: {
  submitLabel: string
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
      <button
        type="button"
        className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
        onClick={onCancel}
      >
        取消
      </button>
      <button
        type="submit"
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
      >
        {submitLabel}
      </button>
    </div>
  )
}
