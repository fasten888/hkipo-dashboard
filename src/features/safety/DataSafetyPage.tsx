import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileClock,
  HardDriveDownload,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAppData } from '../../hooks/useAppData'
import {
  deleteDailyBackup,
  describeChanges,
  downloadDailyBackup,
  getDailyBackups,
  getOperationLogs,
  getVersionSnapshots,
} from '../../services/audit'
import type { DailyBackup, DataSnapshot } from '../../types/audit'
import { inspectDataHealth, repairDataHealth } from '../../utils/dataHealth'

type RestoreTarget =
  | { kind: 'snapshot'; item: DataSnapshot }
  | { kind: 'daily'; item: DailyBackup }

export function DataSafetyPage() {
  const data = useAppData()
  const [logs, setLogs] = useState(getOperationLogs)
  const [snapshots, setSnapshots] = useState(getVersionSnapshots)
  const [dailyBackups, setDailyBackups] = useState(getDailyBackups)
  const [restoreTarget, setRestoreTarget] = useState<RestoreTarget | null>(null)
  const [repairPending, setRepairPending] = useState(false)
  const [message, setMessage] = useState('')
  const issues = useMemo(() => inspectDataHealth(data), [data])
  const fixableCount = issues.filter((issue) => issue.fixable).length

  const refreshSafetyData = () => {
    window.setTimeout(() => {
      setLogs(getOperationLogs())
      setSnapshots(getVersionSnapshots())
      setDailyBackups(getDailyBackups())
    })
  }

  return (
    <>
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          数据安全与质量
        </div>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          数据安全中心
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          追踪关键操作、恢复历史版本，并检查潜在异常数据。
        </p>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SafetyMetric
          icon={Activity}
          label="操作日志"
          value={`${logs.length} 条`}
          tone="blue"
        />
        <SafetyMetric
          icon={FileClock}
          label="版本快照"
          value={`${snapshots.length} / 10`}
          tone="violet"
        />
        <SafetyMetric
          icon={HardDriveDownload}
          label="每日备份"
          value={`${dailyBackups.length} / 30`}
          tone="emerald"
        />
        <SafetyMetric
          icon={issues.length ? AlertTriangle : CheckCircle2}
          label="数据异常"
          value={`${issues.length} 项`}
          tone={issues.length ? 'amber' : 'emerald'}
        />
      </section>

      {message && (
        <div className="mt-4 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white">
          {message}
        </div>
      )}

      <section className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">数据健康检查</h2>
            <p className="mt-1 text-sm text-slate-500">
              自动检查持仓、收益率、重复记录、缺失字段和负数金额。
            </p>
          </div>
          <button
            type="button"
            disabled={fixableCount === 0}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setRepairPending(true)}
          >
            一键修复 {fixableCount} 项
          </button>
        </div>
        {issues.length === 0 ? (
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={20} />
            当前数据未发现异常
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        severityStyles[issue.severity]
                      }`}
                    >
                      {severityLabels[issue.severity]}
                    </span>
                    <p className="text-sm font-bold text-slate-800">
                      {issue.title}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {issue.objectName} · {issue.detail}
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {issue.fixable ? '可自动修复' : '需要人工确认'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">版本快照</h2>
              <p className="mt-1 text-xs text-slate-400">
                关键操作前自动保存最近 10 个版本
              </p>
            </div>
            <FileClock size={19} className="text-brand-600" />
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {snapshots.length === 0 ? (
              <Empty label="暂无版本快照" />
            ) : (
              snapshots.map((snapshot) => (
                <BackupRow
                  key={snapshot.id}
                  item={snapshot}
                  onRestore={() =>
                    setRestoreTarget({ kind: 'snapshot', item: snapshot })
                  }
                />
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">自动备份中心</h2>
              <p className="mt-1 text-xs text-slate-400">
                每天一份，最多保留最近 30 份
              </p>
            </div>
            <HardDriveDownload size={19} className="text-brand-600" />
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {dailyBackups.length === 0 ? (
              <Empty label="暂无每日备份" />
            ) : (
              dailyBackups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <BackupSummary item={backup} />
                  <div className="flex gap-2">
                    <IconButton
                      label="下载"
                      icon={Download}
                      onClick={() => downloadDailyBackup(backup)}
                    />
                    <IconButton
                      label="恢复"
                      icon={RotateCcw}
                      onClick={() =>
                        setRestoreTarget({ kind: 'daily', item: backup })
                      }
                    />
                    <IconButton
                      label="删除"
                      icon={Trash2}
                      danger
                      onClick={() =>
                        setDailyBackups(deleteDailyBackup(backup.id))
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">操作日志中心</h2>
            <p className="mt-1 text-xs text-slate-400">
              记录新股、申购、卖出、导入和恢复操作
            </p>
          </div>
          <Activity size={19} className="text-brand-600" />
        </div>
        <div className="mt-5 space-y-3">
          {logs.length === 0 ? (
            <Empty label="暂无操作日志" />
          ) : (
            logs.slice(0, 100).map((log) => {
              const changes = describeChanges(
                isRecord(log.before) ? log.before : undefined,
                isRecord(log.after) ? log.after : undefined,
              )
              return (
                <article
                  key={log.id}
                  className="rounded-xl border border-slate-100 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {log.action}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {log.objectName}
                      </p>
                    </div>
                    <time className="text-xs text-slate-400">
                      {formatDateTime(log.createdAt)}
                    </time>
                  </div>
                  {changes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {changes.slice(0, 8).map((change) => (
                        <span
                          key={change.field}
                          className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500"
                        >
                          {fieldLabels[change.field] ?? change.field}：
                          {displayValue(change.before)} →{' '}
                          {displayValue(change.after)}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              )
            })
          )}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="恢复历史版本"
        message={`确定恢复 ${
          restoreTarget ? formatDateTime(restoreTarget.item.createdAt) : ''
        } 的数据吗？恢复前系统会自动创建新快照。`}
        confirmLabel="确认恢复"
        onConfirm={() => {
          if (restoreTarget) {
            data.replaceData(restoreTarget.item.data, '恢复备份')
            setMessage('历史版本已恢复')
            refreshSafetyData()
          }
          setRestoreTarget(null)
        }}
        onClose={() => setRestoreTarget(null)}
      />
      <ConfirmDialog
        open={repairPending}
        title="一键修复数据"
        message={`将修复 ${fixableCount} 项可安全处理的问题。需要人工判断的异常不会被修改。确定继续吗？`}
        confirmLabel="确认修复"
        onConfirm={() => {
          const repaired = repairDataHealth(data)
          if (repaired.result.dataChanged) {
            data.replaceData(repaired.data, '数据修复')
            setMessage(`已修复 ${repaired.result.fixedCount} 项数据问题`)
            refreshSafetyData()
          }
          setRepairPending(false)
        }}
        onClose={() => setRepairPending(false)}
      />
    </>
  )
}

function SafetyMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShieldCheck
  label: string
  value: string
  tone: 'blue' | 'violet' | 'emerald' | 'amber'
}) {
  const styles = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${styles[tone]}`}>
        <Icon size={19} />
      </div>
      <p className="mt-4 text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function BackupRow({
  item,
  onRestore,
}: {
  item: DataSnapshot
  onRestore: () => void
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <BackupSummary item={item} />
      <IconButton label="恢复" icon={RotateCcw} onClick={onRestore} />
    </div>
  )
}

function BackupSummary({ item }: { item: DataSnapshot }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">
        {formatDateTime(item.createdAt)}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {item.reason} · {item.data.accounts.length} 账户 · {item.data.ipos.length}{' '}
        新股 · {item.data.subscriptions.length} 申购 · {item.data.sales.length}{' '}
        卖出
      </p>
    </div>
  )
}

function IconButton({
  label,
  icon: Icon,
  danger = false,
  onClick,
}: {
  label: string
  icon: typeof Download
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
        danger
          ? 'bg-red-50 text-red-600'
          : 'bg-slate-100 text-slate-600'
      }`}
      onClick={onClick}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <p className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
      {label}
    </p>
  )
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function displayValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '空'
  if (Array.isArray(value)) return value.join('、') || '空'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const severityLabels = { high: '高风险', medium: '需检查', low: '提示' }
const severityStyles = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-blue-50 text-blue-600',
}
const fieldLabels: Record<string, string> = {
  name: '名称',
  stockCode: '股票代码',
  issuePrice: '发行价',
  lotSize: '每手股数',
  subscriptionDate: '申购日期',
  listingDate: '上市日期',
  industry: '行业',
  price: '卖出价',
  date: '卖出日期',
  shares: '卖出股数',
  method: '方式',
  fee: '手续费',
  status: '状态',
  allottedShares: '中签股数',
  allottedLots: '中签手数',
  accounts: '账户数',
  ipos: '新股数',
  subscriptions: '申购数',
  sales: '卖出数',
}
