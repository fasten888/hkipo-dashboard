import {
  BarChart3,
  CircleDollarSign,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatCard } from '../../components/ui/StatCard'
import { useAppData } from '../../hooks/useAppData'
import { usePersistentState } from '../../hooks/usePersistentState'
import { usePrivacy } from '../../hooks/usePrivacy'
import { formatAccountName } from '../../utils/account'
import { formatHKD, formatPercent } from '../../utils/currency'
import { getProfitColor } from '../../utils/profit'
import { getSubscriptionMethodLabel } from '../../utils/subscriptionMethod'
import { getSaleStrategyStats } from '../../utils/analysis'
import {
  getAccountStats,
  getFinancingStats,
  getIpoStats,
  getSaleTypeStats,
  getIndustryStats,
  getSystemStats,
} from '../../utils/statistics'
import {
  RankingDetailModal,
  type RankingDetailTarget,
} from './RankingDetailModal'

type AccountRankMetric =
  | 'totalProfit'
  | 'profitRate'
  | 'participationCount'
  | 'winCount'
  | 'winRate'
  | 'assets'
type IpoRankMetric =
  | 'profit_desc'
  | 'profit_asc'
  | 'rate_desc'
  | 'rate_asc'
  | 'win_desc'
  | 'participants_desc'

export function StatisticsPage() {
  const { accounts, ipos, subscriptions, sales, withdrawals } = useAppData()
  const { settings: privacySettings } = usePrivacy()
  const [curveAccountId, setCurveAccountId] = useState('')
  const [accountRankMetric, setAccountRankMetric] =
    usePersistentState<AccountRankMetric>(
      'statistics-account-ranking',
      'totalProfit',
    )
  const [accountRankDirection, setAccountRankDirection] = usePersistentState<
    'asc' | 'desc'
  >('statistics-account-direction', 'desc')
  const [ipoRankMetric, setIpoRankMetric] =
    usePersistentState<IpoRankMetric>(
      'statistics-ipo-ranking',
      'profit_desc',
    )
  const [rankingDetail, setRankingDetail] =
    useState<RankingDetailTarget | null>(null)
  const systemStats = getSystemStats(accounts, subscriptions, ipos, sales)
  const greyStats = getSaleTypeStats(
    'grey_market',
    subscriptions,
    ipos,
    sales,
  )
  const firstDayStats = getSaleTypeStats(
    'first_day',
    subscriptions,
    ipos,
    sales,
  )
  const heldStats = getSaleTypeStats('held_sale', subscriptions, ipos, sales)
  const financingStats = getFinancingStats(
    subscriptions,
    ipos,
    sales,
    accounts,
  )
  const industryStats = getIndustryStats(subscriptions, ipos, sales)
  const strategyStats = getSaleStrategyStats(subscriptions, ipos, sales)
  const saleCount = greyStats.count + firstDayStats.count + heldStats.count
  const averageProfitRate =
    saleCount > 0
      ? (greyStats.averageProfitRate * greyStats.count +
          firstDayStats.averageProfitRate * firstDayStats.count +
          heldStats.averageProfitRate * heldStats.count) /
        saleCount
      : 0
  const averageHoldingDays =
    saleCount > 0
      ? (greyStats.averageHoldingDays * greyStats.count +
          firstDayStats.averageHoldingDays * firstDayStats.count +
          heldStats.averageHoldingDays * heldStats.count) /
        saleCount
      : 0
  const accountRows = useMemo(
    () =>
      accounts
        .map((account) => {
          const records = subscriptions.filter(
            (item) => item.accountId === account.id,
          )
          return {
            id: account.id,
            name: formatAccountName(account, privacySettings),
            initialDeposit: account.initialDeposit,
            ...getAccountStats(
              account,
              subscriptions,
              ipos,
              sales,
              withdrawals,
            ),
            lossCount: Math.max(
              0,
              account.legacyParticipationCount +
                records.length -
                (account.legacyWinCount +
                  records.filter((item) => item.status === 'won').length),
            ),
          }
        })
        .sort((a, b) => b.totalProfit - a.totalProfit),
    [
      accounts,
      ipos,
      privacySettings,
      sales,
      subscriptions,
      withdrawals,
    ],
  )
  const ipoRows = useMemo(
    () =>
      ipos
        .map((ipo) => {
          const records = subscriptions.filter((item) => item.ipoId === ipo.id)
          return {
            id: ipo.id,
            name: `${ipo.name}（${ipo.stockCode}）`,
            ...getIpoStats(ipo, subscriptions, sales),
            loserCount: Math.max(
              0,
              new Set(records.map((item) => item.accountId)).size -
                new Set(
                  records
                    .filter((item) => item.status === 'won')
                    .map((item) => item.accountId),
                ).size,
            ),
          }
        })
        .sort((a, b) => b.totalProfit - a.totalProfit),
    [ipos, sales, subscriptions],
  )
  const accountRankingRows = useMemo(() => {
    const assetMap = new Map(accounts.map((item) => [item.id, item.currentAssets]))
    return [...accountRows].sort((a, b) => {
      const left =
        accountRankMetric === 'assets'
          ? assetMap.get(a.id) ?? 0
          : a[accountRankMetric]
      const right =
        accountRankMetric === 'assets'
          ? assetMap.get(b.id) ?? 0
          : b[accountRankMetric]
      return accountRankDirection === 'asc' ? left - right : right - left
    })
  }, [accountRankDirection, accountRankMetric, accountRows, accounts])
  const ipoRankingRows = useMemo(() => {
    const [metric, direction] = ipoRankMetric.split('_') as [
      'profit' | 'rate' | 'win' | 'participants',
      'asc' | 'desc',
    ]
    const value = (row: (typeof ipoRows)[number]) => {
      if (metric === 'profit') return row.totalProfit
      if (metric === 'rate') return row.profitRate
      if (metric === 'win') return row.winRate
      return row.participantCount
    }
    return [...ipoRows].sort((a, b) =>
      direction === 'asc' ? value(a) - value(b) : value(b) - value(a),
    )
  }, [ipoRankMetric, ipoRows])
  const monthly = useMemo(() => {
    const map = new Map<
      string,
      {
        month: string
        participation: number
        wins: number
        decided: number
        profit: number
      }
    >()
    subscriptions.forEach((subscription) => {
      const month = subscription.subscriptionDate.slice(0, 7)
      if (!month) return
      const row = map.get(month) ?? {
        month,
        participation: 0,
        wins: 0,
        decided: 0,
        profit: 0,
      }
      row.participation += 1
      if (subscription.status === 'won') row.wins += 1
      if (subscription.status === 'won' || subscription.status === 'lost') {
        row.decided += 1
      }
      row.profit -= subscription.fee
      map.set(month, row)
    })
    sales.forEach((sale) => {
      const subscription = subscriptions.find(
        (item) => item.id === sale.subscriptionId,
      )
      const ipo = ipos.find((item) => item.id === subscription?.ipoId)
      const month = sale.date.slice(0, 7)
      if (!subscription || !ipo || !month) return
      const row = map.get(month) ?? {
        month,
        participation: 0,
        wins: 0,
        decided: 0,
        profit: 0,
      }
      row.profit +=
        sale.shares * (sale.price - ipo.issuePrice) -
        (sale.commission ?? 0)
      map.set(month, row)
    })
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month))
  }, [ipos, sales, subscriptions])
  const selectedAccountId = curveAccountId || accounts[0]?.id || ''
  const accountCurve = useMemo(() => {
    const monthChanges = new Map<string, number>()
    subscriptions
      .filter((item) => item.accountId === selectedAccountId)
      .forEach((subscription) => {
        const month = subscription.subscriptionDate.slice(0, 7)
        if (month) {
          monthChanges.set(
            month,
            (monthChanges.get(month) ?? 0) - subscription.fee,
          )
        }
        const ipo = ipos.find((item) => item.id === subscription.ipoId)
        sales
          .filter((sale) => sale.subscriptionId === subscription.id)
          .forEach((sale) => {
            const saleMonth = sale.date.slice(0, 7)
            if (!saleMonth) return
            monthChanges.set(
              saleMonth,
              (monthChanges.get(saleMonth) ?? 0) +
                sale.shares * (sale.price - (ipo?.issuePrice ?? 0)) -
                (sale.commission ?? 0),
            )
          })
      })
    let cumulative = 0
    return [...monthChanges.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, change]) => {
        cumulative += change
        return { label: month, value: cumulative, display: formatHKD(cumulative) }
      })
  }, [ipos, sales, selectedAccountId, subscriptions])

  return (
    <>
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          V1 · 分析中心
        </div>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          数据统计
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          对比账户和新股表现，观察月度收益与参与趋势。
        </p>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="总收益"
          value={formatHKD(systemStats.totalProfit, 'profit')}
          hint={`${sales.length} 条卖出记录`}
          icon={CircleDollarSign}
          tone="emerald"
          profitValue={systemStats.totalProfit}
        />
        <StatCard
          label="总收益率"
          value={formatPercent(systemStats.profitRate, 'profitRate')}
          hint={`总投入 ${formatHKD(systemStats.totalInvestment, 'investment')}`}
          icon={Target}
          tone="blue"
          profitValue={systemStats.profitRate}
        />
        <StatCard
          label="总中签次数"
          value={String(systemStats.winCount)}
          hint={`中签率 ${formatPercent(systemStats.winRate)}`}
          icon={Trophy}
          tone="amber"
        />
        <StatCard
          label="总申购次数"
          value={String(systemStats.participationCount)}
          hint={`${accounts.length} 个账户`}
          icon={BarChart3}
          tone="violet"
        />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="暗盘收益"
          value={formatHKD(greyStats.profit, 'profit')}
          hint={`暗盘胜率 ${formatPercent(greyStats.winRate)}`}
          icon={CircleDollarSign}
          tone="emerald"
          profitValue={greyStats.profit}
        />
        <StatCard
          label="首日收益"
          value={formatHKD(firstDayStats.profit, 'profit')}
          hint={`首日胜率 ${formatPercent(firstDayStats.winRate)}`}
          icon={CircleDollarSign}
          tone="violet"
          profitValue={firstDayStats.profit}
        />
        <StatCard
          label="平均收益率"
          value={formatPercent(averageProfitRate, 'profitRate')}
          hint={`平均持有 ${averageHoldingDays.toFixed(1)} 天`}
          icon={Target}
          tone="blue"
          profitValue={averageProfitRate}
        />
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <ProfitSourceAnalysis
          totalProfit={systemStats.totalProfit}
          rows={[
            {
              label: '暗盘收益',
              profit: greyStats.profit,
              rate: greyStats.averageProfitRate,
            },
            {
              label: '首日收益',
              profit: firstDayStats.profit,
              rate: firstDayStats.averageProfitRate,
            },
            {
              label: '持有收益',
              profit: heldStats.profit,
              rate: heldStats.averageProfitRate,
            },
          ]}
        />
        <FinancingAnalysis rows={financingStats} />
      </div>

      <SaleStrategyAnalysis rows={strategyStats} />

      <section className="mt-7 grid gap-6 xl:grid-cols-2">
        <AccountProfitRanking
          title="赚钱账户"
          subtitle="累计收益为正 · 收益从高到低"
          type="profit"
          hidden={privacySettings.accountRanking}
          rows={[...accountRows]
            .filter((row) => row.totalProfit > 0)
            .sort((left, right) => right.totalProfit - left.totalProfit)}
        />
        <AccountProfitRanking
          title="亏钱账户"
          subtitle="累计收益为负 · 亏损从高到低"
          type="loss"
          hidden={privacySettings.accountRanking}
          rows={[...accountRows]
            .filter((row) => row.totalProfit < 0)
            .sort((left, right) => left.totalProfit - right.totalProfit)}
        />
      </section>

      <IndustryAnalysis rows={industryStats} />

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="xl:col-span-2 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <select
            value={accountRankMetric}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            onChange={(event) =>
              setAccountRankMetric(event.target.value as AccountRankMetric)
            }
          >
            <option value="totalProfit">账户收益排行</option>
            <option value="profitRate">账户收益率排行</option>
            <option value="participationCount">账户参与次数排行</option>
            <option value="winCount">账户中签次数排行</option>
            <option value="winRate">账户中签率排行</option>
            <option value="assets">账户资产规模排行</option>
          </select>
          <button
            type="button"
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600"
            onClick={() =>
              setAccountRankDirection((current) =>
                current === 'asc' ? 'desc' : 'asc',
              )
            }
          >
            {accountRankDirection === 'asc' ? '升序' : '降序'}
          </button>
          <select
            value={ipoRankMetric}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            onChange={(event) =>
              setIpoRankMetric(event.target.value as IpoRankMetric)
            }
          >
            <option value="profit_desc">最赚钱新股</option>
            <option value="profit_asc">最亏钱新股</option>
            <option value="rate_desc">收益率最高</option>
            <option value="rate_asc">收益率最低</option>
            <option value="win_desc">中签率最高</option>
            <option value="participants_desc">参与人数最多</option>
          </select>
        </section>
        <div className="hidden md:block">
          <Ranking
            title="账户排行榜"
            kind="account"
            hidden={privacySettings.accountRanking}
            onOutcomeSelect={(id, outcome) =>
              setRankingDetail({ scope: 'account', id, outcome })
            }
            rows={accountRankingRows.map((row) => ({
              id: row.id,
              name: row.name,
              primary: formatHKD(row.totalProfit, 'profit'),
              value: row.totalProfit,
              winCount: row.winCount,
              lossCount: row.lossCount,
              totalCount: row.participationCount,
            }))}
          />
        </div>
        <Ranking
          title="新股排行榜"
          kind="ipo"
          hidden={privacySettings.ipoRanking}
          onOutcomeSelect={(id, outcome) =>
            setRankingDetail({ scope: 'ipo', id, outcome })
          }
          rows={ipoRankingRows.map((row) => ({
            id: row.id,
            name: row.name,
            primary: formatHKD(row.totalProfit, 'profit'),
            value: row.totalProfit,
            winCount: row.winnerCount,
            lossCount: row.loserCount,
            totalCount: row.participantCount,
          }))}
        />
        <TrendChart
          title="月度收益趋势"
          profitColors
          rows={monthly.map((row) => ({
            label: row.month,
            value: row.profit,
            display: formatHKD(row.profit, 'profit'),
          }))}
        />
        <TrendChart
          title="月度中签率"
          rows={monthly.map((row) => ({
            label: row.month,
            value: row.decided > 0 ? (row.wins / row.decided) * 100 : 0,
            display: formatPercent(
              row.decided > 0 ? (row.wins / row.decided) * 100 : 0,
            ),
          }))}
        />
        <TrendChart
          title="参与次数趋势"
          rows={monthly.map((row) => ({
            label: row.month,
            value: row.participation,
            display: `${row.participation} 次`,
          }))}
        />
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card xl:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={17} className="text-brand-600" />
              <h2 className="font-bold text-slate-900">账户收益曲线</h2>
            </div>
            <select
              value={selectedAccountId}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm"
              onChange={(event) => setCurveAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {formatAccountName(account)}
                </option>
              ))}
            </select>
          </div>
          <Curve rows={accountCurve} />
        </section>
      </div>
      <RankingDetailModal
        target={rankingDetail}
        accounts={accounts}
        ipos={ipos}
        subscriptions={subscriptions}
        sales={sales}
        onClose={() => setRankingDetail(null)}
      />
    </>
  )
}

function ProfitSourceAnalysis({
  totalProfit,
  rows,
}: {
  totalProfit: number
  rows: { label: string; profit: number; rate: number }[]
}) {
  const denominator =
    rows.reduce((total, row) => total + Math.abs(row.profit), 0) || 1
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-900">收益来源分析</h2>
          <p className="mt-1 text-xs text-slate-400">按卖出方式拆分收益贡献</p>
        </div>
        <p className={`text-lg font-bold ${getProfitColor(totalProfit)}`}>
          {formatHKD(totalProfit, 'profit')}
        </p>
      </div>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {row.label}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  收益率 {formatPercent(row.rate, 'profitRate')}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${getProfitColor(row.profit)}`}>
                  {formatHKD(row.profit, 'profit')}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  占比 {formatPercent((Math.abs(row.profit) / denominator) * 100)}
                </p>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={getProfitColor(row.profit, 'background')}
                style={{
                  width: `${(Math.abs(row.profit) / denominator) * 100}%`,
                  height: '100%',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FinancingAnalysis({
  rows,
}: {
  rows: ReturnType<typeof getFinancingStats>
}) {
  const best = [...rows]
    .filter((row) => row.participationCount > 0)
    .sort(
      (left, right) => right.averageProfitRate - left.averageProfitRate,
    )[0]
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex items-start justify-between gap-4 px-5 py-5">
        <div>
          <h2 className="font-bold text-slate-900">申购方式分析</h2>
          <p className="mt-1 text-xs text-slate-400">
            比较现金与 10x 融资的参与、命中和收益表现
          </p>
        </div>
        {best && (
          <div className="rounded-xl bg-brand-50 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold text-brand-500">
              最佳申购方式
            </p>
            <p className="mt-0.5 text-sm font-bold text-brand-700">
              {getSubscriptionMethodLabel(best.method)}
            </p>
          </div>
        )}
      </div>
      <div className="grid gap-3 px-4 pb-4 sm:hidden">
        {rows.map((row) => (
          <article
            key={row.method}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-800">
                {getSubscriptionMethodLabel(row.method)}
              </h3>
              <p className={`text-base font-bold ${getProfitColor(row.totalProfit)}`}>
                {formatHKD(row.totalProfit, 'profit')}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <StrategyMetric label="参与次数" value={`${row.participationCount} 次`} />
              <StrategyMetric label="中签次数" value={`${row.winCount} 次`} />
              <StrategyMetric label="中签率" value={formatPercent(row.winRate)} />
              <StrategyMetric
                label="平均收益率"
                value={formatPercent(row.averageProfitRate, 'profitRate')}
              />
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[700px]">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              {['方式', '参与', '中签', '中签率', '总收益', '平均收益', '平均收益率'].map(
                (label) => (
                  <th key={label} className="px-4 py-3 font-semibold">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {rows.map((row) => (
              <tr key={row.method}>
                <td className="px-4 py-3 font-bold text-slate-800">
                  {getSubscriptionMethodLabel(row.method)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {row.participationCount}
                </td>
                <td className="px-4 py-3 text-red-500">{row.winCount}</td>
                <td className="px-4 py-3 text-slate-600">
                  {formatPercent(row.winRate)}
                </td>
                <td className={`px-4 py-3 font-semibold ${getProfitColor(row.totalProfit)}`}>
                  {formatHKD(row.totalProfit, 'profit')}
                </td>
                <td className={`px-4 py-3 ${getProfitColor(row.averageProfit)}`}>
                  {formatHKD(row.averageProfit, 'profit')}
                </td>
                <td className={`px-4 py-3 ${getProfitColor(row.averageProfitRate)}`}>
                  {formatPercent(row.averageProfitRate, 'profitRate')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Curve({
  rows,
}: {
  rows: { label: string; value: number; display: string }[]
}) {
  if (rows.length === 0) {
    return <p className="py-12 text-center text-sm text-slate-400">暂无数据</p>
  }
  const min = Math.min(...rows.map((row) => row.value), 0)
  const max = Math.max(...rows.map((row) => row.value), 1)
  const range = max - min || 1
  const points = rows.map((row, index) => ({
    ...row,
    x: rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100,
    y: 92 - ((row.value - min) / range) * 82,
  }))
  const lineColor = getProfitColor(points[points.length - 1]?.value ?? 0, 'hex')
  return (
    <div className="mt-6 overflow-hidden sm:overflow-x-auto">
      <div className="min-w-0 sm:min-w-[560px]">
        <svg viewBox="0 0 100 100" className="h-56 w-full" preserveAspectRatio="none">
          <polyline
            points={points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((point) => (
            <circle
              key={point.label}
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill={getProfitColor(point.value, 'hex')}
            />
          ))}
        </svg>
        <div className="flex justify-between gap-4">
          {points.map((point) => (
            <div key={point.label} className="min-w-0 text-center">
              <p
                className={`text-[10px] font-semibold ${getProfitColor(
                  point.value,
                )}`}
              >
                {point.display}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">{point.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Ranking({
  title,
  rows,
  kind,
  hidden,
  onOutcomeSelect,
}: {
  title: string
  kind: 'account' | 'ipo'
  hidden: boolean
  onOutcomeSelect: (id: string, outcome: 'won' | 'lost') => void
  rows: {
    id: string
    name: string
    primary: string
    value: number
    winCount: number
    lossCount: number
    totalCount: number
  }[]
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Trophy size={17} className="text-amber-500" />
        <h2 className="font-bold text-slate-900">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">暂无数据</p>
      ) : (
        <div className="mt-5 space-y-4">
          {rows.slice(0, 8).map((row, index) => (
            <div
              key={row.id}
              className="rounded-xl px-1 py-1 transition hover:bg-slate-50"
            >
              <p className="truncate text-sm font-semibold text-slate-700">
                <span className="mr-2 text-slate-300">{index + 1}</span>
                {row.name}
              </p>
              <p
                className={`mt-2 text-base font-bold ${getProfitColor(
                  row.value,
                )}`}
              >
                {hidden ? '••••••' : row.primary}
              </p>
              {hidden ? (
                <p className="mt-2 text-xs font-medium text-slate-400">
                  ••••••
                </p>
              ) : (
                <div className="mt-2 space-y-1 text-xs font-medium">
                  <button
                    type="button"
                    className="block font-semibold text-red-500 hover:underline"
                    onClick={() => onOutcomeSelect(row.id, 'won')}
                  >
                    {kind === 'account'
                      ? `${row.winCount} 次中签`
                      : `${row.winCount} 个账户中签`}
                  </button>
                  <button
                    type="button"
                    className="block font-semibold text-green-500 hover:underline"
                    onClick={() => onOutcomeSelect(row.id, 'lost')}
                  >
                    {kind === 'account'
                      ? `${row.lossCount} 次未中签`
                      : `${row.lossCount} 个账户未中签`}
                  </button>
                  <span className="block text-slate-500">
                    {kind === 'account'
                      ? `${row.totalCount} 次参与`
                      : `总参与 ${row.totalCount} 个账户`}
                  </span>
                </div>
              )}
              {!hidden && (
                <HitStructureBar
                  winCount={row.winCount}
                  lossCount={row.lossCount}
                  totalCount={row.totalCount}
                  unit={kind === 'account' ? '次' : '个账户'}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function HitStructureBar({
  winCount,
  lossCount,
  totalCount,
  unit,
}: {
  winCount: number
  lossCount: number
  totalCount: number
  unit: string
}) {
  const denominator = Math.max(totalCount, 1)
  const winWidth = (winCount / denominator) * 100
  const lossWidth = (lossCount / denominator) * 100

  return (
    <div className="group relative mt-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-red-500"
          style={{ width: `${winWidth}%` }}
        />
        <div
          className="h-full bg-green-500"
          style={{ width: `${lossWidth}%` }}
        />
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs leading-5 text-white shadow-lg group-hover:block">
        <p>中签：{winCount}{unit}</p>
        <p>未中签：{lossCount}{unit}</p>
        <p>参与：{totalCount}{unit}</p>
      </div>
    </div>
  )
}

function AccountProfitRanking({
  title,
  subtitle,
  rows,
  hidden,
  type,
}: {
  title: string
  subtitle: string
  hidden: boolean
  type: 'profit' | 'loss'
  rows: {
    id: string
    name: string
    totalProfit: number
    profitRate: number
    participationCount: number
    winCount: number
  }[]
}) {
  const Icon = type === 'profit' ? TrendingUp : TrendingDown
  const emptyText =
    type === 'profit' ? '目前还没有盈利账户' : '很好，目前没有亏损账户'

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            type === 'profit'
              ? 'bg-red-50 text-red-500'
              : 'bg-green-50 text-green-500'
          }`}
        >
          <Icon size={18} />
        </span>
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100 px-5">
        {rows.map((row, index) => (
          <button
            type="button"
            key={row.id}
            className="flex w-full flex-col gap-3 py-4 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            onClick={() => {
              window.location.hash = `#/accounts/${encodeURIComponent(row.id)}`
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  index < 3
                    ? type === 'profit'
                      ? 'bg-red-50 text-red-500'
                      : 'bg-green-50 text-green-500'
                    : 'bg-slate-50 text-slate-400'
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {row.name}
                </p>
                <p className="mt-1 truncate text-xs font-medium text-slate-400">
                  {hidden
                    ? '••••••'
                    : `${row.winCount} 次中签 · ${row.participationCount} 次参与`}
                </p>
              </div>
            </div>
            <div className="flex w-full items-end justify-between border-t border-slate-100 pt-3 sm:w-auto sm:shrink-0 sm:flex-col sm:border-0 sm:pt-0 sm:text-right">
              <span className="text-xs font-medium text-slate-400 sm:hidden">
                点击查看详情
              </span>
              <div className="text-right">
              <p
                className={`whitespace-nowrap text-base font-bold tabular-nums ${getProfitColor(
                  row.totalProfit,
                )}`}
              >
                {hidden ? 'HK$ ••••••' : formatHKD(row.totalProfit, 'profit')}
              </p>
              <p
                className={`mt-1 text-xs font-semibold tabular-nums ${getProfitColor(
                  row.profitRate,
                )}`}
              >
                {hidden
                  ? '**%'
                  : formatPercent(row.profitRate, 'profitRate')}
              </p>
              </div>
            </div>
          </button>
        ))}
        {rows.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  )
}

function SaleStrategyAnalysis({
  rows,
}: {
  rows: ReturnType<typeof getSaleStrategyStats>
}) {
  const activeRows = rows.filter((row) => row.count > 0)
  const best = [...activeRows].sort(
    (left, right) => right.averageProfitRate - left.averageProfitRate,
  )[0]
  const maxProfit = Math.max(
    ...rows.map((row) => Math.abs(row.totalProfit)),
    1,
  )
  const methodLabels = {
    grey_market: '暗盘卖出',
    first_day: '首日卖出',
    held_sale: '持有卖出',
  }

  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-900">卖出策略分析</h2>
          <p className="mt-1 text-xs text-slate-400">
            对比暗盘、首日和持有卖出的收益、收益率与胜率
          </p>
        </div>
        {best && (
          <div className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-brand-800">
            历史数据显示：
            <span className="font-bold">{methodLabels[best.method]}</span>
            平均收益率 {formatPercent(best.averageProfitRate, 'profitRate')}，
            建议优先关注该策略。
          </div>
        )}
      </div>
      <div className="grid gap-4 p-5 lg:grid-cols-3">
        {rows.map((row) => (
          <article
            key={row.method}
            className="rounded-2xl border border-slate-100 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                {methodLabels[row.method]}
              </h3>
              <span className="text-xs text-slate-400">{row.count} 次</span>
            </div>
            <p
              className={`mt-3 text-xl font-bold ${getProfitColor(
                row.totalProfit,
              )}`}
            >
              {formatHKD(row.totalProfit, 'profit')}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={getProfitColor(row.totalProfit, 'background')}
                style={{
                  height: '100%',
                  width: `${(Math.abs(row.totalProfit) / maxProfit) * 100}%`,
                }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <StrategyMetric label="盈利次数" value={`${row.profitCount} 次`} />
              <StrategyMetric label="亏损次数" value={`${row.lossCount} 次`} />
              <StrategyMetric
                label="平均收益"
                value={formatHKD(row.averageProfit, 'profit')}
              />
              <StrategyMetric
                label="平均收益率"
                value={formatPercent(row.averageProfitRate, 'profitRate')}
              />
              <StrategyMetric
                label="胜率"
                value={formatPercent(row.winRate)}
              />
              <StrategyMetric label="参与次数" value={`${row.count} 次`} />
            </div>
          </article>
        ))}
      </div>
      <div className="border-t border-slate-100 px-5 py-4">
        <p className="text-xs font-semibold text-slate-500">暗盘 VS 首日</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {['总收益', '平均收益率', '胜率'].map((label, index) => {
            const grey = rows.find((row) => row.method === 'grey_market')
            const first = rows.find((row) => row.method === 'first_day')
            const values = [
              [grey?.totalProfit ?? 0, first?.totalProfit ?? 0],
              [grey?.averageProfitRate ?? 0, first?.averageProfitRate ?? 0],
              [grey?.winRate ?? 0, first?.winRate ?? 0],
            ][index]
            return (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  暗盘 {index === 0 ? formatHKD(values[0], 'profit') : formatPercent(values[0])}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  首日 {index === 0 ? formatHKD(values[1], 'profit') : formatPercent(values[1])}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function StrategyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-700">{value}</p>
    </div>
  )
}

function IndustryAnalysis({
  rows,
}: {
  rows: ReturnType<typeof getIndustryStats>
}) {
  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex items-start justify-between gap-4 px-5 py-5">
        <div>
          <h2 className="font-bold text-slate-900">行业分析</h2>
          <p className="mt-1 text-xs text-slate-400">
            按新股行业汇总参与、中签率与累计收益
          </p>
        </div>
        <div className="flex gap-2">
          {rows[0] && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-right">
              <p className="text-[10px] font-semibold text-red-500">最赚钱行业</p>
              <p className="mt-0.5 text-sm font-bold text-red-500">
                {rows[0].industry}
              </p>
            </div>
          )}
          {rows.length > 1 && (
            <div className="rounded-xl bg-green-50 px-3 py-2 text-right">
              <p className="text-[10px] font-semibold text-green-500">最差行业</p>
              <p className="mt-0.5 text-sm font-bold text-green-500">
                {rows[rows.length - 1].industry}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-3 px-4 pb-4 sm:hidden">
        {rows.map((row, index) => (
          <article
            key={row.industry}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-300">
                  TOP {index + 1}
                </p>
                <h3 className="mt-1 font-bold text-slate-800">
                  {row.industry}
                </h3>
              </div>
              <p className={`text-base font-bold ${getProfitColor(row.totalProfit)}`}>
                {formatHKD(row.totalProfit, 'profit')}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <StrategyMetric label="参与" value={`${row.participationCount} 次`} />
              <StrategyMetric label="中签" value={`${row.winCount} 次`} />
              <StrategyMetric label="中签率" value={formatPercent(row.winRate)} />
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px]">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              {[
                '排名',
                '行业',
                '参与次数',
                '中签次数',
                '中签率',
                '累计收益',
              ].map((label) => (
                <th key={label} className="px-5 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {rows.map((row, index) => (
              <tr key={row.industry}>
                <td className="px-5 py-4 text-slate-400">{index + 1}</td>
                <td className="px-5 py-4 font-bold text-slate-800">
                  {row.industry}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {row.participationCount}
                </td>
                <td className="px-5 py-4 text-red-500">{row.winCount}</td>
                <td className="px-5 py-4 text-slate-600">
                  {formatPercent(row.winRate)}
                </td>
                <td
                  className={`px-5 py-4 font-semibold ${getProfitColor(
                    row.totalProfit,
                  )}`}
                >
                  {formatHKD(row.totalProfit, 'profit')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TrendChart({
  title,
  rows,
  profitColors = false,
}: {
  title: string
  profitColors?: boolean
  rows: { label: string; value: number; display: string }[]
}) {
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1)
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <BarChart3 size={17} className="text-brand-600" />
        <h2 className="font-bold text-slate-900">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">暂无数据</p>
      ) : (
        <div className="mt-6 flex h-52 items-end gap-1 overflow-hidden pb-1 sm:gap-3 sm:overflow-x-auto">
          {rows.slice(-12).map((row) => (
            <div
              key={row.label}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end sm:min-w-12"
            >
              <span
                className={`mb-2 text-[10px] font-semibold ${
                  profitColors
                    ? getProfitColor(row.value)
                    : 'text-slate-500'
                }`}
              >
                {row.display}
              </span>
              <div
                className={`w-full max-w-10 rounded-t-lg ${
                  profitColors
                    ? getProfitColor(row.value, 'background')
                    : 'bg-brand-500'
                }`}
                style={{
                  height: `${Math.max(4, (Math.abs(row.value) / max) * 150)}px`,
                }}
              />
              <span className="mt-2 text-[10px] text-slate-400">
                {row.label.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
