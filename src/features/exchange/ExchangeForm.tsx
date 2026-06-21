import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Account } from '../../types/account'
import type {
  ExchangeCurrency,
  ExchangeChannel,
  ExchangeRecord,
  ExchangeRecordInput,
} from '../../types/exchange'
import { formatAccountName } from '../../utils/account'
import { FormActions } from '../subscriptions/SubscriptionForm'

export function ExchangeForm({
  accounts,
  record,
  onSubmit,
  onCancel,
}: {
  accounts: Account[]
  record?: ExchangeRecord | null
  onSubmit: (input: ExchangeRecordInput) => void
  onCancel: () => void
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [sourceCurrency, setSourceCurrency] =
    useState<ExchangeCurrency>('CNY')
  const [sourceAmount, setSourceAmount] = useState('')
  const [targetCurrency, setTargetCurrency] =
    useState<ExchangeCurrency>('HKD')
  const [targetAmount, setTargetAmount] = useState('')
  const [feeCny, setFeeCny] = useState('0')
  const [manualRate, setManualRate] = useState('')
  const [originalCostCny, setOriginalCostCny] = useState('')
  const [channel, setChannel] = useState<ExchangeChannel>('other')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setAccountId(record?.accountId ?? accounts[0]?.id ?? '')
    setDate(record?.date ?? new Date().toISOString().slice(0, 10))
    setSourceCurrency(record?.sourceCurrency ?? 'CNY')
    setSourceAmount(
      record
        ? String(record.sourceAmount ?? record.sourceAmountCny)
        : '',
    )
    setTargetCurrency(record?.targetCurrency ?? 'HKD')
    setTargetAmount(record ? String(record.targetAmount) : '')
    setFeeCny(record ? String(record.feeCny) : '0')
    setManualRate(record?.manualRate ? String(record.manualRate) : '')
    setOriginalCostCny(
      record?.originalCostCny
        ? String(record.originalCostCny)
        : record?.sourceCurrency === 'CNY'
          ? String(record.sourceAmount)
          : '',
    )
    setChannel(record?.channel ?? 'other')
    setRemarks(record?.remarks ?? '')
    setError('')
  }, [accounts, record])

  const exchangeRate = useMemo(() => {
    const source = Number(sourceAmount)
    const target = Number(targetAmount)
    return source > 0 && target > 0 ? target / source : 0
  }, [sourceAmount, targetAmount])
  const effectiveRate = Number(manualRate) > 0 ? Number(manualRate) : exchangeRate

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const source = Number(sourceAmount)
    const target = Number(targetAmount)
    const fee = Number(feeCny)
    if (
      !accountId ||
      !date ||
      source <= 0 ||
      target <= 0 ||
      fee < 0 ||
      !Number.isFinite(source) ||
      !Number.isFinite(target) ||
      !Number.isFinite(fee)
    ) {
      setError('请选择账户，并填写有效的人民币金额和到账外币金额。')
      return
    }
    onSubmit({
      accountId,
      date,
      sourceCurrency,
      sourceAmount: source,
      sourceAmountCny:
        sourceCurrency === 'CNY' ? source : Number(originalCostCny) || 0,
      targetCurrency,
      targetAmount: target,
      exchangeRate,
      manualRate: Number(manualRate) > 0 ? Number(manualRate) : null,
      originalCostCny:
        sourceCurrency === 'CNY' ? source : Number(originalCostCny) || 0,
      feeCny: fee,
      channel,
      remarks: remarks.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
        <label>
          <FieldLabel>账户</FieldLabel>
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
          <FieldLabel>换汇日期</FieldLabel>
          <input
            type="date"
            value={date}
            className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm"
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          <FieldLabel>原币种</FieldLabel>
          <select
            value={sourceCurrency}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"
            onChange={(event) =>
              setSourceCurrency(event.target.value as ExchangeCurrency)
            }
          >
            <option value="CNY">人民币 CNY</option>
            <option value="USD">美元 USD</option>
            <option value="HKD">港币 HKD</option>
          </select>
        </label>
        <MoneyField
          label="原币金额"
          prefix={currencyPrefix(sourceCurrency)}
          value={sourceAmount}
          autoFocus
          onChange={setSourceAmount}
        />
        <label>
          <FieldLabel>换得币种</FieldLabel>
          <select
            value={targetCurrency}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"
            onChange={(event) =>
              setTargetCurrency(event.target.value as ExchangeCurrency)
            }
          >
            <option value="HKD">港币 HKD</option>
            <option value="USD">美元 USD</option>
          </select>
        </label>
        <MoneyField
          label={`实际到账${targetCurrency === 'HKD' ? '港币' : '美元'}`}
          prefix={targetCurrency === 'HKD' ? 'HK$' : 'US$'}
          value={targetAmount}
          onChange={setTargetAmount}
        />
        <MoneyField
          label="换汇费用（人民币）"
          prefix="¥"
          value={feeCny}
          onChange={setFeeCny}
        />
        <div className="rounded-xl bg-slate-50 px-4 py-3 sm:col-span-2">
          <p className="text-xs text-slate-400">实际换汇汇率</p>
          <p className="mt-1 text-lg font-bold text-slate-800">
            1 {sourceCurrency} = {effectiveRate > 0 ? effectiveRate.toFixed(6) : '-'}{' '}
            {targetCurrency}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            自动汇率为到账金额 ÷ 原币金额；填写手动汇率后优先使用手动值
          </p>
        </div>
        <MoneyField
          label="手动汇率（选填）"
          prefix=""
          value={manualRate}
          onChange={setManualRate}
        />
        {sourceCurrency !== 'CNY' && (
          <MoneyField
            label="原始人民币成本"
            prefix="¥"
            value={originalCostCny}
            onChange={setOriginalCostCny}
          />
        )}
        <label>
          <FieldLabel>换汇渠道</FieldLabel>
          <select
            value={channel}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"
            onChange={(event) =>
              setChannel(event.target.value as ExchangeChannel)
            }
          >
            <option value="boc_hk">中银香港</option>
            <option value="za_bank">众安银行</option>
            <option value="futu">富途</option>
            <option value="chief">致富证券</option>
            <option value="cash">线下现金</option>
            <option value="other">其他</option>
          </select>
        </label>
        <label className="sm:col-span-2">
          <FieldLabel>备注</FieldLabel>
          <textarea
            value={remarks}
            rows={3}
            maxLength={200}
            className="focus-ring w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm"
            placeholder="例如：招商银行换汇、用于某券商入金"
            onChange={(event) => setRemarks(event.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </div>
      <FormActions
        submitLabel={record ? '保存换汇记录' : '添加换汇记录'}
        onCancel={onCancel}
      />
    </form>
  )
}

function currencyPrefix(currency: ExchangeCurrency) {
  if (currency === 'CNY') return '¥'
  if (currency === 'USD') return 'US$'
  return 'HK$'
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="mb-2 block text-sm font-semibold text-slate-700">
      {children}
    </span>
  )
}

function MoneyField({
  label,
  prefix,
  value,
  autoFocus = false,
  onChange,
}: {
  label: string
  prefix: string
  value: string
  autoFocus?: boolean
  onChange: (value: string) => void
}) {
  return (
    <label>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <span className="absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">
          {prefix}
        </span>
        <input
          value={value}
          inputMode="decimal"
          autoFocus={autoFocus}
          className="focus-ring w-full rounded-xl border border-slate-200 py-3 pl-12 pr-3.5 text-sm"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  )
}
