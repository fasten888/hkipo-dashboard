import { useEffect, useState, type FormEvent } from 'react'
import type { Ipo } from '../../types/ipo'
import type {
  SellPlan,
  Subscription,
  SubscriptionInput,
  SubscriptionStatus,
} from '../../types/subscription'
import { formatHKD } from '../../utils/currency'
import { getSubscriptionMethod } from '../../utils/subscriptionMethod'
import { FormActions } from '../subscriptions/SubscriptionForm'

export function AllotmentForm({
  subscription,
  ipo,
  onSubmit,
  onCancel,
}: {
  subscription: Subscription
  ipo?: Ipo
  onSubmit: (input: SubscriptionInput) => void
  onCancel: () => void
}) {
  const [status, setStatus] = useState<SubscriptionStatus>(
    subscription.status,
  )
  const [shares, setShares] = useState(String(subscription.allottedShares))
  const [lots, setLots] = useState(String(subscription.allottedLots))
  const [sellPlan, setSellPlan] = useState<SellPlan>(subscription.sellPlan)
  const [error, setError] = useState('')

  useEffect(() => {
    setStatus(subscription.status)
    setShares(String(subscription.allottedShares))
    setLots(String(subscription.allottedLots))
    setSellPlan(subscription.sellPlan)
    setError('')
  }, [subscription])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const numericShares = Number(shares)
    const numericLots = Number(lots)
    if (
      status === 'won' &&
      (!Number.isInteger(numericShares) ||
        numericShares <= 0 ||
        !Number.isInteger(numericLots) ||
        numericLots <= 0)
    ) {
      setError('已中签记录必须填写有效的中签股数和中签手数。')
      return
    }
    onSubmit({
      accountId: subscription.accountId,
      ipoId: subscription.ipoId,
      method: getSubscriptionMethod(subscription),
      subscriptionMethod: getSubscriptionMethod(subscription),
      subscriptionAmount: subscription.subscriptionAmount,
      fee: subscription.fee,
      subscriptionDate: subscription.subscriptionDate,
      remarks: subscription.remarks,
      status,
      allottedShares: status === 'won' ? numericShares : 0,
      allottedLots: status === 'won' ? numericLots : 0,
      sellPlan: status === 'won' ? sellPlan : 'hold',
      fundingSource: subscription.fundingSource,
    })
  }

  const allotmentAmount =
    status === 'won' ? Number(shares || 0) * (ipo?.issuePrice ?? 0) : 0

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
        <ReadOnly label="发行价" value={formatHKD(ipo?.issuePrice ?? 0)} />
        <ReadOnly label="上市日期" value={ipo?.listingDate ?? '-'} />
        <label>
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            中签状态
          </span>
          <select
            value={status}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"
            onChange={(event) =>
              setStatus(event.target.value as SubscriptionStatus)
            }
          >
            <option value="applied">已申购</option>
            <option value="announced">已公布</option>
            <option value="won">已中签</option>
            <option value="lost">未中签</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            卖出方式
          </span>
          <select
            value={sellPlan}
            disabled={status !== 'won'}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm disabled:bg-slate-50"
            onChange={(event) => setSellPlan(event.target.value as SellPlan)}
          >
            <option value="grey_market">暗盘</option>
            <option value="first_day">首日</option>
            <option value="hold">持有</option>
          </select>
        </label>
        {status === 'won' && (
          <>
            <NumberField
              label="中签股数"
              value={shares}
              onChange={setShares}
            />
            <NumberField
              label="中签手数"
              value={lots}
              onChange={setLots}
            />
          </>
        )}
        <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
          <p className="text-xs text-slate-400">中签金额</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatHKD(allotmentAmount, 'investment')}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            中签股数 × 发行价
          </p>
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </div>
      <FormActions submitLabel="保存中签结果" onCancel={onCancel} />
    </form>
  )
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
        {value}
      </div>
    </div>
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
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        value={value}
        inputMode="numeric"
        className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm"
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
      />
    </label>
  )
}
