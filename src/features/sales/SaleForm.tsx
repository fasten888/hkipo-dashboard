import { useEffect, useState, type FormEvent } from 'react'
import type { Sale, SaleInput, SaleMethod } from '../../types/sale'
import type { Subscription } from '../../types/subscription'
import { FormActions } from '../subscriptions/SubscriptionForm'

export function SaleForm({
  subscription,
  soldShares,
  sale,
  onSubmit,
  onCancel,
}: {
  subscription: Subscription
  soldShares: number
  sale?: Sale | null
  onSubmit: (input: SaleInput) => void
  onCancel: () => void
}) {
  const [price, setPrice] = useState('')
  const [date, setDate] = useState('')
  const [shares, setShares] = useState('')
  const [method, setMethod] = useState<SaleMethod>('grey_market')
  const [remarks, setRemarks] = useState('')
  const [commission, setCommission] = useState('')
  const [error, setError] = useState('')
  const availableShares =
    subscription.allottedShares - soldShares + (sale?.shares ?? 0)

  useEffect(() => {
    setPrice(sale ? String(sale.price) : '')
    setDate(sale?.date ?? '')
    setShares(sale ? String(sale.shares) : '')
    setMethod(sale?.method ?? 'grey_market')
    setRemarks(sale?.remarks ?? '')
    setCommission(sale ? String(sale.commission ?? 0) : '')
    setError('')
  }, [sale])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const numericPrice = Number(price)
    const numericShares = Number(shares)
    const numericCommission = commission.trim() ? Number(commission) : 0
    if (
      numericPrice <= 0 ||
      !date ||
      !Number.isInteger(numericShares) ||
      numericShares <= 0 ||
      numericShares > availableShares ||
      !Number.isFinite(numericCommission) ||
      numericCommission < 0
    ) {
      setError(
        `请输入有效卖出信息和非负佣金，可卖股数为 ${availableShares} 股。`,
      )
      return
    }
    onSubmit({
      subscriptionId: subscription.id,
      price: numericPrice,
      date,
      shares: numericShares,
      method,
      commission: numericCommission,
      remarks: remarks.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
        <Field
          label="卖出价格"
          value={price}
          prefix="HK$"
          inputMode="decimal"
          autoFocus
          onChange={setPrice}
        />
        <Field label="卖出日期" value={date} type="date" onChange={setDate} />
        <Field
          label={`卖出股数（可卖 ${availableShares} 股）`}
          value={shares}
          inputMode="numeric"
          onChange={(value) => setShares(value.replace(/\D/g, ''))}
        />
        <label>
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            卖出方式
          </span>
          <select
            value={method}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"
            onChange={(event) => setMethod(event.target.value as SaleMethod)}
          >
            <option value="grey_market">暗盘卖出</option>
            <option value="first_day">首日卖出</option>
            <option value="held_sale">持有后卖出</option>
          </select>
        </label>
        <Field
          label="卖出佣金"
          value={commission}
          prefix="HK$"
          placeholder="请输入券商实际收取金额"
          inputMode="decimal"
          onChange={setCommission}
        />
        <p className="-mt-3 text-xs text-slate-400 sm:col-span-2">
          佣金会计入卖出成本，并从单笔收益、累计收益及收益率中自动扣除。
        </p>
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            备注
          </span>
          <textarea
            value={remarks}
            rows={2}
            className="focus-ring w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm"
            onChange={(event) => setRemarks(event.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </div>
      <FormActions submitLabel={sale ? '保存卖出' : '添加卖出'} onCancel={onCancel} />
    </form>
  )
}

function Field({
  label,
  value,
  prefix,
  type = 'text',
  inputMode,
  placeholder,
  autoFocus = false,
  onChange,
}: {
  label: string
  value: string
  prefix?: string
  type?: 'text' | 'date'
  inputMode?: 'decimal' | 'numeric'
  placeholder?: string
  autoFocus?: boolean
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
          inputMode={type === 'date' ? undefined : inputMode}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`focus-ring w-full rounded-xl border border-slate-200 py-3 text-sm ${
            prefix ? 'pl-12 pr-3.5' : 'px-3.5'
          }`}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  )
}
