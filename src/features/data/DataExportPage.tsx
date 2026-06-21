import {
  BarChart3,
  ArrowRightLeft,
  ChartCandlestick,
  CheckCircle2,
  Download,
  FileJson,
  History,
  Import,
  RotateCcw,
  Rocket,
  ShieldAlert,
  ShoppingCart,
  Tags,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAppData } from '../../hooks/useAppData'
import { exportCsv, type ExportType } from '../../services/csv'
import type { AppData } from '../../types/store'
import {
  downloadJsonBackup,
  readJsonBackup,
} from '../../services/jsonBackup'
import {
  type LegacyImportMode,
  type LegacyImportResult,
  readLegacyBackup,
} from '../../services/legacyBackup'
import {
  backupBeforeImport,
  deleteImportBackup,
  getAutoBackupTime,
  getImportBackups,
  restoreImportBackup,
} from '../../services/storage'

const csvExports: {
  type: ExportType
  title: string
  description: string
  icon: typeof Users
}[] = [
  { type: 'accounts', title: '账户', description: '账户资料和资金', icon: Users },
  { type: 'ipos', title: '新股', description: '发行资料和日期', icon: Rocket },
  {
    type: 'subscriptions',
    title: '申购记录',
    description: '账户、新股、方式及费用',
    icon: ShoppingCart,
  },
  {
    type: 'allotments',
    title: '中签记录',
    description: '状态、股数和手数',
    icon: CheckCircle2,
  },
  {
    type: 'sales',
    title: '卖出记录',
    description: '价格、日期和卖出股数',
    icon: Tags,
  },
  {
    type: 'exchanges',
    title: '换汇记录',
    description: '人民币、外币及实际成交汇率',
    icon: ArrowRightLeft,
  },
  {
    type: 'holdings',
    title: '持仓记录',
    description: '股票市值、抵押率和融资额度',
    icon: ChartCandlestick,
  },
  {
    type: 'profits',
    title: '收益统计',
    description: '账户与申购收益明细',
    icon: BarChart3,
  },
]

export function DataExportPage() {
  const data = useAppData()
  const fileInput = useRef<HTMLInputElement>(null)
  const legacyFileInput = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] =
    useState<Awaited<ReturnType<typeof readJsonBackup>> | null>(null)
  const [message, setMessage] = useState('')
  const [legacyMode, setLegacyMode] =
    useState<LegacyImportMode>('merge')
  const [pendingLegacyImport, setPendingLegacyImport] =
    useState<LegacyImportResult | null>(null)
  const [legacySummary, setLegacySummary] =
    useState<LegacyImportResult['summary'] | null>(null)
  const [importBackups, setImportBackups] = useState(getImportBackups)
  const backupTime = getAutoBackupTime()

  const restoreEmergencyBackup = async () => {
    try {
      const response = await fetch('/HKIPO_RECOVERED_APP_DATA.json', {
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('恢复文件读取失败')
      const restored = (await response.json()) as AppData
      backupBeforeImport(data)
      data.replaceData(restored, '恢复备份')
      setImportBackups(getImportBackups())
      setMessage(
        `已恢复最新数据：${restored.accounts.length} 个账户、${restored.ipos.length} 只新股、${restored.subscriptions.length} 条申购、${restored.sales.length} 条卖出。`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '紧急恢复失败')
    }
  }

  const chooseFile = async (file?: File) => {
    if (!file) return
    try {
      setPendingImport(await readJsonBackup(file))
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const chooseLegacyFile = async (file?: File) => {
    if (!file) return
    try {
      const result = await readLegacyBackup(file, data, legacyMode)
      setPendingLegacyImport(result)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '旧版备份导入失败')
    } finally {
      if (legacyFileInput.current) legacyFileInput.current.value = ''
    }
  }

  return (
    <>
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          V1 · 数据管理
        </div>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          数据管理
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          JSON 用于完整迁移与恢复，CSV 用于 Excel 分析。
        </p>
      </div>

      <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          icon={ShieldAlert}
          title="紧急恢复最新数据"
          description="恢复到 2026-06-15 找回版本：12 账户、19 新股、163 申购、24 卖出。"
          action="恢复找回数据"
          onClick={restoreEmergencyBackup}
        />
        <ActionCard
          icon={FileJson}
          title="导出 JSON"
          description="包含账户、新股、申购、中签、卖出、出金和换汇记录。"
          action="导出完整备份"
          onClick={() => downloadJsonBackup(data)}
        />
        <ActionCard
          icon={Upload}
          title="导入 JSON"
          description="校验备份结构后覆盖当前数据，导入前会保留自动备份。"
          action="选择备份文件"
          onClick={() => fileInput.current?.click()}
        />
        <ActionCard
          icon={History}
          title="自动恢复"
          description={
            backupTime
              ? `可恢复版本：${new Date(backupTime).toLocaleString('zh-CN')}`
              : '暂无自动备份'
          }
          action="恢复最近备份"
          disabled={!backupTime}
          onClick={() => {
            const restored = data.restoreAutoBackup()
            setMessage(restored ? '已恢复最近自动备份' : '暂无可恢复备份')
          }}
        />
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
      </section>

      <section className="mt-8 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white">
              <Import size={21} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">导入旧版备份 JSON</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                支持选择 HKIPO_Backup_20260608.json，自动读取 accounts、ipos、records 和 parts。
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              <ModeButton
                active={legacyMode === 'merge'}
                label="合并导入"
                onClick={() => setLegacyMode('merge')}
              />
              <ModeButton
                active={legacyMode === 'replace'}
                label="覆盖导入"
                onClick={() => setLegacyMode('replace')}
              />
            </div>
            <button
              type="button"
              className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white"
              onClick={() => legacyFileInput.current?.click()}
            >
              选择旧版备份
            </button>
            <input
              ref={legacyFileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => chooseLegacyFile(event.target.files?.[0])}
            />
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-xs leading-5 text-slate-500">
          {legacyMode === 'merge'
            ? '合并导入会保留当前数据，并自动识别重复账户、新股、申购及卖出记录。'
            : '覆盖导入会用旧版备份替换当前业务数据。执行前会自动备份当前数据。'}
        </p>
      </section>

      {legacySummary && (
        <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <h2 className="font-bold text-emerald-900">旧版备份导入完成</h2>
          </div>
          <p className="mt-3 text-xs text-emerald-700">
            源文件：accounts {legacySummary.legacyAccountCount}、ipos{' '}
            {legacySummary.legacyIpoCount}、records{' '}
            {legacySummary.legacyRecordCount}、parts{' '}
            {legacySummary.legacyPartCount}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ImportCount
              label="账户数量"
              imported={legacySummary.accountCount}
              total={legacySummary.totalAccountCount}
            />
            <ImportCount
              label="新股数量"
              imported={legacySummary.ipoCount}
              total={legacySummary.totalIpoCount}
            />
            <ImportCount
              label="申购记录数量"
              imported={legacySummary.subscriptionCount}
              total={legacySummary.totalSubscriptionCount}
            />
            <ImportCount
              label="卖出记录数量"
              imported={legacySummary.saleCount}
              total={legacySummary.totalSaleCount}
            />
          </div>
          <p className="mt-4 text-xs text-emerald-700">
            所有页面与统计数据已自动刷新。
          </p>
        </section>
      )}

      {message && (
        <div className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white">
          {message}
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900">导入前备份</h2>
            <p className="mt-1 text-sm text-slate-500">
              每次导入前自动保存，最多保留最近 20 份。
            </p>
          </div>
          <History size={20} className="text-brand-600" />
        </div>
        {importBackups.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            暂无导入前备份
          </p>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {importBackups.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {new Date(entry.createdAt).toLocaleString('zh-CN')}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {entry.backup.accounts.length} 个账户 ·{' '}
                    {entry.backup.ipos.length} 只新股 ·{' '}
                    {entry.backup.subscriptions.length} 条申购
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700"
                    onClick={() => {
                      const restored = restoreImportBackup(entry.id)
                      if (restored) {
                        backupBeforeImport(data)
                        data.replaceData(restored, '恢复备份')
                        setImportBackups(getImportBackups())
                        setMessage('已恢复所选导入前备份')
                      }
                    }}
                  >
                    <RotateCcw size={13} />
                    恢复
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                    onClick={() =>
                      setImportBackups(deleteImportBackup(entry.id))
                    }
                  >
                    <Trash2 size={13} />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-10">
        <h2 className="font-bold text-slate-900">CSV 导出</h2>
        <p className="mt-1 text-sm text-slate-500">
          分模块导出为 Excel 可直接打开的文件。
        </p>
      </div>
      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {csvExports.map((item) => (
          <article
            key={item.type}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <item.icon size={20} />
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-white"
                onClick={() => exportCsv(item.type, data)}
              >
                <Download size={14} />
                导出
              </button>
            </div>
            <h3 className="mt-4 font-bold text-slate-900">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.description}</p>
          </article>
        ))}
      </section>

      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="导入完整备份"
        message="导入会覆盖当前账户、新股、申购、中签和卖出数据。确定继续吗？"
        confirmLabel="确认导入"
        onConfirm={() => {
          if (pendingImport) {
            backupBeforeImport(data)
            data.replaceData(pendingImport, '导入数据')
            setImportBackups(getImportBackups())
            setMessage('JSON 数据已成功导入')
          }
          setPendingImport(null)
        }}
        onClose={() => setPendingImport(null)}
      />
      <ConfirmDialog
        open={Boolean(pendingLegacyImport)}
        title={
          legacyMode === 'merge' ? '合并旧版备份' : '覆盖导入旧版备份'
        }
        message={
          legacyMode === 'merge'
            ? '系统将保留当前数据并合并旧版账户、新股、申购和卖出记录。导入前会自动备份当前数据。'
            : '系统将使用旧版备份覆盖当前业务数据。导入前会自动备份当前数据。'
        }
        confirmLabel={legacyMode === 'merge' ? '确认合并' : '确认覆盖'}
        onConfirm={() => {
          if (pendingLegacyImport) {
            backupBeforeImport(data)
            data.replaceData(pendingLegacyImport.data, '导入数据')
            setImportBackups(getImportBackups())
            setLegacySummary(pendingLegacyImport.summary)
            setMessage(
              legacyMode === 'merge'
                ? '旧版备份已合并导入'
                : '旧版备份已覆盖导入',
            )
          }
          setPendingLegacyImport(null)
        }}
        onClose={() => setPendingLegacyImport(null)}
      />
    </>
  )
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
        active
          ? 'bg-slate-900 text-white'
          : 'text-slate-500 hover:bg-slate-50'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function ImportCount({
  label,
  imported,
  total,
}: {
  label: string
  imported: number
  total: number
}) {
  return (
    <div className="rounded-xl bg-white px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{total}</p>
      <p className="mt-1 text-[10px] text-emerald-600">
        本次读取 {imported} 条
      </p>
    </div>
  )
}

function ActionCard({
  icon: Icon,
  title,
  description,
  action,
  disabled = false,
  onClick,
}: {
  icon: typeof FileJson
  title: string
  description: string
  action: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={20} />
      </div>
      <h2 className="mt-4 font-bold text-slate-900">{title}</h2>
      <p className="mt-1 min-h-12 text-sm leading-6 text-slate-500">
        {description}
      </p>
      <button
        type="button"
        disabled={disabled}
        className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        onClick={onClick}
      >
        {action}
      </button>
    </article>
  )
}
