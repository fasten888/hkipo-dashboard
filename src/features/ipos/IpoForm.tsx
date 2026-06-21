import { useEffect, useState, type FormEvent } from 'react'
import type { Ipo, IpoInput } from '../../types/ipo'
import { FormActions } from '../subscriptions/SubscriptionForm'

export function IpoForm({
  ipo,
  onSubmit,
  onCancel,
}: {
  ipo?: Ipo | null
  onSubmit: (input: IpoInput) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [stockCode, setStockCode] = useState('')
  const [issuePrice, setIssuePrice] = useState('')
  const [lotSize, setLotSize] = useState('')
  const [subscriptionDate, setSubscriptionDate] = useState('')
  const [listingDate, setListingDate] = useState('')
  const [industry, setIndustry] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setName(ipo?.name ?? '')
    setStockCode(ipo?.stockCode ?? '')
    setIssuePrice(ipo ? String(ipo.issuePrice) : '')
    setLotSize(ipo ? String(ipo.lotSize) : '')
    setSubscriptionDate(ipo?.subscriptionDate ?? '')
    setListingDate(ipo?.listingDate ?? '')
    setIndustry(ipo?.industry ?? '')
    setError('')
  }, [ipo])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      !name.trim() ||
      !stockCode.trim() ||
      Number(issuePrice) <= 0 ||
      !Number.isInteger(Number(lotSize)) ||
      Number(lotSize) <= 0 ||
      !subscriptionDate ||
      !listingDate ||
      listingDate < subscriptionDate
    ) {
      setError('请完整填写资料，并确保上市日期不早于申购日期。')
      return
    }
    onSubmit({
      name: name.trim(),
      stockCode: stockCode.trim().toUpperCase(),
      issuePrice: Number(issuePrice),
      lotSize: Number(lotSize),
      subscriptionDate,
      listingDate,
      industry: industry.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
        <Field label="新股名称" value={name} onChange={setName} />
        <Field label="股票代码" value={stockCode} onChange={setStockCode} />
        <Field
          label="发行价"
          value={issuePrice}
          prefix="HK$"
          onChange={setIssuePrice}
        />
        <Field
          label="一手股数"
          value={lotSize}
          onChange={(value) => setLotSize(value.replace(/\D/g, ''))}
        />
        <Field
          label="申购日期"
          value={subscriptionDate}
          type="date"
          onChange={setSubscriptionDate}
        />
        <Field
          label="上市日期"
          value={listingDate}
          type="date"
          onChange={setListingDate}
        />
        <div className="sm:col-span-2">
          <Field
            label="行业"
            value={industry}
            placeholder="请输入行业"
            maxLength={50}
            onChange={setIndustry}
          />
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </div>
      <FormActions
        submitLabel={ipo ? '保存新股资料' : '创建新股'}
        onCancel={onCancel}
      />
    </form>
  )
}

function Field({
  label,
  value,
  prefix,
  placeholder,
  maxLength,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  prefix?: string
  placeholder?: string
  maxLength?: number
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
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={type === 'date' ? undefined : 'text'}
          className={`focus-ring w-full rounded-xl border border-slate-200 py-3 text-sm ${
            prefix ? 'pl-12 pr-3.5' : 'px-3.5'
          }`}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  )
}
