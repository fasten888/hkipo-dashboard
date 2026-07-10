import {
  CheckCircle2,
  Cloud,
  CloudOff,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { APP_VERSION } from '../../app/version'
import { useAppData } from '../../hooks/useAppData'
import type { CloudDataCounts, CloudUploadReport } from '../../types/cloud'
import type { AppData } from '../../types/store'
import { Modal } from '../ui/Modal'

export function CloudSyncModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const cloud = useAppData()
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'sign_in') {
      await cloud.cloudSignIn(email.trim(), password)
    } else {
      await cloud.cloudSignUp(email.trim(), password)
    }
  }

  return (
    <Modal
      open={open}
      title="多设备云同步"
      description="电脑与手机使用同一个账号，数据会自动同步。"
      onClose={onClose}
    >
      <div className="px-5 py-6 sm:px-7">
        {!cloud.cloudConfigured ? (
          <ConfigurationGuide />
        ) : cloud.cloudUser ? (
          <SignedInPanel onClose={onClose} />
        ) : (
          <form onSubmit={submit}>
            <div className="mb-5 flex rounded-xl bg-[#F4F1ED] p-1">
              <ModeButton
                active={mode === 'sign_in'}
                label="登录"
                onClick={() => setMode('sign_in')}
              />
              <ModeButton
                active={mode === 'sign_up'}
                label="注册"
                onClick={() => setMode('sign_up')}
              />
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-[#5A5246]">邮箱</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                className="mt-2 w-full rounded-xl border border-[#E4DFD6] px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="name@example.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-[#5A5246]">密码</span>
              <input
                required
                minLength={6}
                type="password"
                autoComplete={
                  mode === 'sign_in' ? 'current-password' : 'new-password'
                }
                value={password}
                className="mt-2 w-full rounded-xl border border-[#E4DFD6] px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="至少 6 位"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {cloud.cloudMessage && (
              <Message
                tone={cloud.cloudStatus === 'error' ? 'error' : 'info'}
                text={cloud.cloudMessage}
              />
            )}
            <button
              type="submit"
              disabled={cloud.cloudStatus === 'loading'}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {cloud.cloudStatus === 'loading' && (
                <LoaderCircle size={17} className="animate-spin" />
              )}
              {mode === 'sign_in' ? '登录并同步' : '注册同步账号'}
            </button>
            <p className="mt-4 text-xs leading-5 text-[#A8A296]">
              首次登录不会直接覆盖已有数据；如本机和云端不同，系统会让你选择保留哪一份。
            </p>
          </form>
        )}
      </div>
    </Modal>
  )
}

function SignedInPanel({ onClose }: { onClose: () => void }) {
  const cloud = useAppData()
  const refreshedOnOpenRef = useRef(false)
  const syncUnavailable =
    cloud.cloudStatus === 'loading' ||
    cloud.cloudStatus === 'syncing' ||
    cloud.cloudStatus === 'auth_expired'
  const isHealthy =
    cloud.cloudStatus === 'synced' &&
    !cloud.cloudPendingChanges &&
    cloud.cloudHasRefreshToken
  const currentLocalData: AppData = {
    version: cloud.version,
    accounts: cloud.accounts,
    ipos: cloud.ipos,
    subscriptions: cloud.subscriptions,
    sales: cloud.sales,
    withdrawals: cloud.withdrawals,
    exchangeRecords: cloud.exchangeRecords,
    fxRates: cloud.fxRates,
    holdings: cloud.holdings,
  }
  const localCounts = countSyncData(currentLocalData)
  const remoteCounts = cloud.cloudRemoteSummary?.counts ?? null
  const localUpdatedAt = getLocalUpdatedAt(currentLocalData)
  const currentDataSource = getCurrentDataSource({
    status: cloud.cloudStatus,
    pendingChanges: cloud.cloudPendingChanges,
    lastUploadedAt: cloud.cloudSyncTimes.lastUploadedAt,
    lastDownloadedAt: cloud.cloudSyncTimes.lastDownloadedAt,
  })

  useEffect(() => {
    if (
      refreshedOnOpenRef.current ||
      cloud.cloudStatus === 'loading' ||
      cloud.cloudStatus === 'syncing' ||
      cloud.cloudStatus === 'auth_expired'
    ) {
      return
    }
    refreshedOnOpenRef.current = true
    void cloud.refreshCloudSummaryNow()
  }, [cloud])

  return (
    <div>
      <div className="flex items-start gap-3 rounded-2xl bg-[#F4F1ED] p-4">
        <CloudStatusIcon status={cloud.cloudStatus} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-[#4A4540]">
              {cloud.cloudUser?.email}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                isHealthy
                  ? 'bg-[#F2F5F2] text-[#677A6F]'
                  : 'bg-[#FAF6EF] text-[#7D653C]'
              }`}
            >
              {isHealthy ? '同步正常' : '同步异常'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#F4F1ED]0">
            {cloud.cloudMessage || cloudStatusText(cloud.cloudStatus)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl border border-[#E4DFD6] bg-white p-4 text-xs text-[#736A5C]">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[#2E2A24]">同步状态面板</p>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              isHealthy
                ? 'bg-[#F2F5F2] text-[#677A6F]'
                : 'bg-[#FAF6EF] text-[#7D653C]'
            }`}
          >
            {isHealthy ? '同步正常' : '同步异常'}
          </span>
        </div>
        <SyncInfoRow
          label="当前登录邮箱"
          value={cloud.cloudUser?.email ?? '未登录'}
        />
        <SyncInfoRow label="当前用户ID" value={cloud.cloudUser?.id ?? '未登录'} />
        <div className="my-2 grid gap-3 sm:grid-cols-2">
          <SyncCountsCard title="本地统计" counts={localCounts} />
          <SyncCountsCard title="云端统计" counts={remoteCounts} />
        </div>
        <div className="my-2 rounded-2xl bg-[#F4F1ED] p-3">
          <p className="mb-2 text-xs font-bold text-[#2E2A24]">
            最后同步时间
          </p>
          <div className="grid gap-2">
            <SyncInfoRow
              label="本地更新时间"
              value={localUpdatedAt ? formatDateTime(localUpdatedAt) : '暂无'}
            />
            <SyncInfoRow
              label="云端更新时间"
              value={
                cloud.cloudRemoteSummary?.updatedAt
                  ? formatDateTime(cloud.cloudRemoteSummary.updatedAt)
                  : '尚未读取云端'
              }
            />
            <SyncInfoRow
              label="最后上传时间"
              value={
                cloud.cloudSyncTimes.lastUploadedAt
                  ? formatDateTime(cloud.cloudSyncTimes.lastUploadedAt)
                  : '暂无'
              }
            />
            <SyncInfoRow
              label="最后下载时间"
              value={
                cloud.cloudSyncTimes.lastDownloadedAt
                  ? formatDateTime(cloud.cloudSyncTimes.lastDownloadedAt)
                  : '暂无'
              }
            />
          </div>
        </div>
        <div className="my-2 rounded-2xl bg-[#F4F1ED] p-3">
          <p className="mb-2 text-xs font-bold text-[#2E2A24]">
            当前使用数据源
          </p>
          <div className="grid gap-2">
            <SyncInfoRow label="当前使用" value={currentDataSource} />
            <SyncInfoRow
              label="云端记录ID"
              value={cloud.cloudRemoteSummary?.rowId ?? '尚未读取云端'}
            />
            <SyncInfoRow
              label="updated_at"
              value={
                cloud.cloudRemoteSummary?.updatedAt
                  ? cloud.cloudRemoteSummary.updatedAt
                  : '尚未读取云端'
              }
            />
          </div>
        </div>
        <SyncInfoRow
          label="Supabase连接状态"
          value={supabaseStatusText(cloud.cloudStatus)}
          danger={
            cloud.cloudStatus === 'error' ||
            cloud.cloudStatus === 'offline' ||
            cloud.cloudStatus === 'auth_expired'
          }
        />
        <SyncInfoRow label="当前系统版本号" value={APP_VERSION} />
        <SyncInfoRow
          label="最后同步时间"
          value={
            cloud.cloudLastSyncedAt
              ? formatDateTime(cloud.cloudLastSyncedAt)
              : '暂无'
          }
        />
        <SyncInfoRow
          label="云端检查时间"
          value={
            cloud.cloudRemoteSummary?.checkedAt
              ? new Date(cloud.cloudRemoteSummary.checkedAt).toLocaleString(
                  'zh-CN',
                )
              : '尚未读取云端'
          }
        />
        <SyncInfoRow
          label="Access Token"
          value={
            cloud.cloudSessionExpiresAt
              ? `${Date.now() > cloud.cloudSessionExpiresAt ? '已过期' : '有效'}，到期：${new Date(
                  cloud.cloudSessionExpiresAt,
                ).toLocaleString('zh-CN')}`
              : '无'
          }
          danger={
            !cloud.cloudSessionExpiresAt ||
            Date.now() > cloud.cloudSessionExpiresAt
          }
        />
        <SyncInfoRow
          label="Refresh Token"
          value={cloud.cloudHasRefreshToken ? '存在' : '缺失'}
          danger={!cloud.cloudHasRefreshToken}
        />
        <SyncInfoRow
          label="本地记录数量"
          value={formatCounts(localCounts)}
        />
        <SyncInfoRow
          label="云端记录数量"
          value={
            cloud.cloudRemoteSummary
              ? formatCounts(cloud.cloudRemoteSummary.counts)
              : '尚未读取云端'
          }
        />
      </div>

      {cloud.cloudStatus === 'auth_expired' && (
        <div className="mt-4 rounded-2xl border border-[#E8D2CC] bg-[#F9F2F0] p-4">
          <p className="text-sm font-bold text-[#7E5D53]">
            Supabase 登录已失效
          </p>
          <p className="mt-1 text-xs leading-5 text-[#9A7468]">
            Refresh Token 已被 Supabase 拒绝。系统不能在不知道密码的情况下自动重新登录，请重新登录同步账号后再上传或拉取数据。
          </p>
          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#9A7468] px-4 py-2.5 text-xs font-semibold text-white"
            onClick={() => cloud.cloudSignOut()}
          >
            清除失效登录并重新登录
          </button>
        </div>
      )}

      {cloud.cloudConflict && (
        <div className="mt-4 rounded-2xl border border-[#EFE3D2] bg-[#FAF6EF] p-4">
          <p className="text-sm font-bold text-amber-900">
            本机和云端都有不同数据
          </p>
          <p className="mt-1 text-xs leading-5 text-[#7D653C]">
            系统不会自动覆盖，请核对数量后选择保留哪一份。
          </p>
          <div className="mt-3 rounded-xl bg-white p-3 text-xs text-[#736A5C]">
            <SyncInfoRow
              label="冲突判断"
              value={formatConflictWinner(cloud.cloudConflict.newer)}
            />
            <SyncInfoRow
              label="本地更新时间"
              value={formatDateTime(cloud.cloudConflict.localUpdatedAt)}
            />
            <SyncInfoRow
              label="云端更新时间"
              value={formatDateTime(cloud.cloudConflict.remoteUpdatedAt)}
            />
            <SyncInfoRow
              label="时间差"
              value={formatDuration(cloud.cloudConflict.timeDiffMs)}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <VersionSummary
              label="当前本机数据"
              data={currentLocalData}
            />
            <VersionSummary
              label="云端数据"
              data={cloud.cloudConflict.remote}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white"
              onClick={() => cloud.resolveCloudConflict('local')}
            >
              <Upload size={15} />
              上传当前本机数据
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-semibold text-amber-800"
              onClick={() => cloud.resolveCloudConflict('remote')}
            >
              <Cloud size={15} />
              使用云端数据
            </button>
          </div>
        </div>
      )}

      {cloud.cloudUploadReport && (
        <UploadReportPanel report={cloud.cloudUploadReport} />
      )}

      {!cloud.cloudConflict && (
        <div className="mt-5 grid gap-3">
          <button
            type="button"
            disabled={syncUnavailable}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => cloud.uploadCloudNow()}
          >
            <Upload
              size={17}
              className={
                cloud.cloudStatus === 'syncing' ? 'animate-pulse' : undefined
              }
            />
            上传本机数据
          </button>
          <button
            type="button"
            disabled={syncUnavailable}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E4DFD6] bg-white px-5 py-3 text-sm font-semibold text-[#736A5C] disabled:opacity-60"
            onClick={() => cloud.syncCloudNow()}
          >
            <RefreshCw
              size={17}
              className={
                cloud.cloudStatus === 'loading' ? 'animate-spin' : undefined
              }
            />
            检查并拉取云端更新
          </button>
          <button
            type="button"
            disabled={syncUnavailable}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-[#F2F5F2] px-5 py-3 text-sm font-semibold text-emerald-700 disabled:opacity-60"
            onClick={() => cloud.pullCloudNow()}
          >
            <Cloud size={17} />
            强制使用云端数据
          </button>
          <button
            type="button"
            disabled={syncUnavailable}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#EFE3D2] bg-[#FAF6EF] px-5 py-3 text-sm font-semibold text-amber-800 disabled:opacity-60"
            onClick={() => cloud.runCloudDiagnostic()}
          >
            <RefreshCw
              size={17}
              className={
                cloud.cloudStatus === 'syncing' ? 'animate-spin' : undefined
              }
            />
            运行同步诊断
          </button>
          <p className="text-xs leading-5 text-[#A8A296]">
            电脑刚录入的数据请选择“上传本机数据”；手机不同步时请选择“强制使用云端数据”。
          </p>
        </div>
      )}

      {cloud.cloudDiagnostic && (
        <div className="mt-4 rounded-2xl border border-[#E4DFD6] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#2E2A24]">同步诊断结果</p>
              <p className="mt-1 text-xs leading-5 text-[#F4F1ED]0">
                表名：{cloud.cloudDiagnostic.tableName}
              </p>
              <p className="text-xs leading-5 text-[#F4F1ED]0">
                测试记录ID：{cloud.cloudDiagnostic.testRecordId}
              </p>
            </div>
            {cloud.cloudDiagnostic.lostAt ? (
              <span className="rounded-full bg-[#F9F2F0] px-2.5 py-1 text-[11px] font-bold text-[#9A7468]">
                丢失于：{cloud.cloudDiagnostic.lostAt}
              </span>
            ) : cloud.cloudDiagnostic.completedAt ? (
              <span className="rounded-full bg-[#F2F5F2] px-2.5 py-1 text-[11px] font-bold text-[#677A6F]">
                云端已验证
              </span>
            ) : (
              <span className="rounded-full bg-[#FAF6EF] px-2.5 py-1 text-[11px] font-bold text-[#9F814C]">
                检查中
              </span>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {cloud.cloudDiagnostic.steps.map((step) => (
              <div
                key={`${step.name}-${step.detail}`}
                className="rounded-xl bg-[#F4F1ED] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#4A4540]">
                    {step.name}
                  </p>
                  <span
                    className={`text-[11px] font-bold ${
                      step.status === 'success'
                        ? 'text-[#677A6F]'
                        : step.status === 'failed'
                          ? 'text-[#9A7468]'
                          : 'text-[#9F814C]'
                    }`}
                  >
                    {step.status === 'success'
                      ? '通过'
                      : step.status === 'failed'
                        ? '失败'
                        : '等待'}
                  </span>
                </div>
                <p className="mt-1 break-all text-xs leading-5 text-[#F4F1ED]0">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E4DFD6] px-5 py-3 text-sm font-semibold text-[#736A5C]"
        onClick={async () => {
          await cloud.cloudSignOut()
          onClose()
        }}
      >
        <LogOut size={17} />
        退出同步账号
      </button>
    </div>
  )
}

function UploadReportPanel({ report }: { report: CloudUploadReport }) {
  const before = report.beforeCounts
  const after = report.confirmedCounts
  return (
    <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#2E2A24]">上传确认结果</p>
          <p className="mt-1 text-xs leading-5 text-[#F4F1ED]0">
            展示上传前云端数量、上传后云端数量，以及本次实际写入变化。
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            report.status === 'success'
              ? 'bg-[#F2F5F2] text-[#677A6F]'
              : report.status === 'failed'
                ? 'bg-[#F9F2F0] text-[#9A7468]'
                : 'bg-[#FAF6EF] text-[#9F814C]'
          }`}
        >
          {report.status === 'success'
            ? '上传已确认'
            : report.status === 'failed'
              ? '上传失败'
              : '上传中'}
        </span>
      </div>

      <div className="mt-3 grid gap-2 rounded-xl bg-white p-3 text-xs">
        <UploadCountRow
          label="账户"
          before={before?.accounts}
          after={after?.accounts}
          written={report.writtenCounts?.accounts}
          local={report.localCounts.accounts}
        />
        <UploadCountRow
          label="新股"
          before={before?.ipos}
          after={after?.ipos}
          written={report.writtenCounts?.ipos}
          local={report.localCounts.ipos}
        />
        <UploadCountRow
          label="申购"
          before={before?.subscriptions}
          after={after?.subscriptions}
          written={report.writtenCounts?.subscriptions}
          local={report.localCounts.subscriptions}
        />
        <UploadCountRow
          label="中签"
          before={before?.allotments}
          after={after?.allotments}
          written={report.writtenCounts?.allotments}
          local={report.localCounts.allotments}
        />
        <UploadCountRow
          label="卖出"
          before={before?.sales}
          after={after?.sales}
          written={report.writtenCounts?.sales}
          local={report.localCounts.sales}
        />
      </div>

      <div className="mt-3 rounded-xl bg-white p-3 text-xs text-[#736A5C]">
        <p className="font-bold text-[#4A4540]">Supabase返回结果</p>
        <div className="mt-2 grid gap-1.5">
          <SyncInfoRow
            label="返回行数"
            value={`${report.supabaseReturnedRows}`}
          />
          <SyncInfoRow
            label="返回更新时间"
            value={
              report.supabaseUpdatedAt
                ? new Date(report.supabaseUpdatedAt).toLocaleString('zh-CN')
                : '尚未返回'
            }
          />
          <SyncInfoRow
            label="返回记录数量"
            value={formatCounts(report.returnedCounts)}
          />
          <SyncInfoRow
            label="云端确认数量"
            value={formatCounts(report.confirmedCounts)}
          />
          {report.error && (
            <SyncInfoRow label="错误信息" value={report.error} danger />
          )}
        </div>
      </div>
    </div>
  )
}

function UploadCountRow({
  label,
  before,
  after,
  written,
  local,
}: {
  label: string
  before?: number
  after?: number
  written?: number
  local: number
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-[#F4F1ED] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-bold text-[#5A5246]">{label}</span>
      <span className="font-semibold text-[#F4F1ED]0">
        本机 {local} · 云端{' '}
        <span className="text-[#2E2A24]">
          {formatCount(before)} → {formatCount(after)}
        </span>
        {typeof written === 'number' && (
          <span
            className={`ml-2 font-bold ${
              written > 0
                ? 'text-[#677A6F]'
                : written < 0
                  ? 'text-[#9F814C]'
                  : 'text-[#A8A296]'
            }`}
          >
            {written > 0 ? `+${written}` : written}
          </span>
        )}
      </span>
    </div>
  )
}

function formatCount(value?: number) {
  return typeof value === 'number' ? `${value}` : '—'
}

function formatCounts(counts: CloudDataCounts | null) {
  if (!counts) return '尚未返回'
  return `${counts.accounts} 账户 · ${counts.ipos} 新股 · ${counts.subscriptions} 申购 · ${counts.allotments} 中签 · ${counts.sales} 卖出`
}

function SyncCountsCard({
  title,
  counts,
}: {
  title: string
  counts: CloudDataCounts | null
}) {
  return (
    <div className="rounded-2xl bg-[#F4F1ED] p-3">
      <p className="mb-2 text-xs font-bold text-[#2E2A24]">{title}</p>
      <div className="grid gap-1.5">
        <SyncInfoRow
          label="账户数"
          value={counts ? `${counts.accounts}` : '尚未读取'}
        />
        <SyncInfoRow
          label="新股数"
          value={counts ? `${counts.ipos}` : '尚未读取'}
        />
        <SyncInfoRow
          label="申购数"
          value={counts ? `${counts.subscriptions}` : '尚未读取'}
        />
        <SyncInfoRow
          label="中签记录数"
          value={counts ? `${counts.allotments}` : '尚未读取'}
        />
        <SyncInfoRow
          label="卖出记录数"
          value={counts ? `${counts.sales}` : '尚未读取'}
        />
      </div>
    </div>
  )
}

function countSyncData(data: AppData): CloudDataCounts {
  return {
    accounts: data.accounts.length,
    ipos: data.ipos.length,
    subscriptions: data.subscriptions.length,
    allotments: data.subscriptions.filter((item) => item.status === 'won')
      .length,
    sales: data.sales.length,
  }
}

function getLocalUpdatedAt(data: AppData) {
  const timestamps = [
    ...data.accounts,
    ...data.ipos,
    ...data.subscriptions,
    ...data.sales,
    ...data.withdrawals,
    ...data.exchangeRecords,
    ...data.holdings,
  ]
    .map((item) => item.updatedAt ?? item.createdAt)
    .filter(Boolean)
  if (timestamps.length === 0) return null
  const sorted = timestamps.sort()
  return sorted[sorted.length - 1] ?? null
}

function getCurrentDataSource({
  status,
  pendingChanges,
  lastUploadedAt,
  lastDownloadedAt,
}: {
  status: ReturnType<typeof useAppData>['cloudStatus']
  pendingChanges: boolean
  lastUploadedAt: string | null
  lastDownloadedAt: string | null
}) {
  if (status === 'conflict' || pendingChanges) return '本地'
  if (
    lastDownloadedAt &&
    (!lastUploadedAt || lastDownloadedAt >= lastUploadedAt)
  ) {
    return '云端'
  }
  return '本地'
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN')
}

function formatConflictWinner(value: 'local' | 'remote' | 'same') {
  if (value === 'local') return '本地较新'
  if (value === 'remote') return '云端较新'
  return '更新时间相同'
}

function formatDuration(ms: number) {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时`
  return `${Math.round(hours / 24)} 天`
}

function SyncInfoRow({
  label,
  value,
  danger = false,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
      <span className="font-semibold text-[#A8A296]">{label}</span>
      <span
        className={`break-all text-left font-semibold sm:text-right ${
          danger ? 'text-[#9A7468]' : 'text-[#5A5246]'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function VersionSummary({
  label,
  data,
}: {
  label: string
  data: AppData
}) {
  return (
    <div className="rounded-xl bg-white/80 px-3 py-2.5 text-[#736A5C]">
      <p className="font-semibold text-[#4A4540]">{label}</p>
      <p className="mt-1 leading-5">
        {data.ipos.length} 新股 · {data.subscriptions.length} 申购 ·{' '}
        {data.sales.length} 卖出
      </p>
    </div>
  )
}

function ConfigurationGuide() {
  return (
    <div className="rounded-2xl border border-[#EFE3D2] bg-[#FAF6EF] p-4">
      <div className="flex gap-3">
        <CloudOff size={20} className="mt-0.5 shrink-0 text-[#9F814C]" />
        <div>
          <p className="text-sm font-bold text-amber-900">
            Supabase 尚未连接
          </p>
          <p className="mt-1 text-xs leading-5 text-[#7D653C]">
            请在 Vercel 环境变量中配置 VITE_SUPABASE_URL 和
            VITE_SUPABASE_PUBLISHABLE_KEY，然后重新部署。
          </p>
        </div>
      </div>
    </div>
  )
}

function CloudStatusIcon({
  status,
}: {
  status: ReturnType<typeof useAppData>['cloudStatus']
}) {
  if (status === 'syncing' || status === 'loading') {
    return (
      <LoaderCircle size={20} className="shrink-0 animate-spin text-brand-600" />
    )
  }
  if (status === 'synced') {
    return <CheckCircle2 size={20} className="shrink-0 text-[#F2F5F2]0" />
  }
  if (status === 'offline' || status === 'error') {
    return <CloudOff size={20} className="shrink-0 text-[#FAF6EF]0" />
  }
  if (status === 'auth_expired') {
    return <CloudOff size={20} className="shrink-0 text-[#F9F2F0]0" />
  }
  return <Cloud size={20} className="shrink-0 text-brand-600" />
}

function cloudStatusText(
  status: ReturnType<typeof useAppData>['cloudStatus'],
) {
  if (status === 'synced') return '数据已同步'
  if (status === 'syncing') return '正在同步数据'
  if (status === 'offline') return '当前离线，恢复网络后会继续同步'
  if (status === 'conflict') return '等待选择本机或云端数据'
  if (status === 'error') return '同步失败，本机数据不受影响'
  if (status === 'auth_expired') return '同步登录已过期，请重新登录'
  return '已连接云同步'
}

function supabaseStatusText(
  status: ReturnType<typeof useAppData>['cloudStatus'],
) {
  if (status === 'synced') return '连接正常'
  if (status === 'syncing') return '正在写入 Supabase'
  if (status === 'loading') return '正在读取 Supabase'
  if (status === 'conflict') return '连接正常，有数据冲突'
  if (status === 'offline') return '网络离线，无法连接'
  if (status === 'auth_expired') return '认证失效，需要重新登录'
  if (status === 'error') return '连接异常'
  if (status === 'signed_out') return '未登录'
  return '未配置'
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
      className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition ${
        active ? 'bg-white text-brand-700 shadow-sm' : 'text-[#F4F1ED]'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function Message({
  tone,
  text,
}: {
  tone: 'error' | 'info'
  text: string
}) {
  return (
    <p
      className={`mt-4 rounded-xl px-4 py-3 text-xs leading-5 ${
        tone === 'error'
          ? 'bg-[#F9F2F0] text-[#7E5D53]'
          : 'bg-brand-50 text-brand-700'
      }`}
    >
      {text}
    </p>
  )
}
