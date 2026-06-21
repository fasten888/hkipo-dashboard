import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Layers3,
  Pencil,
  Target,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { useAppData } from '../../hooks/useAppData'
import type {
  Subscription,
  SubscriptionInput,
} from '../../types/subscription'
import { formatAccountName } from '../../utils/account'
import { formatHKD, formatPercent } from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import { getIpoStats } from '../../utils/statistics'
import {
  getSubscriptionMethod,
  getSubscriptionMethodLabel,
} from '../../utils/subscriptionMethod'
import { SubscriptionForm } from '../subscriptions/SubscriptionForm'

export function IpoDetailPage({
  ipoId,
  onBack,
}: {
  ipoId: string
  onBack: () => void
}) {
  const data = useAppData()
  const { accounts, ipos, subscriptions, sales } = data
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null)
  const ipo = ipos.find((item) => item.id === ipoId)

  if (!ipo) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-card">
        <p className="font-semibold text-slate-800">新股不存在或已被删除</p>
        <button
          type="button"
          className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
          onClick={onBack}
        >
          返回新股列表
        </button>
      </div>
    )
  }

  const records = subscriptions.filter((item) => item.ipoId === ipo.id)
  const winners = records.filter((item) => item.status === 'won')
  const losers = records.filter((item) => item.status === 'lost')
  const stats = getIpoStats(ipo, subscriptions, sales)
  const totalInvestment = records.reduce(
    (total, item) => total + item.subscriptionAmount + item.fee,
    0,
  )
  const saleRows = sales
    .filter((sale) =>
      records.some((record) => record.id === sale.subscriptionId),
    )
    .sort((left, right) => right.date.localeCompare(left.date))

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        返回新股列表
      </button>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
            新股详情
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
            {ipo.name}（{ipo.stockCode}）
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-400">
            {ipo.industry || '未填写行业'}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
          <p className="text-[11px] text-slate-400">总收益</p>
          <p className={`mt-1 text-2xl font-bold ${getProfitColor(stats.totalProfit)}`}>
            {formatHKD(stats.totalProfit, 'profit')}
          </p>
        </div>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="参与账户" value={`${stats.participantCount} 个`} icon={Users} />
        <Metric label="中签账户" value={`${stats.winnerCount} 个`} icon={Target} />
        <Metric
          label="未中签账户"
          value={`${new Set(losers.map((item) => item.accountId)).size} 个`}
          icon={Users}
        />
        <Metric label="中签率" value={formatPercent(stats.winRate)} icon={Target} />
        <Metric
          label="总投入"
          value={formatHKD(totalInvestment, 'investment')}
          icon={CircleDollarSign}
        />
        <Metric
          label="总收益"
          value={formatHKD(stats.totalProfit, 'profit')}
          icon={CircleDollarSign}
          profit={stats.totalProfit}
        />
        <Metric
          label="收益率"
          value={formatPercent(stats.profitRate, 'profitRate')}
          icon={Layers3}
          profit={stats.profitRate}
        />
        <Metric
          label="发行资料"
          value={`${formatHKD(ipo.issuePrice)} · ${ipo.lotSize} 股/手`}
          icon={Layers3}
        />
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <h2 className="font-bold text-slate-900">基础信息</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="股票名称" value={ipo.name} />
            <Info label="股票代码" value={ipo.stockCode} />
            <Info label="发行价" value={formatHKD(ipo.issuePrice)} />
            <Info label="每手股数" value={`${ipo.lotSize} 股`} />
            <Info label="申购日期" value={ipo.subscriptionDate} />
            <Info label="上市日期" value={ipo.listingDate} />
            <Info label="行业" value={ipo.industry} />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <h2 className="font-bold text-slate-900">账户中签结构</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AccountGroup
              title={`中签账户 ${new Set(winners.map((item) => item.accountId)).size}`}
              tone="red"
              accountIds={[...new Set(winners.map((item) => item.accountId))]}
              accounts={accounts}
            />
            <AccountGroup
              title={`未中签账户 ${new Set(losers.map((item) => item.accountId)).size}`}
              tone="green"
              accountIds={[...new Set(losers.map((item) => item.accountId))]}
              accounts={accounts}
            />
          </div>
        </section>
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">所有参与账户</h2>
          <p className="mt-1 text-xs text-slate-400">
            每个账户的实际申购方式独立保存，可直接修改。
          </p>
        </div>
        {records.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            暂无参与账户
          </p>
        ) : (
          <>
          <div className="divide-y divide-slate-100 md:hidden">
            {records
              .slice()
              .sort((left, right) =>
                right.createdAt.localeCompare(left.createdAt),
              )
              .map((record) => {
                const account = accounts.find(
                  (item) => item.id === record.accountId,
                )
                return (
                  <article key={record.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-bold text-slate-800">
                          {account ? formatAccountName(account) : '已删除账户'}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-brand-600">
                          {getSubscriptionMethodLabel(
                            getSubscriptionMethod(record, account),
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500"
                        aria-label="编辑申购记录"
                        onClick={() => setEditingSubscription(record)}
                      >
                        <Pencil size={17} />
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Info label="申购日期" value={record.subscriptionDate} />
                      <Info
                        label="状态"
                        value={subscriptionStatusLabels[record.status]}
                      />
                    </div>
                    {record.remarks && (
                      <p className="mt-3 break-words text-xs leading-5 text-slate-400">
                        {record.remarks}
                      </p>
                    )}
                  </article>
                )
              })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px]">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  {['账户', '申购方式', '申购日期', '状态', '备注', '操作'].map(
                    (label) => (
                      <th key={label} className="px-5 py-3 font-semibold">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records
                  .slice()
                  .sort((left, right) =>
                    right.createdAt.localeCompare(left.createdAt),
                  )
                  .map((record) => {
                    const account = accounts.find(
                      (item) => item.id === record.accountId,
                    )
                    return (
                      <tr key={record.id}>
                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {account
                            ? formatAccountName(account)
                            : '已删除账户'}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {getSubscriptionMethodLabel(
                            getSubscriptionMethod(record, account),
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {record.subscriptionDate}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {subscriptionStatusLabels[record.status]}
                        </td>
                        <td className="max-w-48 truncate px-5 py-4 text-slate-500">
                          {record.remarks || '-'}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="编辑申购记录"
                            onClick={() => setEditingSubscription(record)}
                          >
                            <Pencil size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">卖出记录</h2>
            <p className="mt-1 text-xs text-slate-400">
              暗盘、首日及持有后卖出统一核算
            </p>
          </div>
          <CalendarDays size={18} className="text-slate-300" />
        </div>
        {saleRows.length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-400">暂无卖出记录</p>
        ) : (
          <>
          <div className="divide-y divide-slate-100 md:hidden">
            {saleRows.map((sale) => {
              const subscription = records.find(
                (item) => item.id === sale.subscriptionId,
              )
              const account = accounts.find(
                (item) => item.id === subscription?.accountId,
              )
              const allSoldShares = sales
                .filter((item) => item.subscriptionId === subscription?.id)
                .reduce((total, item) => total + item.shares, 0)
              const fee =
                allSoldShares > 0
                  ? ((subscription?.fee ?? 0) * sale.shares) / allSoldShares
                  : 0
              const cost =
                sale.shares * ipo.issuePrice + fee + (sale.commission ?? 0)
              const profit =
                sale.shares * (sale.price - ipo.issuePrice) -
                fee -
                (sale.commission ?? 0)
              const rate = cost > 0 ? (profit / cost) * 100 : 0
              return (
                <article key={sale.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-slate-800">
                        {account ? formatAccountName(account) : '已删除账户'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {saleMethodLabels[sale.method]} · {sale.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getProfitColor(profit)}`}>
                        {formatHKD(profit, 'profit')}
                      </p>
                      <p className={`mt-1 text-xs font-semibold ${getProfitColor(rate)}`}>
                        {formatPercent(rate, 'profitRate')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Info label="卖出股数" value={`${sale.shares} 股`} />
                    <Info label="卖出价格" value={formatHKD(sale.price)} />
                  </div>
                </article>
              )
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  {['账户', '卖出方式', '日期', '股数', '价格', '收益', '收益率'].map(
                    (label) => (
                      <th key={label} className="px-5 py-3 font-semibold">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {saleRows.map((sale) => {
                  const subscription = records.find(
                    (item) => item.id === sale.subscriptionId,
                  )
                  const account = accounts.find(
                    (item) => item.id === subscription?.accountId,
                  )
                  const allSoldShares = sales
                    .filter((item) => item.subscriptionId === subscription?.id)
                    .reduce((total, item) => total + item.shares, 0)
                  const fee =
                    allSoldShares > 0
                      ? ((subscription?.fee ?? 0) * sale.shares) / allSoldShares
                      : 0
                  const cost =
                    sale.shares * ipo.issuePrice +
                    fee +
                    (sale.commission ?? 0)
                  const profit =
                    sale.shares * (sale.price - ipo.issuePrice) -
                    fee -
                    (sale.commission ?? 0)
                  const rate = cost > 0 ? (profit / cost) * 100 : 0
                  return (
                    <tr key={sale.id}>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {account ? formatAccountName(account) : '已删除账户'}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {saleMethodLabels[sale.method]}
                      </td>
                      <td className="px-5 py-4 text-slate-500">{sale.date}</td>
                      <td className="px-5 py-4 text-slate-600">{sale.shares}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatHKD(sale.price)}
                      </td>
                      <td className={`px-5 py-4 font-bold ${getProfitColor(profit)}`}>
                        {formatHKD(profit, 'profit')}
                      </td>
                      <td className={`px-5 py-4 ${getProfitColor(rate)}`}>
                        {formatPercent(rate, 'profitRate')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
      <Modal
        open={Boolean(editingSubscription)}
        title="编辑参与账户申购"
        description="修改后账户、新股和融资方式统计会自动刷新。"
        fullScreenOnMobile
        onClose={() => setEditingSubscription(null)}
      >
        {editingSubscription && (
          <SubscriptionForm
            accounts={accounts}
            ipos={ipos}
            subscription={editingSubscription}
            onSubmit={(input: SubscriptionInput) => {
              data.updateSubscription(editingSubscription.id, input)
              setEditingSubscription(null)
            }}
            onCancel={() => setEditingSubscription(null)}
          />
        )}
      </Modal>
    </>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
  profit,
}: {
  label: string
  value: string
  icon: typeof Users
  profit?: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">{label}</p>
        <Icon size={16} className="text-slate-300" />
      </div>
      <p
        className={`mt-2 text-lg font-bold ${
          profit === undefined ? 'text-slate-900' : getProfitColor(profit)
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value || '-'}</p>
    </div>
  )
}

function AccountGroup({
  title,
  tone,
  accountIds,
  accounts,
}: {
  title: string
  tone: 'red' | 'green'
  accountIds: string[]
  accounts: ReturnType<typeof useAppData>['accounts']
}) {
  return (
    <div className={`rounded-xl p-4 ${tone === 'red' ? 'bg-red-50' : 'bg-green-50'}`}>
      <p className={`text-xs font-bold ${tone === 'red' ? 'text-red-500' : 'text-green-500'}`}>
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {accountIds.length === 0 ? (
          <p className="text-xs text-slate-400">暂无记录</p>
        ) : (
          accountIds.map((accountId) => {
            const account = accounts.find((item) => item.id === accountId)
            return (
              <p key={accountId} className="text-sm font-semibold text-slate-700">
                {account ? formatAccountName(account) : '已删除账户'}
              </p>
            )
          })
        )}
      </div>
    </div>
  )
}

const saleMethodLabels = {
  grey_market: '暗盘卖出',
  first_day: '首日卖出',
  held_sale: '持有后卖出',
}

const subscriptionStatusLabels = {
  applied: '已申购',
  announced: '已公布',
  won: '已中签',
  lost: '未中签',
}
