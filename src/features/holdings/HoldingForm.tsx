import { useEffect, useState, type FormEvent } from 'react'
import type { Account } from '../../types/account'
import type { Holding, HoldingInput } from '../../types/holding'
import { formatAccountName } from '../../utils/account'
import { FormActions } from '../subscriptions/SubscriptionForm'

export function HoldingForm({
  accounts,
  holding,
  onSubmit,
  onCancel,
}: {
  accounts: Account[]
  holding?: Holding | null
  onSubmit: (input: HoldingInput) => void
  onCancel: () => void
}) {
  const [accountId, setAccountId] = useState('')
  const [stockCode, setStockCode] = useState('')
  const [stockName, setStockName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [cost, setCost] = useState('')
  const [marketValue, setMarketValue] = useState('')
  const [collateralRate, setCollateralRate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setAccountId(holding?.accountId ?? accounts[0]?.id ?? '')
    setStockCode(holding?.stockCode ?? '')
    setStockName(holding?.stockName ?? '')
    setQuantity(holding ? String(holding.quantity) : '')
    setCost(holding ? String(holding.cost) : '')
    setMarketValue(holding ? String(holding.marketValue) : '')
    setCollateralRate(holding ? String(holding.collateralRate) : '')
    setRemarks(holding?.remarks ?? '')
    setError('')
  }, [accounts, holding])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = [quantity, cost, marketValue, collateralRate].map(Number)
    if (
      !accountId ||
      !stockCode.trim() ||
      !stockName.trim() ||
      values.some((value) => !Number.isFinite(value) || value < 0) ||
      values[3] > 100
    ) {
      setError('请填写完整持仓信息，抵押率需在 0% 至 100% 之间。')
      return
    }
    onSubmit({
      accountId,
      stockCode: stockCode.trim(),
      stockName: stockName.trim(),
      quantity: values[0],
      cost: values[1],
      marketValue: values[2],
      collateralRate: values[3],
      remarks: remarks.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
        <label>
          <Label>账户</Label>
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
        <Field label="股票代码" value={stockCode} onChange={setStockCode} />
        <Field label="股票名称" value={stockName} onChange={setStockName} />
        <Field label="持仓数量" value={quantity} onChange={setQuantity} numeric />
        <Field label="持仓成本" value={cost} prefix="HK$" onChange={setCost} numeric />
        <Field label="当前市值" value={marketValue} prefix="HK$" onChange={setMarketValue} numeric />
        <Field label="抵押率" value={collateralRate} suffix="%" onChange={setCollateralRate} numeric />
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-400">可融资额度</p>
          <p className="mt-1 text-lg font-bold text-slate-800">
            HK${' '}
            {(
              (Number(marketValue) || 0) *
              ((Number(collateralRate) || 0) / 100)
            ).toLocaleString('zh-HK', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <label className="sm:col-span-2">
          <Label>备注</Label>
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
        submitLabel={holding ? '保存持仓' : '新增持仓'}
        onCancel={onCancel}
      />
    </form>
  )
}

function Label({ children }: { children: string }) {
  return <span className="mb-2 block text-sm font-semibold text-slate-700">{children}</span>
}

function Field({
  label,
  value,
  prefix,
  suffix,
  numeric = false,
  onChange,
}: {
  label: string
  value: string
  prefix?: string
  suffix?: string
  numeric?: boolean
  onChange: (value: string) => void
}) {
  return (
    <label>
      <Label>{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">{prefix}</span>}
        <input
          value={value}
          inputMode={numeric ? 'decimal' : 'text'}
          className={`focus-ring w-full rounded-xl border border-slate-200 py-3 text-sm ${
            prefix ? 'pl-12' : 'pl-3.5'
          } ${suffix ? 'pr-10' : 'pr-3.5'}`}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix && <span className="absolute inset-y-0 right-3.5 flex items-center text-sm text-slate-400">{suffix}</span>}
      </div>
    </label>
  )
}
