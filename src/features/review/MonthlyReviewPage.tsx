import { CalendarRange, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatCard } from '../../components/ui/StatCard'
import { useAppData } from '../../hooks/useAppData'
import { formatHKD, formatPercent } from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import { getMonthlyReviews } from '../../utils/analysis'
import { getSubscriptionMetrics } from '../../utils/statistics'

export function MonthlyReviewPage() {
  const { subscriptions, ipos, sales, exchangeRecords, fxRates } = useAppData()
  const reviews = useMemo(
    () => getMonthlyReviews(subscriptions, ipos, sales),
    [ipos, sales, subscriptions],
  )
  const years = [...new Set(reviews.map((item) => item.month.slice(0, 4)))]
  const [selectedYear, setSelectedYear] = useState(years[0] ?? '')
  const year = selectedYear || years[0] || ''
  const yearRows = reviews.filter((item) => item.month.startsWith(year))
  const [selectedMonth, setSelectedMonth] = useState('')
  const month = selectedMonth || yearRows[0]?.month || ''
  const current = yearRows.find((item) => item.month === month)
  const annual = yearRows.reduce(
    (result, row) => ({
      participation: result.participation + row.participation,
      wins: result.wins + row.wins,
      losses: result.losses + row.losses,
      profit: result.profit + row.profit,
    }),
    { participation: 0, wins: 0, losses: 0, profit: 0 },
  )
  const annualDecided = annual.wins + annual.losses
  const annualSubscriptions = subscriptions.filter((item) =>
    item.subscriptionDate.startsWith(year),
  )
  const annualSubscriptionIds = new Set(
    annualSubscriptions.map((item) => item.id),
  )
  const annualSales = sales.filter((sale) =>
    annualSubscriptionIds.has(sale.subscriptionId),
  )
  const sourceProfit = (source: typeof annualSubscriptions[number]['fundingSource']) =>
    annualSubscriptions
      .filter((item) => item.fundingSource === source)
      .reduce((total, item) => {
        const ipo = ipos.find((entry) => entry.id === item.ipoId)
        return total + getSubscriptionMetrics(item, ipo, annualSales).netProfit
      }, 0)
  const cashProfit = sourceProfit('cash')
  const collateralProfit = sourceProfit('collateral')
  const financingFees = annualSubscriptions
    .filter((item) => item.fundingSource !== 'cash')
    .reduce((total, item) => total + item.fee, 0)
  const annualNetProfit = annualSubscriptions.reduce((total, item) => {
    const ipo = ipos.find((entry) => entry.id === item.ipoId)
    return total + getSubscriptionMetrics(item, ipo, annualSales).netProfit
  }, 0)
  const tradingCommission = annualSales.reduce(
    (total, sale) => total + (sale.commission ?? 0),
    0,
  )
  const annualExchangeProfit = exchangeRecords
    .filter((record) => record.date.startsWith(year))
    .reduce((total, record) => {
      const rate =
        record.targetCurrency === 'CNY'
          ? 1
          : fxRates[record.targetCurrency]
      if (rate <= 0 || record.originalCostCny <= 0) return total
      return (
        total +
        record.targetAmount / rate -
        record.originalCostCny -
        record.feeCny
      )
    }, 0)
  const tradingProfitCny =
    fxRates.HKD > 0 ? annualNetProfit / fxRates.HKD : 0
  const comprehensiveProfitCny = tradingProfitCny + annualExchangeProfit

  return (
    <>
      <div className="mb-5 flex items-center justify-end gap-2 flex-wrap">
        <div className="flex gap-2">
          <select
            value={year}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
            onChange={(event) => {
              setSelectedYear(event.target.value)
              setSelectedMonth('')
            }}
          >
            {years.map((item) => (
              <option key={item} value={item}>
                {item} 年
              </option>
            ))}
          </select>
          <select
            value={month}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            {yearRows.map((item) => (
              <option key={item.month} value={item.month}>
                {Number(item.month.slice(5))} 月
              </option>
            ))}
          </select>
        </div>
      </div>

      {!current ? (
        <div className="mt-7 rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-sm text-slate-400 shadow-card">
          暂无可复盘的数据
        </div>
      ) : (
        <>
          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="参与次数"
              value={String(current.participation)}
              hint={`${current.wins} 次中签 · ${current.losses} 次未中签`}
              icon={CalendarRange}
              tone="blue"
            />
            <StatCard
              label="中签率"
              value={formatPercent(current.winRate)}
              hint={`${current.month.replace('-', ' 年 ')} 月`}
              icon={Target}
              tone="amber"
            />
            <StatCard
              label="月度收益"
              value={formatHKD(current.profit, 'profit')}
              hint={`收益率 ${formatPercent(current.profitRate, 'profitRate')}`}
              icon={TrendingUp}
              tone="emerald"
              profitValue={current.profit}
            />
            <StatCard
              label="年度累计收益"
              value={formatHKD(annual.profit, 'profit')}
              hint={`${year} 年共参与 ${annual.participation} 次`}
              icon={TrendingUp}
              tone="violet"
              profitValue={annual.profit}
            />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <IpoReviewCard
              title="最佳新股"
              name={current.bestIpoName}
              profit={current.bestIpoProfit}
              icon={TrendingUp}
            />
            <IpoReviewCard
              title="最差新股"
              name={current.worstIpoName}
              profit={current.worstIpoProfit}
              icon={TrendingDown}
            />
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
            <div>
              <h2 className="font-bold text-slate-900">年度资金来源收益</h2>
              <p className="mt-1 text-xs text-slate-400">
                按申购记录的独立资金来源统计
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <AnnualMetric label="现金账户收益" value={cashProfit} />
              <AnnualMetric label="抵押账户收益" value={collateralProfit} />
              <AnnualMetric label="融资费用" value={-financingFees} />
              <AnnualMetric label="年度净收益" value={annualNetProfit} />
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
            <h2 className="font-bold text-slate-900">年度综合收益</h2>
            <p className="mt-1 text-xs text-slate-400">
              港股交易按期末 HKD/CNY 参考汇率折算人民币
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <AnnualMetric label="打新净收益" value={annualNetProfit} />
              <AnnualMetric label="融资成本" value={-financingFees} />
              <AnnualMetric label="交易佣金" value={-tradingCommission} />
              <CnyMetric label="汇率损益" value={annualExchangeProfit} />
              <CnyMetric
                label="综合人民币收益"
                value={comprehensiveProfitCny}
              />
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
              港股打新交易收益：{formatHKD(annualNetProfit, 'profit')} ·
              汇率损益：{formatCNY(annualExchangeProfit)} · 综合收益：
              {fxRates.HKD > 0
                ? formatCNY(comprehensiveProfitCny)
                : '待设置 HKD 参考汇率'}
            </div>
          </section>

          <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
            <div className="px-5 py-5">
              <h2 className="font-bold text-slate-900">{year} 年度汇总</h2>
              <p className="mt-1 text-xs text-slate-400">
                年度中签率{' '}
                {formatPercent(
                  annualDecided > 0
                    ? (annual.wins / annualDecided) * 100
                    : 0,
                )}
              </p>
            </div>
            <div className="divide-y divide-slate-100 sm:hidden">
              {yearRows.map((row) => (
                <article key={row.month} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-800">{row.month}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        最佳新股：{row.bestIpoName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getProfitColor(row.profit)}`}>
                        {formatHKD(row.profit, 'profit')}
                      </p>
                      <p className={`mt-1 text-xs font-semibold ${getProfitColor(row.profitRate)}`}>
                        {formatPercent(row.profitRate, 'profitRate')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                    <ReviewDatum label="参与" value={row.participation} />
                    <ReviewDatum label="中签" value={row.wins} tone="red" />
                    <ReviewDatum label="未中" value={row.losses} tone="green" />
                    <ReviewDatum label="中签率" value={formatPercent(row.winRate)} />
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[760px]">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    {[
                      '月份',
                      '参与',
                      '中签',
                      '未中签',
                      '中签率',
                      '收益',
                      '收益率',
                      '最佳新股',
                    ].map((label) => (
                      <th key={label} className="px-5 py-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {yearRows.map((row) => (
                    <tr key={row.month}>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {row.month}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {row.participation}
                      </td>
                      <td className="px-5 py-4 text-red-500">{row.wins}</td>
                      <td className="px-5 py-4 text-green-500">{row.losses}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatPercent(row.winRate)}
                      </td>
                      <td
                        className={`px-5 py-4 font-semibold ${getProfitColor(
                          row.profit,
                        )}`}
                      >
                        {formatHKD(row.profit, 'profit')}
                      </td>
                      <td
                        className={`px-5 py-4 ${getProfitColor(
                          row.profitRate,
                        )}`}
                      >
                        {formatPercent(row.profitRate, 'profitRate')}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {row.bestIpoName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}

function AnnualMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 text-lg font-bold ${getProfitColor(value)}`}>
        {formatHKD(value, 'profit')}
      </p>
    </div>
  )
}

const cnyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
})

function formatCNY(value: number) {
  return cnyFormatter.format(value).replace('CN¥', '¥ ')
}

function CnyMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 text-lg font-bold ${getProfitColor(value)}`}>
        {formatCNY(value)}
      </p>
    </div>
  )
}

function ReviewDatum({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: 'red' | 'green'
}) {
  return (
    <div>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p
        className={`mt-1 text-xs font-bold ${
          tone === 'red'
            ? 'text-red-500'
            : tone === 'green'
              ? 'text-green-500'
              : 'text-slate-700'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function IpoReviewCard({
  title,
  name,
  profit,
  icon: Icon,
}: {
  title: string
  name: string
  profit: number
  icon: typeof TrendingUp
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400">{title}</p>
        <Icon size={18} className="text-slate-300" />
      </div>
      <p className="mt-3 text-lg font-bold text-slate-800">{name}</p>
      <p className={`mt-1 text-xl font-bold ${getProfitColor(profit)}`}>
        {formatHKD(profit, 'profit')}
      </p>
    </div>
  )
}
