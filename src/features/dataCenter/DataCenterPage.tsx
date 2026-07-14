import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'

type ProviderStatus = 'Healthy' | 'Offline' | 'Degraded' | 'Disabled'

interface SyncLogRow {
  id: string
  provider: string
  status: string
  startTime: string
  endTime: string | null
  durationMs: number | null
  added: number
  updated: number
  failed: number
  message: string | null
}

interface DataCenterPayload {
  ipoSync: {
    lastSyncTime: string | null
    dataSource: string
    added: number
    updated: number
    failed: number
    providerStatus: ProviderStatus
  }
  providerStatus: Array<{
    provider: string
    status: ProviderStatus
    lastSyncTime: string | null
    added: number
    updated: number
    failed: number
    message: string | null
  }>
  providerMetrics: Array<{
    provider: string
    status: ProviderStatus
    lastSyncTime: string | null
    added: number
    updated: number
    failed: number
    message: string | null
  }>
  syncLogs: SyncLogRow[]
  accountCount: number
  ipoCount: number
  historyCount: number
}

const accountTemplate = [
  '账户名称,券商,币种,现金,冻结资金,融资倍数,状态,备注',
  '示例账户,致富证券,HKD,100000,0,10,active,模板示例',
].join('\n')

const historyTemplates = {
  subscriptions: [
    '账户名称,股票代码,新股名称,申购日期,申购方式,申购金额,手续费,备注',
    '示例账户,09999,示例新股,2026-07-10,10x融资,100000,100,模板示例',
  ].join('\n'),
  allotments: [
    '账户名称,股票代码,新股名称,中签股数,中签手数,状态',
    '示例账户,09999,示例新股,100,1,已中签',
  ].join('\n'),
  sales: [
    '账户名称,股票代码,新股名称,卖出日期,卖出方式,卖出价格,卖出股数,佣金',
    '示例账户,09999,示例新股,2026-07-15,首日卖出,12.8,100,20',
  ].join('\n'),
}

export function DataCenterPage() {
  const [data, setData] = useState<DataCenterPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [importNotice, setImportNotice] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/data-center', {
        headers: { accept: 'application/json' },
      })
      const payload = await response.json() as { ok: boolean; data: DataCenterPayload; message?: string }
      if (!response.ok) {
        throw new Error(payload.message ?? '读取数据中心失败')
      }
      setData(payload.data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '读取数据中心失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const latestLog = data?.syncLogs[0]
  const totalProviderFailures = useMemo(
    () => data?.providerMetrics.reduce((total, provider) => total + provider.failed, 0) ?? 0,
    [data],
  )

  async function runSync() {
    setSyncing(true)
    setError('')
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { accept: 'application/json' },
      })
      const payload = await response.json() as { ok?: boolean; message?: string }
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.message ?? '同步失败')
      }
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '同步失败')
    } finally {
      setSyncing(false)
    }
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>, label: string) {
    const file = event.target.files?.[0]
    if (!file) return
    setImportNotice(`${label} 已选择：${file.name}。导入解析会在下一步接入数据库写入。`)
    event.target.value = ''
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}
      {importNotice && (
        <div className="rounded-[22px] border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-700">
          {importNotice}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-[#E4DFD6]/80 bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A8A296]">IPO SYNC</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[#2E2A24]">IPO 同步中心</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#8C8273]">
                统一查看官方 IPO 同步状态，手动触发同步，并核对新增、更新和失败数量。
              </p>
            </div>
            <button
              type="button"
              onClick={runSync}
              disabled={syncing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#B08B7E] px-5 text-sm font-bold text-white shadow-[0_16px_36px_rgba(176,139,126,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              立即同步
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="最后同步时间" value={formatDateTime(data?.ipoSync.lastSyncTime)} icon={Clock3} />
            <Metric label="数据源" value={data?.ipoSync.dataSource ?? '-'} icon={Database} />
            <Metric label="新增 / 更新" value={`${data?.ipoSync.added ?? 0} / ${data?.ipoSync.updated ?? 0}`} icon={Activity} />
            <Metric label="失败" value={String(data?.ipoSync.failed ?? 0)} icon={AlertTriangle} tone="danger" />
          </div>
        </div>

        <div className="rounded-[28px] border border-[#E4DFD6]/80 bg-white p-5 shadow-card sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A8A296]">SUMMARY</p>
          <h2 className="mt-2 text-xl font-bold text-[#2E2A24]">数据资产</h2>
          <div className="mt-5 space-y-3">
            <SummaryRow label="账户数量" value={`${data?.accountCount ?? 0} 个`} />
            <SummaryRow label="IPO 数量" value={`${data?.ipoCount ?? 0} 只`} />
            <SummaryRow label="历史记录" value={`${data?.historyCount ?? 0} 条`} />
            <SummaryRow label="Provider 失败" value={`${totalProviderFailures} 次`} />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E4DFD6]/80 bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A8A296]">PROVIDERS</p>
            <h2 className="mt-2 text-xl font-bold text-[#2E2A24]">Provider 状态</h2>
          </div>
          <StatusBadge status={data?.ipoSync.providerStatus ?? 'Disabled'} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(data?.providerStatus ?? []).map((provider) => (
            <article key={provider.provider} className="rounded-2xl bg-[#F4F1ED]/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-[#2E2A24]">{provider.provider}</h3>
                <StatusBadge status={provider.status} />
              </div>
              <p className="mt-3 text-xs font-medium text-[#8C8273]">
                最后同步：{formatDateTime(provider.lastSyncTime)}
              </p>
              <p className="mt-2 text-xs font-semibold text-[#A8A296]">
                新增 {provider.added} · 更新 {provider.updated} · 失败 {provider.failed}
              </p>
            </article>
          ))}
          {!data && loading && <SkeletonRows count={4} />}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E4DFD6]/80 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A8A296]">SYNC LOGS</p>
            <h2 className="mt-2 text-xl font-bold text-[#2E2A24]">同步日志</h2>
          </div>
          <p className="text-sm font-medium text-[#A8A296]">
            最近 20 条 · 最新：{formatDateTime(latestLog?.endTime ?? latestLog?.startTime)}
          </p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[#F4F1ED] text-xs font-bold uppercase tracking-[0.12em] text-[#A8A296]">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">开始时间</th>
                <th className="px-4 py-3">结束时间</th>
                <th className="px-4 py-3">耗时</th>
                <th className="px-4 py-3">新增</th>
                <th className="px-4 py-3">更新</th>
                <th className="px-4 py-3">失败</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F1ED]">
              {(data?.syncLogs ?? []).map((log) => (
                <tr key={log.id} className="transition hover:bg-[#F8F4F1]">
                  <td className="px-4 py-3 font-bold text-[#4A4540]">{log.provider}</td>
                  <td className="px-4 py-3"><LogStatus status={log.status} /></td>
                  <td className="px-4 py-3 text-[#8C8273]">{formatDateTime(log.startTime)}</td>
                  <td className="px-4 py-3 text-[#8C8273]">{formatDateTime(log.endTime)}</td>
                  <td className="px-4 py-3 text-[#8C8273]">{formatDuration(log.durationMs)}</td>
                  <td className="px-4 py-3 font-semibold text-[#7E9587]">{log.added}</td>
                  <td className="px-4 py-3 font-semibold text-[#8E87A6]">{log.updated}</td>
                  <td className="px-4 py-3 font-semibold text-[#9A7468]">{log.failed}</td>
                </tr>
              ))}
              {!loading && (data?.syncLogs.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm font-medium text-[#A8A296]">
                    暂无同步日志
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ImportPanel
          title="账户导入"
          description="下载模板后可上传 Excel 或 CSV。当前先作为导入入口，不自动覆盖现有账户。"
          templateName="hkipo-account-template.csv"
          template={accountTemplate}
          onFile={(event) => handleImportFile(event, '账户导入')}
        />
        <section className="rounded-[28px] border border-[#E4DFD6]/80 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#E9E7EE] text-[#8E87A6]">
              <History size={19} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2E2A24]">历史导入</h2>
              <p className="mt-1 text-sm leading-6 text-[#8C8273]">
                分别导入申购、中签和卖出记录，后续会接入字段校验和写入预览。
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <HistoryImportAction label="申购记录导入" template={historyTemplates.subscriptions} fileName="hkipo-subscriptions-template.csv" onFile={handleImportFile} />
            <HistoryImportAction label="中签记录导入" template={historyTemplates.allotments} fileName="hkipo-allotments-template.csv" onFile={handleImportFile} />
            <HistoryImportAction label="卖出记录导入" template={historyTemplates.sales} fileName="hkipo-sales-template.csv" onFile={handleImportFile} />
          </div>
        </section>
      </section>
    </div>
  )
}

function Metric({ label, value, icon: Icon, tone = 'default' }: { label: string; value: string; icon: typeof Database; tone?: 'default' | 'danger' }) {
  return (
    <div className="rounded-2xl bg-[#F4F1ED]/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#A8A296]">{label}</p>
        <Icon size={17} className={tone === 'danger' ? 'text-[#9A7468]' : 'text-[#B08B7E]'} />
      </div>
      <p className="mt-3 whitespace-nowrap text-lg font-bold tracking-[-0.03em] text-[#4A4540] tabular-nums">{value}</p>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F4F1ED]/70 px-4 py-3">
      <span className="text-sm font-medium text-[#8C8273]">{label}</span>
      <span className="font-bold text-[#4A4540]">{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: ProviderStatus }) {
  const styles: Record<ProviderStatus, string> = {
    Healthy: 'bg-emerald-50 text-emerald-700',
    Offline: 'bg-slate-100 text-slate-500',
    Degraded: 'bg-amber-50 text-amber-700',
    Disabled: 'bg-[#F4F1ED] text-[#A8A296]',
  }
  const labels: Record<ProviderStatus, string> = {
    Healthy: 'Provider 正常',
    Offline: 'Provider 未连接',
    Degraded: 'Provider 异常',
    Disabled: 'Provider 未启用',
  }
  return (
    <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function LogStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const success = normalized === 'success'
  const running = normalized === 'running'
  return (
    <span className={[
      'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-bold',
      success ? 'bg-emerald-50 text-emerald-700' : running ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700',
    ].join(' ')}>
      {success ? <CheckCircle2 size={13} /> : running ? <Loader2 size={13} className="animate-spin" /> : <AlertTriangle size={13} />}
      {status}
    </span>
  )
}

function ImportPanel({ title, description, templateName, template, onFile }: { title: string; description: string; templateName: string; template: string; onFile: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <section className="rounded-[28px] border border-[#E4DFD6]/80 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#E8D9D3] text-[#B08B7E]">
          <FileSpreadsheet size={19} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#2E2A24]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#8C8273]">{description}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="secondary-action" onClick={() => downloadCsv(templateName, template)}>
          <Download size={16} />
          下载模板
        </button>
        <label className="primary-action cursor-pointer">
          <Upload size={16} />
          上传 Excel / CSV
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} />
        </label>
      </div>
    </section>
  )
}

function HistoryImportAction({ label, template, fileName, onFile }: { label: string; template: string; fileName: string; onFile: (event: ChangeEvent<HTMLInputElement>, label: string) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[#F4F1ED]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-bold text-[#4A4540]">{label}</span>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="secondary-action h-10 rounded-xl px-3 text-xs" onClick={() => downloadCsv(fileName, template)}>
          <Download size={14} />
          模板
        </button>
        <label className="primary-action h-10 cursor-pointer rounded-xl px-3 text-xs">
          <Upload size={14} />
          上传
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(event) => onFile(event, label)} />
        </label>
      </div>
    </div>
  )
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-2xl bg-[#F4F1ED]" />
      ))}
    </>
  )
}

function downloadCsv(fileName: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function formatDuration(value: number | null) {
  if (value === null) return '-'
  if (value < 1000) return `${value}ms`
  return `${(value / 1000).toFixed(1)}s`
}
