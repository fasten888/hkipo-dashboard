import { Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import type { Account } from '../../types/account'
import type { Ipo } from '../../types/ipo'
import type {
  SubscriptionInput,
  FundingSource,
  SubscriptionMethod,
} from '../../types/subscription'
import { formatAccountName } from '../../utils/account'
import { formatHKD } from '../../utils/currency'
import {
  getAccountDefaultSubscriptionMethod,
  SUBSCRIPTION_METHOD_OPTIONS,
} from '../../utils/subscriptionMethod'
import { FormActions } from './SubscriptionForm'
import { FUNDING_SOURCE_OPTIONS } from '../../utils/fundingSource'

export function BatchSubscriptionForm({
  accounts,
  ipos,
  onSubmit,
  onCancel,
}: {
  accounts: Account[]
  ipos: Ipo[]
  onSubmit: (inputs: SubscriptionInput[]) => void
  onCancel: () => void
}) {
  const [ipoId, setIpoId] = useState(ipos[0]?.id ?? '')
  const [accountIds, setAccountIds] = useState<string[]>([])
  const [methods, setMethods] = useState<
    Record<string, SubscriptionMethod>
  >({})
  const [amount, setAmount] = useState('')
  const [fee, setFee] = useState('100')
  const [remarks, setRemarks] = useState('')
  const [fundingSource, setFundingSource] =
    useState<FundingSource>('financing')
  const [search, setSearch] = useState('')
  const [broker, setBroker] = useState('all')
  const [error, setError] = useState('')
  const selectedIpo = ipos.find((ipo) => ipo.id === ipoId)
  const brokers = [...new Set(accounts.map((account) => account.brokerName))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const visibleAccounts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return accounts.filter(
      (account) =>
        (broker === 'all' || account.brokerName === broker) &&
        (!query ||
          account.name.toLowerCase().includes(query) ||
          account.accountSuffix.includes(query)),
    )
  }, [accounts, broker, search])
  const visibleIds = visibleAccounts.map((account) => account.id)
  const selectedMethodStats = useMemo(() => {
    return accountIds.reduce(
      (stats, accountId) => {
        const account = accounts.find((item) => item.id === accountId)
        const method =
          methods[accountId] ?? getAccountDefaultSubscriptionMethod(account)
        if (method === 'cash') stats.cash += 1
        else stats.financing += 1
        return stats
      },
      { cash: 0, financing: 0 },
    )
  }, [accountIds, accounts, methods])

  const updateSelectedMethods = (method: SubscriptionMethod) => {
    if (accountIds.length === 0) return
    setMethods((current) => ({
      ...current,
      ...Object.fromEntries(accountIds.map((accountId) => [accountId, method])),
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const hasInvalidAmount =
      amount.trim() !== '' &&
      (!Number.isFinite(Number(amount)) || Number(amount) < 0)
    if (
      !selectedIpo ||
      accountIds.length === 0 ||
      hasInvalidAmount ||
      Number(fee) < 0
    ) {
      setError('请选择新股和账户，并检查申购金额及手续费。')
      return
    }
    onSubmit(
      accountIds.map((accountId) => ({
        accountId,
        ipoId,
        method:
          methods[accountId] ??
          getAccountDefaultSubscriptionMethod(
            accounts.find((account) => account.id === accountId),
          ),
        subscriptionMethod:
          methods[accountId] ??
          getAccountDefaultSubscriptionMethod(
            accounts.find((account) => account.id === accountId),
          ),
        subscriptionAmount: amount.trim() === '' ? 0 : Number(amount),
        fee: Number(fee),
        subscriptionDate: selectedIpo.subscriptionDate,
        remarks: remarks.trim(),
        status: 'applied',
        allottedShares: 0,
        allottedLots: 0,
        sellPlan: 'hold',
        fundingSource,
      })),
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5 px-5 py-6 sm:px-7">
        <label>
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            新股
          </span>
          <select
            value={ipoId}
            className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm"
            onChange={(event) => setIpoId(event.target.value)}
          >
            {ipos.map((ipo) => (
              <option key={ipo.id} value={ipo.id}>
                {ipo.name}（{ipo.stockCode}）
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm font-semibold text-slate-700">
              参与账户
            </legend>
            <span className="text-xs text-slate-400">
              已选 {accountIds.length} 个
            </span>
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                placeholder="搜索账户名称或后四位"
                className="focus-ring w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              value={broker}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"
              onChange={(event) => setBroker(event.target.value)}
            >
              <option value="all">全部券商</option>
              {brokers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                onClick={() => {
                  setAccountIds((current) => [
                    ...new Set([...current, ...visibleIds]),
                  ])
                  setMethods((current) => ({
                    ...current,
                    ...Object.fromEntries(
                      visibleAccounts.map((account) => [
                        account.id,
                        current[account.id] ??
                          getAccountDefaultSubscriptionMethod(account),
                      ]),
                    ),
                  }))
                }}
              >
                全选
              </button>
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                onClick={() =>
                  setAccountIds((current) => {
                    const selected = new Set(current)
                    visibleIds.forEach((id) => {
                      if (selected.has(id)) selected.delete(id)
                      else selected.add(id)
                    })
                    return [...selected]
                  })
                }
              >
                反选
              </button>
              <div className="hidden h-5 w-px bg-slate-200 sm:block" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  申购方式：
                </span>
                <button
                  type="button"
                  disabled={accountIds.length === 0}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => updateSelectedMethods('cash')}
                >
                  全部现金
                </button>
                <button
                  type="button"
                  disabled={accountIds.length === 0}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => updateSelectedMethods('10x')}
                >
                  全部10x融资
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
              <span>现金账户：{selectedMethodStats.cash}个</span>
              <span>融资账户：{selectedMethodStats.financing}个</span>
              <span className="text-slate-400">仅修改已选账户</span>
            </div>
          </div>
          <div className="grid max-h-60 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
            {visibleAccounts.map((account) => (
              <label
                key={account.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={accountIds.includes(account.id)}
                  onChange={() => {
                    setAccountIds((current) =>
                      current.includes(account.id)
                        ? current.filter((id) => id !== account.id)
                        : [...current, account.id],
                    )
                    setMethods((current) => ({
                      ...current,
                      [account.id]:
                        current[account.id] ??
                        getAccountDefaultSubscriptionMethod(account),
                    }))
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-700">
                    {formatAccountName(account)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    {account.brokerName || '未填写券商'} · 初始资金{' '}
                    {formatHKD(account.initialDeposit, 'investment')}
                  </span>
                  {accountIds.includes(account.id) && (
                    <select
                      value={
                        methods[account.id] ??
                        getAccountDefaultSubscriptionMethod(account)
                      }
                      className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        setMethods((current) => ({
                          ...current,
                          [account.id]: event.target
                            .value as SubscriptionMethod,
                        }))
                      }
                    >
                      {SUBSCRIPTION_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </span>
              </label>
            ))}
            {visibleAccounts.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400 sm:col-span-2">
                没有匹配的账户
              </p>
            )}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="每账户申购金额（选填）"
            value={amount}
            onChange={setAmount}
          />
          <NumberField label="每账户手续费" value={fee} onChange={setFee} />
        </div>
        <label>
          <span className="mb-2 block text-xs font-semibold text-slate-600">
            整批资金来源
          </span>
          <select
            value={fundingSource}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"
            onChange={(event) =>
              setFundingSource(event.target.value as FundingSource)
            }
          >
            {FUNDING_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <textarea
          value={remarks}
          rows={2}
          placeholder="备注"
          className="focus-ring w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm"
          onChange={(event) => setRemarks(event.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <FormActions
        submitLabel={`创建 ${accountIds.length} 条申购记录`}
        onCancel={onCancel}
      />
    </form>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-xs text-slate-400">
          HK$
        </span>
        <input
          value={value}
          inputMode="decimal"
          className="focus-ring w-full rounded-xl border border-slate-200 py-2.5 pl-11 pr-3 text-sm"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  )
}
