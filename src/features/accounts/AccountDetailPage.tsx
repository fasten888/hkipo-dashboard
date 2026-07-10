import {
  ArrowLeft,
  Building2,
  ChartCandlestick,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Pencil,
  Phone,
  Search,
  TrendingUp,
  Trophy,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { useAppData } from '../../hooks/useAppData'
import { usePersistentState } from '../../hooks/usePersistentState'
import { Modal } from '../../components/ui/Modal'
import { exportAccountHistoryCsv } from '../../services/csv'
import type {
  Subscription,
  SubscriptionInput,
} from '../../types/subscription'
import {
  formatAccountName,
  formatSensitiveText,
} from '../../utils/account'
import {
  formatHKD,
  formatPercent,
  formatSignedPercent,
} from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import { getFundingSourceLabel } from '../../utils/fundingSource'
import {
  getAccountHealth,
  getAccountStats,
  getProfitTrend,
  getSaleTypeStats,
  getSubscriptionMetrics,
} from '../../utils/statistics'
import {
  getAccountDefaultSubscriptionMethod,
  getSubscriptionMethod,
  getSubscriptionMethodLabel,
} from '../../utils/subscriptionMethod'
import { SubscriptionForm } from '../subscriptions/SubscriptionForm'

const cnyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
})

function formatCNY(value: number) {
  return cnyFormatter.format(value).replace('CN¥', '¥ ')
}

export function AccountDetailPage({
  accountId,
  onBack,
}: {
  accountId: string
  onBack: () => void
}) {
  const data = useAppData()
  const {
    accounts,
    ipos,
    subscriptions,
    sales,
    withdrawals,
    holdings,
    exchangeRecords,
    fxRates,
  } = data
  const [activeTab, setActiveTab] = useState<
    'participation' | 'allotments' | 'losses' | 'sales' | 'withdrawals'
  >('participation')
  const [historySearch, setHistorySearch] = useState('')
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null)
  const [historySort, setHistorySort] = usePersistentState<
    'date_desc' | 'date_asc' | 'profit_desc' | 'profit_asc'
  >(`account-history-sort:${accountId}`, 'date_desc')
  const account = accounts.find((item) => item.id === accountId)

  if (!account) {
    return (
      <div className="rounded-2xl border border-[#E4DFD6] bg-white p-10 text-center shadow-card">
        <p className="font-semibold text-[#4A4540]">账户不存在或已被删除</p>
        <button
          type="button"
          className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
          onClick={onBack}
        >
          返回账户列表
        </button>
      </div>
    )
  }

  const stats = getAccountStats(
    account,
    subscriptions,
    ipos,
    sales,
    withdrawals,
  )
  const health = getAccountHealth(account, subscriptions, ipos, sales)
  const records = subscriptions
    .filter((item) => item.accountId === account.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const accountSales = sales
    .filter((sale) =>
      records.some((record) => record.id === sale.subscriptionId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const accountWithdrawals = withdrawals
    .filter((item) => item.accountId === account.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const accountHoldings = holdings.filter(
    (item) => item.accountId === account.id,
  )
  const holdingMarketValue = accountHoldings.reduce(
    (total, item) => total + item.marketValue,
    0,
  )
  const collateralCapacity = accountHoldings.reduce(
    (total, item) =>
      total + item.marketValue * (item.collateralRate / 100),
    0,
  )
  const cashBalance = account.cashBalance ?? account.currentAssets
  const totalIpoCapacity = cashBalance + collateralCapacity
  const linkedExchange = exchangeRecords.find(
    (item) => item.id === account.exchangeRecordId,
  )
  const originalCostCny = linkedExchange?.originalCostCny ?? 0
  const currentValueCny =
    fxRates.HKD > 0 ? account.currentAssets / fxRates.HKD : 0
  const exchangeProfit =
    linkedExchange && fxRates.HKD > 0
      ? currentValueCny - originalCostCny - linkedExchange.feeCny
      : 0
  const greyStats = getSaleTypeStats(
    'grey_market',
    records,
    ipos,
    accountSales,
  )
  const firstDayStats = getSaleTypeStats(
    'first_day',
    records,
    ipos,
    accountSales,
  )
  const heldStats = getSaleTypeStats('held_sale', records, ipos, accountSales)
  const profitTrend = getProfitTrend('month', records, ipos, accountSales)
  const lossCount =
    Math.max(
      0,
      account.legacyParticipationCount - account.legacyWinCount,
    ) + records.filter((item) => item.status === 'lost').length
  const investedCapital = Math.max(
    0,
    account.initialDeposit - stats.withdrawalTotal,
  )
  const saleCount = greyStats.count + firstDayStats.count + heldStats.count
  const averageHoldingDays =
    saleCount > 0
      ? (greyStats.averageHoldingDays * greyStats.count +
          firstDayStats.averageHoldingDays * firstDayStats.count +
          heldStats.averageHoldingDays * heldStats.count) /
        saleCount
      : 0
  const query = historySearch.trim().toLowerCase()
  const filteredRecords = records
    .filter((record) => {
      const ipo = ipos.find((item) => item.id === record.ipoId)
      return (
        !query ||
        ipo?.name.toLowerCase().includes(query) ||
        ipo?.stockCode.toLowerCase().includes(query) ||
        record.remarks.toLowerCase().includes(query)
      )
    })
    .sort((a, b) =>
      compareHistoryRecords(a, b, historySort, ipos, sales),
    )
  const filteredSales = accountSales
    .filter((sale) => {
      const subscription = records.find(
        (item) => item.id === sale.subscriptionId,
      )
      const ipo = ipos.find((item) => item.id === subscription?.ipoId)
      return (
        !query ||
        ipo?.name.toLowerCase().includes(query) ||
        ipo?.stockCode.toLowerCase().includes(query) ||
        sale.remarks.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      if (historySort === 'date_desc') return b.date.localeCompare(a.date)
      if (historySort === 'date_asc') return a.date.localeCompare(b.date)
      const difference =
        saleProfit(a, records, ipos) - saleProfit(b, records, ipos)
      return historySort === 'profit_desc' ? -difference : difference
    })
  const filteredWithdrawals = accountWithdrawals
    .filter(
      (item) =>
        !query ||
        item.date.includes(query) ||
        item.remarks.toLowerCase().includes(query),
    )
    .sort((a, b) => {
      if (historySort === 'date_desc') return b.date.localeCompare(a.date)
      if (historySort === 'date_asc') return a.date.localeCompare(b.date)
      return historySort === 'profit_desc'
        ? b.amount - a.amount
        : a.amount - b.amount
    })
  const timeline = [
    ...records.flatMap((record) => {
      const ipo = ipos.find((item) => item.id === record.ipoId)
      const events = [
        {
          id: `subscription-${record.id}`,
          date: record.subscriptionDate,
          title: '参与申购',
          subject: ipo?.name ?? '已删除新股',
          detail: `${getSubscriptionMethodLabel(
            getSubscriptionMethod(record, account),
          )} · ${formatHKD(record.subscriptionAmount, 'investment')}`,
          profit: undefined as number | undefined,
        },
      ]
      if (record.status === 'won') {
        events.push({
          id: `allotment-${record.id}`,
          date: ipo?.listingDate || record.subscriptionDate,
          title: '中签',
          subject: ipo?.name ?? '已删除新股',
          detail: `${record.allottedShares} 股 · ${record.allottedLots} 手`,
          profit: undefined,
        })
      }
      return events
    }),
    ...accountSales.map((sale) => {
      const subscription = records.find(
        (item) => item.id === sale.subscriptionId,
      )
      const ipo = ipos.find((item) => item.id === subscription?.ipoId)
      const profit =
        sale.shares * (sale.price - (ipo?.issuePrice ?? 0)) -
        (subscription?.fee ?? 0) *
          (sale.shares /
            Math.max(
              1,
              accountSales
                .filter(
                  (item) => item.subscriptionId === sale.subscriptionId,
                )
                .reduce((total, item) => total + item.shares, 0),
            )) -
        (sale.commission ?? 0)
      return {
        id: `sale-${sale.id}`,
        date: sale.date,
        title: saleMethodLabel[sale.method],
        subject: ipo?.name ?? '已删除新股',
        detail: `${sale.shares} 股 × ${formatHKD(sale.price)}`,
        profit,
      }
    }),
    ...accountWithdrawals.map((withdrawal) => ({
      id: `withdrawal-${withdrawal.id}`,
      date: withdrawal.date,
      title: '账户出金',
      subject: withdrawal.remarks || '出金记录',
      detail: formatHKD(withdrawal.amount),
      profit: undefined as number | undefined,
    })),
  ].sort((left, right) => right.date.localeCompare(left.date))

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#F4F1ED]0 hover:text-[#2E2A24]"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        返回账户列表
      </button>

      <div className="mt-5 flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#4A4540] to-[#2E2A24] text-white">
          <CreditCard size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
            账户详情
          </p>
          <h1 className="mt-1 truncate text-xl font-bold text-[#2E2A24] sm:text-3xl">
            {formatAccountName(account)}
          </h1>
          <p className="mt-1 text-sm text-[#F4F1ED]0">
            {account.brokerName || '未填写券商名称'}
          </p>
        </div>
      </div>

      <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <Summary
          label="总收益"
          value={formatHKD(stats.totalProfit, 'profit')}
          profitValue={stats.totalProfit}
          prominent
        />
        <Summary
          label="收益率"
          value={formatSignedPercent(stats.profitRate)}
          profitValue={stats.profitRate}
          prominent
        />
        <Summary
          label="累计融资成本"
          value={formatHKD(investedCapital, 'investment')}
        />
        <Summary label="现金余额" value={formatHKD(cashBalance)} />
        <Summary label="持仓市值" value={formatHKD(holdingMarketValue)} />
        <Summary
          label="可融资额度"
          value={formatHKD(collateralCapacity)}
        />
        <Summary
          label="总打新能力"
          value={formatHKD(totalIpoCapacity)}
          prominent
        />
        <Summary label="参与次数" value={`${stats.participationCount} 次`} />
        <Summary label="中签次数" value={`${stats.winCount} 次`} />
        <Summary label="未中签次数" value={`${lossCount} 次`} />
        <Summary
          label="中签率"
          value={formatPercent(stats.winRate)}
        />
        <Summary
          label="暗盘收益"
          value={formatHKD(greyStats.profit, 'profit')}
          profitValue={greyStats.profit}
        />
        <Summary
          label="首日收益"
          value={formatHKD(firstDayStats.profit, 'profit')}
          profitValue={firstDayStats.profit}
        />
        <Summary label="连续未中次数" value={`${health.consecutiveLosses} 次`} />
        <Summary
          label="最近一次中签"
          value={health.latestWinDate || '暂无中签'}
        />
        <Summary
          label="最近一次收益"
          value={formatHKD(health.latestProfit, 'profit')}
          profitValue={health.latestProfit}
        />
        <Summary
          label="账户健康度"
          value={`${health.label} · ${health.score} 分`}
        />
        <Summary
          label="平均每次收益"
          value={formatHKD(
            stats.participationCount > 0
              ? stats.totalProfit / stats.participationCount
              : 0,
            'profit',
          )}
          profitValue={stats.totalProfit}
        />
        <Summary
          label="平均持仓天数"
          value={`${averageHoldingDays.toFixed(1)} 天`}
        />
      </section>

      <AccountProfitTrend rows={profitTrend} />

      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_2fr]">
        <section className="rounded-2xl border border-[#E4DFD6]/80 bg-white p-5 shadow-card sm:p-6">
          <h2 className="font-bold text-[#2E2A24]">基础信息</h2>
          <div className="mt-4 divide-y divide-[#F4F1ED]">
            <Detail icon={User} label="账户名称" value={formatAccountName(account)} />
            <Detail icon={Phone} label="手机号" value={formatSensitiveText(account.phone)} />
            <Detail
              icon={Building2}
              label="券商名称"
              value={account.brokerName}
            />
            <Detail
              icon={Landmark}
              label="证券账号"
              value={formatSensitiveText(account.securitiesAccount)}
            />
            <Detail
              icon={Landmark}
              label="初始入金"
              value={formatHKD(account.initialDeposit, 'investment')}
            />
            <Detail
              icon={TrendingUp}
              label="当前资产"
              value={formatHKD(account.currentAssets)}
            />
            <Detail
              icon={Landmark}
              label="现金余额"
              value={formatHKD(cashBalance)}
            />
            <Detail
              icon={ChartCandlestick}
              label="持仓市值"
              value={formatHKD(holdingMarketValue)}
            />
            <Detail
              icon={CircleDollarSign}
              label="可融资额度"
              value={formatHKD(collateralCapacity)}
            />
            <Detail
              icon={CreditCard}
              label="总打新能力"
              value={formatHKD(totalIpoCapacity)}
            />
            <Detail
              icon={Landmark}
              label="原始人民币成本"
              value={formatCNY(originalCostCny)}
            />
            <Detail
              icon={CreditCard}
              label="换汇汇率"
              value={
                linkedExchange
                  ? `1 ${linkedExchange.sourceCurrency} = ${(
                      linkedExchange.manualRate ??
                      linkedExchange.exchangeRate
                    ).toFixed(6)} ${linkedExchange.targetCurrency}`
                  : '未关联换汇记录'
              }
            />
            <Detail
              icon={CircleDollarSign}
              label="当前折算人民币"
              value={fxRates.HKD > 0 ? formatCNY(currentValueCny) : '待设置HKD参考汇率'}
            />
            <Detail
              icon={TrendingUp}
              label="汇率损益"
              value={
                linkedExchange && fxRates.HKD > 0
                  ? `${exchangeProfit > 0 ? '+' : ''}${formatCNY(exchangeProfit)}`
                  : '待完善换汇数据'
              }
            />
            <Detail
              icon={Landmark}
              label="累计出金"
              value={formatHKD(stats.withdrawalTotal)}
            />
            <Detail
              icon={CircleDollarSign}
              label="当前投入资金"
              value={formatHKD(investedCapital, 'investment')}
            />
            <Detail
              icon={CreditCard}
              label="默认申购方式"
              value={getSubscriptionMethodLabel(
                getAccountDefaultSubscriptionMethod(account),
              )}
            />
            <Detail
              icon={FileText}
              label="备注"
              value={account.remarks}
              multiline
            />
          </div>
        </section>

        <section className="rounded-2xl border border-[#E4DFD6]/80 bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-bold text-[#2E2A24]">账户全部历史</h2>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E4DFD6] px-3 py-2 text-xs font-semibold text-[#736A5C]"
              onClick={() => exportAccountHistoryCsv(account.id, data)}
            >
              <Download size={14} />
              导出 CSV
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-1 rounded-xl bg-[#F4F1ED] p-1">
            {[
              ['participation', `参与记录 ${records.length}`],
              [
                'allotments',
                `中签记录 ${records.filter((item) => item.status === 'won').length}`,
              ],
              [
                'losses',
                `未中签 ${records.filter((item) => item.status === 'lost').length}`,
              ],
              ['sales', `卖出记录 ${accountSales.length}`],
              ['withdrawals', `出金记录 ${accountWithdrawals.length}`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${
                  activeTab === key
                    ? 'bg-white text-[#2E2A24] shadow-sm'
                    : 'text-[#F4F1ED]'
                }`}
                onClick={() =>
                  setActiveTab(
                    key as
                      | 'participation'
                      | 'allotments'
                      | 'losses'
                      | 'sales'
                      | 'withdrawals',
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A296]"
              />
              <input
                value={historySearch}
                placeholder="搜索新股、代码或备注"
                className="focus-ring w-full rounded-xl border border-[#E4DFD6] py-2.5 pl-9 pr-3 text-sm"
                onChange={(event) => setHistorySearch(event.target.value)}
              />
            </label>
            <select
              value={historySort}
              className="rounded-xl border border-[#E4DFD6] bg-white px-3 py-2.5 text-sm text-[#736A5C]"
              onChange={(event) =>
                setHistorySort(
                  event.target.value as
                    | 'date_desc'
                    | 'date_asc'
                    | 'profit_desc'
                    | 'profit_asc',
                )
              }
            >
              <option value="date_desc">日期：最新</option>
              <option value="date_asc">日期：最早</option>
              <option value="profit_desc">金额/收益：高到低</option>
              <option value="profit_asc">金额/收益：低到高</option>
            </select>
          </div>

          {(activeTab === 'participation' ||
            activeTab === 'allotments' ||
            activeTab === 'losses') && (
            <HistoryRecords
              records={
                activeTab === 'allotments'
                  ? filteredRecords.filter((item) => item.status === 'won')
                  : activeTab === 'losses'
                    ? filteredRecords.filter((item) => item.status === 'lost')
                  : filteredRecords
              }
              ipos={ipos}
              sales={sales}
              onEdit={setEditingSubscription}
            />
          )}
          {activeTab === 'sales' && (
            <div className="mt-4 space-y-3">
              {filteredSales.length === 0 ? (
                <EmptyHistory label="暂无卖出记录" />
              ) : (
                filteredSales.map((sale) => {
                  const subscription = records.find(
                    (item) => item.id === sale.subscriptionId,
                  )
                  const ipo = ipos.find(
                    (item) => item.id === subscription?.ipoId,
                  )
                  return (
                    <div
                      key={sale.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F4F1ED] p-4 text-sm"
                    >
                      <div>
                        <p className="font-bold text-[#4A4540]">
                          {ipo?.name ?? '-'}（{ipo?.stockCode ?? '-'}）
                        </p>
                        <p className="mt-1 text-xs text-[#A8A296]">
                          {saleMethodLabel[sale.method]} · {sale.date}
                        </p>
                      </div>
                      <p className="font-semibold text-[#5A5246]">
                        {sale.shares} 股 × {formatHKD(sale.price)}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          )}
          {activeTab === 'withdrawals' && (
            <div className="mt-4 space-y-3">
              {filteredWithdrawals.length === 0 ? (
                <EmptyHistory label="暂无出金记录" />
              ) : (
                filteredWithdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F4F1ED] p-4 text-sm"
                  >
                    <div>
                      <p className="font-bold text-[#4A4540]">
                        {withdrawal.date}
                      </p>
                      <p className="mt-1 text-xs text-[#A8A296]">
                        {withdrawal.remarks || '无备注'}
                      </p>
                    </div>
                    <p className="font-semibold text-[#5A5246]">
                      {formatHKD(withdrawal.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>

      <section className="mt-7 rounded-2xl border border-[#E4DFD6]/80 bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-brand-600" />
          <div>
            <h2 className="font-bold text-[#2E2A24]">账户时间轴</h2>
            <p className="mt-1 text-xs text-[#A8A296]">
              申购、中签、卖出和出金按时间倒序展示
            </p>
          </div>
        </div>
        {timeline.length === 0 ? (
          <EmptyHistory label="暂无账户动态" />
        ) : (
          <div className="relative mt-6 space-y-0 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-[#E4DFD6]">
            {timeline.map((event) => (
              <div
                key={event.id}
                className="relative grid gap-2 pb-6 pl-7 sm:grid-cols-[110px_1fr_auto]"
              >
                <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-white bg-brand-500 ring-2 ring-brand-100" />
                <time className="text-xs font-medium text-[#A8A296]">
                  {event.date || '-'}
                </time>
                <div>
                  <p className="text-sm font-bold text-[#4A4540]">
                    {event.subject}
                  </p>
                  <p className="mt-1 text-xs text-[#F4F1ED]0">
                    {event.title} · {event.detail}
                  </p>
                </div>
                {event.profit !== undefined && (
                  <p
                    className={`text-sm font-bold ${getProfitColor(
                      event.profit,
                    )}`}
                  >
                    {formatHKD(event.profit, 'profit')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      <Modal
        open={Boolean(editingSubscription)}
        title="编辑历史申购记录"
        description="可修改参与账户、申购方式、申购日期和备注。"
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

function HistoryRecords({
  records,
  ipos,
  sales,
  onEdit,
}: {
  records: ReturnType<typeof useAppData>['subscriptions']
  ipos: ReturnType<typeof useAppData>['ipos']
  sales: ReturnType<typeof useAppData>['sales']
  onEdit?: (subscription: AccountSubscription) => void
}) {
  if (records.length === 0) return <EmptyHistory label="暂无相关记录" />

  return (
    <div className="mt-4 space-y-4">
      {records.map((subscription) => {
                const ipo = ipos.find((item) => item.id === subscription.ipoId)
                const recordSales = sales.filter(
                  (sale) => sale.subscriptionId === subscription.id,
                )
                const metrics = getSubscriptionMetrics(
                  subscription,
                  ipo,
                  sales,
                )
                return (
                  <article
                    key={subscription.id}
                    className="rounded-xl border border-[#F4F1ED] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-[#4A4540]">
                            {ipo?.name ?? '已删除新股'}（{ipo?.stockCode ?? '-'}）
                          </p>
                          <Status status={subscription.status} />
                          {onEdit && (
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-[#A8A296] hover:bg-[#F4F1ED] hover:text-[#5A5246]"
                              aria-label="编辑历史申购"
                              onClick={() => onEdit(subscription)}
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#A8A296]">
                          申购 {subscription.subscriptionDate} ·{' '}
                          {formatHKD(
                            subscription.subscriptionAmount,
                            'investment',
                          )}
                        </p>
                        <p className="mt-1 text-xs font-medium text-[#F4F1ED]0">
                          资金来源：{getFundingSourceLabel(subscription.fundingSource)}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p
                          className={`text-sm font-bold ${getProfitColor(
                            metrics.netProfit,
                          )}`}
                        >
                          {formatHKD(metrics.netProfit, 'profit')}
                        </p>
                        <p
                          className={`mt-1 text-[10px] ${getProfitColor(
                            metrics.profitRate,
                          )}`}
                        >
                          收益率{' '}
                          {formatPercent(metrics.profitRate, 'profitRate')}
                        </p>
                      </div>
                    </div>
                    {subscription.status === 'won' && (
                      <div className="mt-3 flex flex-wrap gap-3 rounded-lg bg-[#F4F1ED] px-3 py-2 text-xs text-[#F4F1ED]0">
                        <span>
                          中签 {subscription.allottedShares} 股 /{' '}
                          {subscription.allottedLots} 手
                        </span>
                        <span>已卖 {metrics.soldShares} 股</span>
                        <span>持有 {metrics.remainingShares} 股</span>
                      </div>
                    )}
                    {recordSales.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {recordSales.map((sale) => (
                          <div
                            key={sale.id}
                            className="flex flex-wrap justify-between gap-2 text-xs text-[#F4F1ED]0"
                          >
                            <span>
                              {saleMethodLabel[sale.method]} · {sale.date}
                            </span>
                            <span>
                              {sale.shares} 股 × {formatHKD(sale.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
    </div>
  )
}

function EmptyHistory({ label }: { label: string }) {
  return (
    <div className="rounded-xl bg-[#F4F1ED] px-4 py-12 text-center text-sm text-[#A8A296]">
      {label}
    </div>
  )
}

type AccountSubscription =
  ReturnType<typeof useAppData>['subscriptions'][number]
type AccountSale = ReturnType<typeof useAppData>['sales'][number]
type AccountIpo = ReturnType<typeof useAppData>['ipos'][number]

function compareHistoryRecords(
  left: AccountSubscription,
  right: AccountSubscription,
  sort: 'date_desc' | 'date_asc' | 'profit_desc' | 'profit_asc',
  ipos: AccountIpo[],
  sales: AccountSale[],
) {
  if (sort === 'date_desc') {
    return right.subscriptionDate.localeCompare(left.subscriptionDate)
  }
  if (sort === 'date_asc') {
    return left.subscriptionDate.localeCompare(right.subscriptionDate)
  }
  const leftProfit = getSubscriptionMetrics(
    left,
    ipos.find((item) => item.id === left.ipoId),
    sales,
  ).netProfit
  const rightProfit = getSubscriptionMetrics(
    right,
    ipos.find((item) => item.id === right.ipoId),
    sales,
  ).netProfit
  return sort === 'profit_desc'
    ? rightProfit - leftProfit
    : leftProfit - rightProfit
}

function saleProfit(
  sale: AccountSale,
  subscriptions: AccountSubscription[],
  ipos: AccountIpo[],
) {
  const subscription = subscriptions.find(
    (item) => item.id === sale.subscriptionId,
  )
  const ipo = ipos.find((item) => item.id === subscription?.ipoId)
  return (
    sale.shares * (sale.price - (ipo?.issuePrice ?? 0)) -
    (sale.commission ?? 0)
  )
}

function Summary({
  label,
  value,
  profitValue,
  prominent = false,
}: {
  label: string
  value: string
  profitValue?: number
  prominent?: boolean
}) {
  const color =
    profitValue === undefined ? 'text-[#2E2A24]' : getProfitColor(profitValue)
  return (
    <div className="rounded-2xl border border-[#E4DFD6]/80 bg-white p-5 shadow-card">
      <p className="text-xs text-[#A8A296]">{label}</p>
      <p
        className={`mt-2 font-bold tabular-nums ${color} ${
          prominent ? 'text-2xl sm:text-3xl' : 'text-xl'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function AccountProfitTrend({
  rows,
}: {
  rows: ReturnType<typeof getProfitTrend>
}) {
  const values = rows.map((row) => row.cumulativeProfit)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const range = max - min || 1
  const points = rows.map((row, index) => ({
    x: rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100,
    y: 82 - ((row.cumulativeProfit - min) / range) * 66,
  }))
  const latest = rows[rows.length - 1]?.cumulativeProfit ?? 0

  return (
    <section className="mt-7 rounded-2xl border border-[#E4DFD6]/80 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-bold text-[#2E2A24]">累计收益趋势</h2>
          <p className="mt-1 text-xs text-[#A8A296]">
            按卖出月份汇总账户累计收益
          </p>
        </div>
        <p className={`text-lg font-bold ${getProfitColor(latest)}`}>
          {formatHKD(latest, 'profit')}
        </p>
      </div>
      {rows.length === 0 ? (
        <EmptyHistory label="录入卖出记录后将生成收益趋势" />
      ) : (
        <div className="mt-5 overflow-hidden sm:overflow-x-auto">
          <div className="min-w-0 sm:min-w-[560px]">
            <svg
              viewBox="0 0 100 100"
              className="h-52 w-full"
              preserveAspectRatio="none"
            >
              {[16, 38, 60, 82].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <polyline
                points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
                fill="none"
                stroke={getProfitColor(latest, 'hex')}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`,
              }}
            >
              {rows.map((row) => (
                <div key={row.label} className="text-center">
                  <p
                    className={`text-[10px] font-semibold ${getProfitColor(
                      row.cumulativeProfit,
                    )}`}
                  >
                    {formatHKD(row.cumulativeProfit, 'profit')}
                  </p>
                  <p className="mt-1 text-[10px] text-[#A8A296]">
                    {row.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Detail({
  icon: Icon,
  label,
  value,
  multiline = false,
}: {
  icon: typeof Trophy
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className="flex gap-3 py-4">
      <Icon size={17} className="mt-0.5 shrink-0 text-[#A8A296]" />
      <div className="min-w-0">
        <p className="text-xs text-[#A8A296]">{label}</p>
        <p
          className={`mt-1 text-sm font-medium text-[#5A5246] ${
            multiline ? 'whitespace-pre-wrap leading-6' : 'break-all'
          }`}
        >
          {value || '-'}
        </p>
      </div>
    </div>
  )
}

function Status({
  status,
}: {
  status: 'applied' | 'announced' | 'lost' | 'won'
}) {
  const style = {
    applied: ['已申购', 'bg-[#F8F4F1] text-[#7E5D53]'],
    announced: ['已公布', 'bg-[#FAF6EF] text-[#7D653C]'],
    lost: ['未中签', 'bg-[#F4F1ED] text-[#F4F1ED]'],
    won: ['已中签', 'bg-[#F2F5F2] text-emerald-700'],
  }[status]
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style[1]}`}>
      {style[0]}
    </span>
  )
}

const saleMethodLabel = {
  grey_market: '暗盘卖出',
  first_day: '首日卖出',
  held_sale: '持有后卖出',
}
