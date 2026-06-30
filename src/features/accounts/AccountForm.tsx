import { useEffect, useState, type FormEvent } from 'react'
import type { Account, AccountInput } from '../../types/account'
import type { SubscriptionMethod } from '../../types/subscription'
import { SUBSCRIPTION_METHOD_OPTIONS } from '../../utils/subscriptionMethod'
import type { ExchangeRecord } from '../../types/exchange'

interface AccountFormProps {
  account?: Account | null
  onSubmit: (input: AccountInput) => void
  onCancel: () => void
  exchangeRecords?: ExchangeRecord[]
}

interface FormValues {
  name: string
  accountSuffix: string
  phone: string
  brokerName: string
  securitiesAccount: string
  initialDeposit: string
  currentAssets: string
  cashBalance: string
  defaultSubscriptionMethod: SubscriptionMethod
  remarks: string
  exchangeRecordId: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const emptyValues: FormValues = {
  name: '',
  accountSuffix: '',
  phone: '',
  brokerName: '',
  securitiesAccount: '',
  initialDeposit: '',
  currentAssets: '',
  cashBalance: '',
  defaultSubscriptionMethod: '10x',
  remarks: '',
  exchangeRecordId: '',
}

function accountToFormValues(account: Account): FormValues {
  return {
    name: account.name,
    accountSuffix: account.accountSuffix,
    phone: account.phone,
    brokerName: account.brokerName,
    securitiesAccount: account.securitiesAccount,
    initialDeposit: String(account.initialDeposit),
    currentAssets: String(account.currentAssets),
    cashBalance: String(account.cashBalance ?? account.currentAssets),
    defaultSubscriptionMethod: account.defaultSubscriptionMethod ?? '10x',
    remarks: account.remarks,
    exchangeRecordId: account.exchangeRecordId ?? '',
  }
}

export function AccountForm({
  account,
  onSubmit,
  onCancel,
  exchangeRecords = [],
}: AccountFormProps) {
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    setValues(account ? accountToFormValues(account) : emptyValues)
    setErrors({})
  }, [account])

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateForm(values)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSubmit({
      name: values.name.trim(),
      accountSuffix: values.accountSuffix,
      phone: values.phone.trim(),
      brokerName: values.brokerName.trim(),
      securitiesAccount: values.securitiesAccount.trim(),
      initialDeposit: Number(values.initialDeposit),
      currentAssets: Number(values.currentAssets),
      cashBalance: Number(values.cashBalance),
      defaultSubscriptionMethod: values.defaultSubscriptionMethod,
      remarks: values.remarks.trim(),
      exchangeRecordId: values.exchangeRecordId,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
        <Field
          label="账户名称"
          name="name"
          value={values.name}
          placeholder="例如：杜老太"
          error={errors.name}
          autoFocus
          onChange={(value) => updateValue('name', value)}
        />
        <Field
          label="账号后四位"
          name="accountSuffix"
          value={values.accountSuffix}
          placeholder="例如：1234"
          inputMode="numeric"
          maxLength={4}
          error={errors.accountSuffix}
          onChange={(value) =>
            updateValue('accountSuffix', value.replace(/\D/g, '').slice(0, 4))
          }
        />
        <Field
          label="手机号"
          name="phone"
          value={values.phone}
          placeholder="例如：13800138000"
          inputMode="tel"
          error={errors.phone}
          onChange={(value) => updateValue('phone', value)}
        />
        <Field
          label="券商名称"
          name="brokerName"
          value={values.brokerName}
          placeholder="例如：富途证券"
          error={errors.brokerName}
          onChange={(value) => updateValue('brokerName', value)}
        />
        <div className="sm:col-span-2">
          <Field
            label="证券账号"
            name="securitiesAccount"
            value={values.securitiesAccount}
            placeholder="请输入证券账号"
            error={errors.securitiesAccount}
            onChange={(value) => updateValue('securitiesAccount', value)}
          />
        </div>
        <Field
          label="初始入金"
          name="initialDeposit"
          value={values.initialDeposit}
          placeholder="0.00"
          inputMode="decimal"
          prefix="HK$"
          error={errors.initialDeposit}
          onChange={(value) => updateValue('initialDeposit', value)}
        />
        <Field
          label="当前资产"
          name="currentAssets"
          value={values.currentAssets}
          placeholder="0.00"
          inputMode="decimal"
          prefix="HK$"
          error={errors.currentAssets}
          onChange={(value) => updateValue('currentAssets', value)}
        />
        <Field
          label="现金余额"
          name="cashBalance"
          value={values.cashBalance}
          placeholder="0.00"
          inputMode="decimal"
          prefix="HK$"
          error={errors.cashBalance}
          onChange={(value) => updateValue('cashBalance', value)}
        />
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#5A5246]">
            默认申购方式
          </span>
          <select
            value={values.defaultSubscriptionMethod}
            className="focus-ring w-full rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-3 text-sm text-[#2E2A24]"
            onChange={(event) =>
              updateValue(
                'defaultSubscriptionMethod',
                event.target.value,
              )
            }
          >
            {SUBSCRIPTION_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs text-[#A8A296]">
            仅作为新增申购时的默认值，每笔申购仍可单独修改。
          </span>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-[#5A5246]">
            关联换汇记录
          </span>
          <select
            value={values.exchangeRecordId}
            className="focus-ring w-full rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-3 text-sm"
            onChange={(event) =>
              updateValue('exchangeRecordId', event.target.value)
            }
          >
            <option value="">暂不关联</option>
            {exchangeRecords.map((record) => (
              <option key={record.id} value={record.id}>
                {record.date} · {record.sourceAmount.toLocaleString()} {record.sourceCurrency}
                {' → '}
                {record.targetAmount.toLocaleString()} {record.targetCurrency}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs text-[#A8A296]">
            用于还原初始入金的人民币成本和真实换汇汇率。
          </span>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-[#5A5246]">
            备注
          </span>
          <textarea
            name="remarks"
            value={values.remarks}
            rows={3}
            maxLength={300}
            placeholder="记录账户相关说明"
            className="focus-ring w-full resize-none rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-3 text-sm text-[#2E2A24] placeholder:text-[#D2CBBF]"
            onChange={(event) => updateValue('remarks', event.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[#F4F1ED] bg-[#F4F1ED]/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
        <button
          type="button"
          className="rounded-xl border border-[#E4DFD6] bg-white px-5 py-2.5 text-sm font-semibold text-[#5A5246] transition hover:bg-[#F4F1ED]"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          {account ? '保存修改' : '创建账户'}
        </button>
      </div>
    </form>
  )
}

interface FieldProps {
  label: string
  name: string
  value: string
  placeholder: string
  error?: string
  prefix?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel'
  maxLength?: number
  autoFocus?: boolean
  onChange: (value: string) => void
}

function Field({
  label,
  name,
  value,
  placeholder,
  error,
  prefix,
  inputMode = 'text',
  maxLength,
  autoFocus,
  onChange,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#5A5246]">
        {label}
      </span>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-medium text-[#A8A296]">
            {prefix}
          </span>
        )}
        <input
          name={name}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          maxLength={maxLength}
          autoFocus={autoFocus}
          className={`focus-ring w-full rounded-xl border bg-white py-3 text-sm text-[#2E2A24] placeholder:text-[#D2CBBF] ${
            prefix ? 'pl-12 pr-3.5' : 'px-3.5'
          } ${error ? 'border-red-400' : 'border-[#E4DFD6]'}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error && (
        <span id={`${name}-error`} className="mt-1.5 block text-xs text-[#9A7468]">
          {error}
        </span>
      )}
    </label>
  )
}

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {}
  const initialDeposit = Number(values.initialDeposit)
  const currentAssets = Number(values.currentAssets)
  const cashBalance = Number(values.cashBalance)

  if (!values.name.trim()) errors.name = '请输入账户名称'
  if (!/^\d{4}$/.test(values.accountSuffix)) {
    errors.accountSuffix = '请输入 4 位数字'
  }
  if (values.phone.trim() && !/^[+\d\s-]{6,20}$/.test(values.phone.trim())) {
    errors.phone = '请输入有效手机号'
  }
  if (!values.brokerName.trim()) errors.brokerName = '请输入券商名称'
  if (!values.securitiesAccount.trim()) {
    errors.securitiesAccount = '请输入证券账号'
  }
  if (values.initialDeposit === '' || !Number.isFinite(initialDeposit)) {
    errors.initialDeposit = '请输入有效金额'
  } else if (initialDeposit < 0) {
    errors.initialDeposit = '金额不能小于 0'
  }
  if (values.currentAssets === '' || !Number.isFinite(currentAssets)) {
    errors.currentAssets = '请输入有效金额'
  } else if (currentAssets < 0) {
    errors.currentAssets = '金额不能小于 0'
  }
  if (values.cashBalance === '' || !Number.isFinite(cashBalance)) {
    errors.cashBalance = '请输入有效金额'
  } else if (cashBalance < 0) {
    errors.cashBalance = '金额不能小于 0'
  }

  return errors
}
