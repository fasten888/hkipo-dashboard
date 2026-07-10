import {
  ArrowRightLeft,
  Calculator,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { StatCard } from '../../components/ui/StatCard'
import { useAppData } from '../../hooks/useAppData'
import type {
  ExchangeCurrency,
  ExchangeRecord,
  ExchangeRecordInput,
} from '../../types/exchange'
import { formatAccountName } from '../../utils/account'
import { getProfitColor } from '../../utils/profit'
import { shouldHideMoney } from '../../services/privacy'
import { ExchangeForm } from './ExchangeForm'

const cnyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
})

const foreignFormatters = {
  CNY: cnyFormatter,
  HKD: new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 2,
  }),
  USD: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }),
}

export function ExchangePage() {
  const data = useAppData()
  const {
    accounts,
    exchangeRecords,
    fxRates,
    addExchangeRecord,
    updateExchangeRecord,
    deleteExchangeRecord,
    updateFxRates,
  } = data
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExchangeRecord | null>(null)
  const [deleting, setDeleting] = useState<ExchangeRecord | null>(null)
  const [search, setSearch] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState<'all' | ExchangeCurrency>(
    'all',
  )
  const [yearFilter, setYearFilter] = useState('all')
  const [hkdRate, setHkdRate] = useState(fxRates.HKD ? String(fxRates.HKD) : '')
  const [usdRate, setUsdRate] = useState(fxRates.USD ? String(fxRates.USD) : '')
  const [rateMessage, setRateMessage] = useState('')

  const years = useMemo(
    () =>
      [...new Set(exchangeRecords.map((record) => record.date.slice(0, 4)))]
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a)),
    [exchangeRecords],
  )

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return exchangeRecords
      .filter(
        (record) =>
          currencyFilter === 'all' ||
          record.targetCurrency === currencyFilter,
      )
      .filter(
        (record) =>
          yearFilter === 'all' || record.date.startsWith(yearFilter),
      )
      .filter((record) => {
        const account = accounts.find((item) => item.id === record.accountId)
        return (
          !query ||
          account?.name.toLowerCase().includes(query) ||
          account?.accountSuffix.includes(query) ||
          record.remarks.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [accounts, currencyFilter, exchangeRecords, search, yearFilter])

  const metrics = useMemo(() => {
    return rows.reduce(
      (result, record) => {
        const cost = record.originalCostCny + record.feeCny
        const referenceRate =
          record.targetCurrency === 'CNY'
            ? 1
            : fxRates[record.targetCurrency]
        const currentValue =
          referenceRate > 0 ? record.targetAmount / referenceRate : 0
        const profit = referenceRate > 0 ? currentValue - cost : 0
        return {
          cost: result.cost + cost,
          currentValue: result.currentValue + currentValue,
          profit: result.profit + profit,
          valuedCount: result.valuedCount + (referenceRate > 0 ? 1 : 0),
        }
      },
      { cost: 0, currentValue: 0, profit: 0, valuedCount: 0 },
    )
  }, [fxRates, rows])

  const save = (input: ExchangeRecordInput) => {
    if (editing) updateExchangeRecord(editing.id, input)
    else addExchangeRecord(input)
    setEditing(null)
    setFormOpen(false)
  }

  const saveRates = () => {
    const HKD = Number(hkdRate)
    const USD = Number(usdRate)
    if (HKD < 0 || USD < 0 || !Number.isFinite(HKD) || !Number.isFinite(USD)) {
      setRateMessage('请输入有效的参考汇率。')
      return
    }
    updateFxRates({ HKD, USD })
    setRateMessage('期末参考汇率已保存')
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-end gap-2 flex-wrap">
        <button
          type="button"
          disabled={accounts.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus size={17} />
          新增换汇
        </button>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="人民币总成本"
          value={formatCNY(metrics.cost)}
          hint={`${rows.length} 笔换汇，含换汇费用`}
          icon={WalletCards}
          tone="blue"
        />
        <StatCard
          label="外币当前估值"
          value={
            metrics.valuedCount > 0
              ? formatCNY(metrics.currentValue)
              : '待设置汇率'
          }
          hint="按期末参考汇率折算人民币"
          icon={Calculator}
          tone="violet"
        />
        <StatCard
          label="汇兑损益"
          value={formatCNY(metrics.profit)}
          hint="当前人民币估值 - 原始人民币成本"
          icon={metrics.profit >= 0 ? TrendingUp : TrendingDown}
          tone="emerald"
          profitValue={metrics.profit}
        />
        <StatCard
          label="汇兑亏损"
          value={formatCNY(Math.max(0, -metrics.profit))}
          hint={
            metrics.valuedCount < rows.length
              ? '部分记录尚未设置参考汇率'
              : '负汇兑损益的绝对值'
          }
          icon={TrendingDown}
          tone="amber"
          profitValue={metrics.profit < 0 ? metrics.profit : 0}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-[#E4DFD6]/80 bg-white p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <ArrowRightLeft size={19} />
          </div>
          <div>
            <h2 className="font-bold text-[#2E2A24]">期末参考汇率</h2>
            
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <RateField
            label="1 CNY = 港币"
            currency="HKD"
            value={hkdRate}
            placeholder="例如 1.080000"
            onChange={setHkdRate}
          />
          <RateField
            label="1 CNY = 美元"
            currency="USD"
            value={usdRate}
            placeholder="例如 0.138000"
            onChange={setUsdRate}
          />
          <button
            type="button"
            className="rounded-xl bg-[#2E2A24] px-5 py-3 text-sm font-semibold text-white"
            onClick={saveRates}
          >
            保存参考汇率
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#A8A296]">
          {fxRates.updatedAt && (
            <span>
              上次更新：
              {new Date(fxRates.updatedAt).toLocaleString('zh-CN')}
            </span>
          )}
          {rateMessage && <span className="text-brand-600">{rateMessage}</span>}
        </div>
      </section>

      <div className="mt-6 grid gap-3 rounded-2xl border border-[#E4DFD6] bg-white p-4 shadow-card md:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A296]"
          />
          <input
            value={search}
            placeholder="搜索账户、后四位或备注"
            className="focus-ring w-full rounded-xl border border-[#E4DFD6] py-2.5 pl-10 pr-4 text-sm"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          value={currencyFilter}
          className="rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-2.5 text-sm"
          onChange={(event) =>
            setCurrencyFilter(
              event.target.value as 'all' | ExchangeCurrency,
            )
          }
        >
          <option value="all">全部币种</option>
          <option value="HKD">港币 HKD</option>
          <option value="USD">美元 USD</option>
        </select>
        <select
          value={yearFilter}
          className="rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-2.5 text-sm"
          onChange={(event) => setYearFilter(event.target.value)}
        >
          <option value="all">全部年份</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year} 年
            </option>
          ))}
        </select>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-[#E4DFD6]/80 bg-white shadow-card">
        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-[#A8A296]">
            暂无换汇记录
          </p>
        ) : (
          <div className="divide-y divide-[#F4F1ED]">
            {rows.map((record) => {
              const account = accounts.find(
                (item) => item.id === record.accountId,
              )
              const referenceRate =
                record.targetCurrency === 'CNY'
                  ? 1
                  : fxRates[record.targetCurrency]
              const currentValue =
                referenceRate > 0
                  ? record.targetAmount / referenceRate
                  : null
              const cost = record.originalCostCny + record.feeCny
              const profit =
                currentValue === null ? null : currentValue - cost
              return (
                <article
                  key={record.id}
                  className="grid gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[1.1fr_1fr_1fr_auto] lg:items-center"
                >
                  <div>
                    <p className="font-bold text-[#4A4540]">
                      {account ? formatAccountName(account) : '已删除账户'}
                    </p>
                    
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:block">
                    <RecordDatum
                      label="原币金额"
                      value={formatForeign(
                        record.sourceAmount,
                        record.sourceCurrency,
                      )}
                    />
                    <RecordDatum
                      label="人民币成本"
                      value={formatCNY(cost)}
                    />
                    <RecordDatum
                      label="实际到账"
                      value={formatForeign(
                        record.targetAmount,
                        record.targetCurrency,
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:block">
                    <RecordDatum
                      label="成交汇率"
                      value={`1 ${record.sourceCurrency} = ${(record.manualRate ?? record.exchangeRate).toFixed(6)} ${record.targetCurrency}`}
                    />
                    
                    <p
                      className={`mt-2 text-sm font-bold ${
                        profit === null
                          ? 'text-[#A8A296]'
                          : getProfitColor(profit)
                      }`}
                    >
                      {profit === null
                        ? '待设置参考汇率'
                        : `汇兑损益 ${formatCNY(profit)}`}
                    </p>
                  </div>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      className="grid h-11 w-11 place-items-center rounded-xl text-[#A8A296] hover:bg-[#F4F1ED]"
                      aria-label="编辑换汇记录"
                      onClick={() => {
                        setEditing(record)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="grid h-11 w-11 place-items-center rounded-xl text-[#A8A296] hover:bg-[#F9F2F0] hover:text-[#9A7468]"
                      aria-label="删除换汇记录"
                      onClick={() => setDeleting(record)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <ExchangeInsight title="汇率损益" eyebrow="FX RESULT" description="将真实换汇成本和期末参考汇率放在一起看。">
          <div className="mt-4 space-y-3">
            <ExchangeInsightRow label="人民币总成本" value={formatCNY(metrics.cost)} />
            <ExchangeInsightRow
              label="外币当前估值"
              value={metrics.valuedCount > 0 ? formatCNY(metrics.currentValue) : '待设置汇率'}
            />
            <ExchangeInsightRow label="汇兑损益" value={formatCNY(metrics.profit)} className={getProfitColor(metrics.profit)} />
          </div>
        </ExchangeInsight>
        <ExchangeInsight title="最近换汇" eyebrow="ACTIVITY" description="最近三笔换汇，方便回看资金来源。">
          <div className="mt-4 space-y-3">
            {rows.slice(0, 3).map((record) => {
              const account = accounts.find((item) => item.id === record.accountId)
              return (
                <ExchangeInsightRow
                  key={record.id}
                  label={account ? formatAccountName(account) : '已删除账户'}
                  value={formatForeign(record.targetAmount, record.targetCurrency)}
                />
              )
            })}
            {rows.length === 0 && <p className="text-sm font-medium text-[#A8A296]">暂无换汇动态</p>}
          </div>
        </ExchangeInsight>
        <ExchangeInsight title="AI 建议" eyebrow="AI" description="预留年度人民币口径复盘。">
          <p className="mt-4 text-sm font-semibold leading-6 text-[#5A5246]">
            已估值 {metrics.valuedCount} / {rows.length} 笔换汇。年底复盘时建议先补齐 HKD/USD 期末参考汇率。
          </p>
        </ExchangeInsight>
      </section>

      <Modal
        open={formOpen}
        title={editing ? '编辑换汇记录' : '新增换汇记录'}
        description="输入人民币支出与实际到账外币，系统自动计算成交汇率。"
        fullScreenOnMobile
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      >
        <ExchangeForm
          accounts={accounts}
          record={editing}
          onSubmit={save}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="删除换汇记录"
        message="删除后人民币投入与汇兑盈亏会自动重新计算。"
        onConfirm={() => {
          if (deleting) deleteExchangeRecord(deleting.id)
          setDeleting(null)
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}


function formatCNY(value: number) {
  if (shouldHideMoney('amount')) return '¥ ••••••'
  return cnyFormatter.format(value).replace('CN¥', '¥ ')
}

function formatForeign(value: number, currency: ExchangeCurrency) {
  if (shouldHideMoney('amount')) {
    return `${currency === 'HKD' ? 'HK$' : 'US$'} ••••••`
  }
  return foreignFormatters[currency].format(value)
}

function RateField({
  label,
  currency,
  value,
  placeholder,
  onChange,
}: {
  label: string
  currency: ExchangeCurrency
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-[#5A5246]">
        {label}
      </span>
      <div className="relative">
        <input
          value={value}
          inputMode="decimal"
          placeholder={placeholder}
          className="focus-ring w-full rounded-xl border border-[#E4DFD6] py-3 pl-3.5 pr-14 text-sm"
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="absolute inset-y-0 right-3.5 flex items-center text-xs font-semibold text-[#A8A296]">
          {currency}
        </span>
      </div>
    </label>
  )
}

function RecordDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-[#A8A296]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#5A5246]">{value}</p>
    </div>
  )
}

function ExchangeInsight({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E4DFD6]/80 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A8A296]">{eyebrow}</p>
      <h2 className="mt-2 text-lg font-bold text-[#2E2A24]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#8C8273]">{description}</p>
      {children}
    </section>
  )
}

function ExchangeInsightRow({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F4F1ED]/70 px-3 py-2">
      <span className="min-w-0 truncate text-sm font-medium text-[#8C8273]">{label}</span>
      <span className={`shrink-0 whitespace-nowrap text-sm font-bold tabular-nums text-[#4A4540] ${className}`}>{value}</span>
    </div>
  )
}
