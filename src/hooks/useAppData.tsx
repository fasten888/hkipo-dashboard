/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { loadAppData, normalizeAppData, saveAppData } from '../services/storage'
import {
  addOperationLog,
  createVersionSnapshot,
} from '../services/audit'
import {
  createAccountInDatabase,
  createExchangeRecordInDatabase,
  createIpoInDatabase,
  createSaleInDatabase,
  createSubscriptionsInDatabase,
  createWithdrawalInDatabase,
  deleteAccountInDatabase,
  deleteExchangeRecordInDatabase,
  deleteIpoInDatabase,
  deleteSaleInDatabase,
  deleteSubscriptionInDatabase,
  deleteSubscriptionsInDatabase,
  deleteWithdrawalInDatabase,
  DatabaseApiError,
  loadDatabaseAppData,
  updateAccountInDatabase,
  updateExchangeRecordInDatabase,
  updateIpoInDatabase,
  updateSaleInDatabase,
  updateSubscriptionInDatabase,
  updateWithdrawalInDatabase,
} from '../services/databaseApi'
import type { AccountInput } from '../types/account'
import type { Ipo, IpoInput } from '../types/ipo'
import type { Sale, SaleInput } from '../types/sale'
import type { AppData } from '../types/store'
import type {
  Subscription,
  SubscriptionBatchChanges,
  SubscriptionInput,
} from '../types/subscription'
import type { Withdrawal, WithdrawalInput } from '../types/withdrawal'
import type {
  ExchangeRecord,
  ExchangeRecordInput,
  FxRateSettings,
} from '../types/exchange'
import type { Holding, HoldingInput } from '../types/holding'
import { createId } from '../utils/id'
import { formatAccountNamePlain } from '../utils/account'
import { getSubscriptionMethod } from '../utils/subscriptionMethod'
import type {
  CloudConflict,
  CloudDiagnosticResult,
  CloudRemoteSummary,
  CloudSyncComparison,
  CloudSyncStage,
  CloudSyncTimes,
  CloudSyncStatus,
  CloudUploadReport,
  CloudUser,
} from '../types/cloud'
import {
  appDataCounts,
  latestAppDataTimestamp,
  mergeAppData,
} from '../utils/appDataMerge'

interface AppDataContextValue extends AppData {
  cloudConfigured: boolean
  cloudUser: CloudUser | null
  cloudStatus: CloudSyncStatus
  cloudMessage: string
  cloudLastSyncedAt: string | null
  cloudSyncStages: CloudSyncStage[]
  cloudSyncComparison: CloudSyncComparison | null
  cloudPendingChanges: boolean
  cloudConflict: CloudConflict | null
  cloudDiagnostic: CloudDiagnosticResult | null
  cloudRemoteSummary: CloudRemoteSummary | null
  cloudUploadReport: CloudUploadReport | null
  cloudSyncTimes: CloudSyncTimes
  cloudSessionExpiresAt: number | null
  cloudHasRefreshToken: boolean
  cloudSignIn: (email: string, password: string) => Promise<void>
  cloudSignUp: (email: string, password: string) => Promise<void>
  cloudSignOut: () => Promise<void>
  syncCloudNow: () => Promise<void>
  refreshCloudSummaryNow: () => Promise<void>
  uploadCloudNow: () => Promise<void>
  pullCloudNow: () => Promise<void>
  resolveCloudConflict: (choice: 'local' | 'remote') => Promise<void>
  runCloudDiagnostic: () => Promise<void>
  refreshAppData: () => Promise<void>
  addAccount: (input: AccountInput) => void
  updateAccount: (id: string, input: AccountInput) => void
  deleteAccount: (id: string) => void
  addIpos: (inputs: IpoInput[]) => void
  updateIpo: (id: string, input: IpoInput) => void
  deleteIpo: (id: string) => void
  addSubscriptions: (inputs: SubscriptionInput[]) => void
  updateSubscription: (id: string, input: SubscriptionInput) => void
  deleteSubscription: (id: string) => void
  batchUpdateSubscriptions: (
    ids: string[],
    changes: SubscriptionBatchChanges,
  ) => void
  batchDeleteSubscriptions: (ids: string[]) => void
  canUndoSubscriptionBatch: boolean
  undoLastSubscriptionBatch: () => boolean
  addSale: (input: SaleInput) => void
  updateSale: (id: string, input: SaleInput) => void
  deleteSale: (id: string) => void
  addWithdrawal: (input: WithdrawalInput) => void
  updateWithdrawal: (id: string, input: WithdrawalInput) => void
  deleteWithdrawal: (id: string) => void
  addExchangeRecord: (input: ExchangeRecordInput) => void
  updateExchangeRecord: (id: string, input: ExchangeRecordInput) => void
  deleteExchangeRecord: (id: string) => void
  updateFxRates: (rates: Pick<FxRateSettings, 'HKD' | 'USD'>) => void
  addHolding: (input: HoldingInput) => void
  updateHolding: (id: string, input: HoldingInput) => void
  deleteHolding: (id: string) => void
  replaceData: (
    data: AppData,
    operation?: '导入数据' | '恢复备份' | '数据修复',
  ) => void
  restoreAutoBackup: () => boolean
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

function timestamped<T>(input: T) {
  const now = new Date().toISOString()
  return { ...input, id: createId(), createdAt: now, updatedAt: now }
}

function subscriptionToInput(subscription: Subscription): SubscriptionInput {
  return {
    accountId: subscription.accountId,
    ipoId: subscription.ipoId,
    method: subscription.method,
    subscriptionMethod: subscription.subscriptionMethod ?? subscription.method,
    subscriptionAmount: subscription.subscriptionAmount,
    fee: subscription.fee,
    subscriptionDate: subscription.subscriptionDate,
    remarks: subscription.remarks,
    status: subscription.status,
    allottedShares: subscription.allottedShares,
    allottedLots: subscription.allottedLots,
    sellPlan: subscription.sellPlan,
    fundingSource: subscription.fundingSource,
  }
}

function databaseCloudFacade(
  refreshData: () => Promise<void>,
  syncing: boolean,
  error: string,
  lastSyncedAt: string | null,
  attempted: boolean,
  stages: CloudSyncStage[],
  comparison: CloudSyncComparison | null,
) {
  const run = async () => {
    await refreshData()
  }

  return {
    configured: false,
    user: null as CloudUser | null,
    status: (syncing
      ? 'syncing'
      : error
        ? 'error'
        : attempted
          ? 'synced'
          : 'offline') as CloudSyncStatus,
    message: error || '数据库模式：业务数据直接通过 API / Prisma 读取。',
    lastSyncedAt,
    stages,
    comparison,
    pendingChanges: false,
    conflict: null as CloudConflict | null,
    diagnostic: null as CloudDiagnosticResult | null,
    remoteSummary: null as CloudRemoteSummary | null,
    uploadReport: null as CloudUploadReport | null,
    syncTimes: {
      lastUploadedAt: null,
      lastDownloadedAt: lastSyncedAt,
    } satisfies CloudSyncTimes,
    sessionExpiresAt: null as number | null,
    hasRefreshToken: false,
    signIn: async () => undefined,
    signUp: async () => undefined,
    signOut: async () => undefined,
    syncNow: run,
    refreshRemoteSummaryNow: run,
    uploadNow: run,
    pullRemoteNow: run,
    resolveConflict: async () => undefined,
    runDiagnostic: run,
  }
}

const BUSINESS_COLLECTIONS = [
  'accounts',
  'ipos',
  'subscriptions',
  'sales',
  'withdrawals',
  'exchangeRecords',
  'holdings',
] as const

function hasBusinessData(data: AppData) {
  return BUSINESS_COLLECTIONS.some((key) => data[key].length > 0)
}

function initialSyncStages(): CloudSyncStage[] {
  return [
    syncStage('token', '读取凭证', 'success', '数据库 API 模式无需浏览器 Supabase Token'),
    syncStage('api-request', '请求 API', 'waiting', '等待请求 /api/app-data'),
    syncStage('database-query', 'Supabase 查询', 'waiting', '等待数据库响应'),
    syncStage('data-merge', '数据合并', 'waiting', '本地数据已优先加载'),
    syncStage('cloud-write', '写入云端', 'waiting', '读取同步无需回写'),
  ]
}

function syncStage(
  name: CloudSyncStage['name'],
  label: string,
  status: CloudSyncStage['status'],
  detail: string,
): CloudSyncStage {
  return {
    name,
    label,
    status,
    detail,
    updatedAt: status === 'waiting' ? null : new Date().toISOString(),
  }
}

function buildComparison(local: AppData, remote: AppData): CloudSyncComparison {
  const localTimestamp = latestAppDataTimestamp(local)
  const remoteTimestamp = latestAppDataTimestamp(remote)
  const timeDiffMs = Math.abs(localTimestamp - remoteTimestamp)
  return {
    localUpdatedAt: localTimestamp ? new Date(localTimestamp).toISOString() : null,
    remoteUpdatedAt: remoteTimestamp ? new Date(remoteTimestamp).toISOString() : null,
    newer: localTimestamp === remoteTimestamp
      ? 'same'
      : localTimestamp > remoteTimestamp
        ? 'local'
        : 'remote',
    timeDiffMs,
    localCounts: appDataCounts(local),
    remoteCounts: appDataCounts(remote),
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadAppData())
  const [databaseSyncing, setDatabaseSyncing] = useState(false)
  const [databaseError, setDatabaseError] = useState('')
  const [databaseLastSyncedAt, setDatabaseLastSyncedAt] = useState<string | null>(null)
  const [databaseSyncAttempted, setDatabaseSyncAttempted] = useState(false)
  const [databaseSyncStages, setDatabaseSyncStages] = useState<CloudSyncStage[]>(initialSyncStages)
  const [databaseSyncComparison, setDatabaseSyncComparison] = useState<CloudSyncComparison | null>(null)
  const dataRef = useRef(data)
  const lastSubscriptionBatch = useRef<{
    before: AppData
    after: AppData
  } | null>(null)
  const [subscriptionBatchRevision, setSubscriptionBatchRevision] = useState(0)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const refreshData = useCallback(async () => {
    setDatabaseSyncing(true)
    setDatabaseSyncAttempted(true)
    setDatabaseSyncStages([
      syncStage('token', '读取凭证', 'success', '数据库 API 模式无需浏览器 Supabase Token'),
      syncStage('api-request', '请求 API', 'running', '正在请求 /api/app-data'),
      syncStage('database-query', 'Supabase 查询', 'waiting', '等待数据库响应'),
      syncStage('data-merge', '数据合并', 'waiting', '等待远端数据'),
      syncStage('cloud-write', '写入云端', 'waiting', '读取同步无需回写'),
    ])
    try {
      const nextData = normalizeAppData(await loadDatabaseAppData())
      setDatabaseSyncStages((stages) => stages.map((stage) => {
        if (stage.name === 'api-request') {
          return syncStage(stage.name, stage.label, 'success', 'API 请求成功')
        }
        if (stage.name === 'database-query') {
          return syncStage(stage.name, stage.label, 'success', 'Supabase 查询成功')
        }
        if (stage.name === 'data-merge') {
          return syncStage(stage.name, stage.label, 'running', '正在按 ID 和 updatedAt 合并')
        }
        return stage
      }))

      const localData = dataRef.current
      const comparison = buildComparison(localData, nextData)
      const mergedData = mergeAppData(localData, nextData)
      setDatabaseSyncComparison(comparison)
      setData(mergedData)
      dataRef.current = mergedData
      setDatabaseSyncStages((stages) => stages.map((stage) => {
        if (stage.name === 'data-merge') {
          return syncStage(stage.name, stage.label, 'success', '已保留本地较新记录并合并云端更新')
        }
        if (stage.name === 'cloud-write') {
          return syncStage(stage.name, stage.label, 'success', '本次为读取同步，无需回写数据库')
        }
        return stage
      }))
      setDatabaseError('')
      setDatabaseLastSyncedAt(new Date().toISOString())
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setDatabaseError(`云同步失败，当前使用本地数据。${message ? ` ${message}` : ''}`)
      const failedStage = error instanceof DatabaseApiError
        ? error.stage
        : 'api-request'
      setDatabaseSyncStages((stages) => stages.map((stage) => {
        if (stage.name === failedStage) {
          return syncStage(stage.name, stage.label, 'failed', message)
        }
        if (stage.status === 'running') {
          return syncStage(stage.name, stage.label, 'failed', '同步在此步骤前终止')
        }
        return stage
      }))
      throw error
    } finally {
      setDatabaseSyncing(false)
    }
  }, [])

  useEffect(() => {
    void refreshData().catch((error) => {
      console.error('[app-data] failed to load database data', error)
    })
  }, [refreshData])

  useEffect(() => {
    if (hasBusinessData(data)) saveAppData(data)
  }, [data])

  const persistAndRefresh = useCallback(
    (action: Promise<unknown>) => {
      setDatabaseSyncAttempted(true)
      setDatabaseSyncStages((stages) => stages.map((stage) =>
        stage.name === 'cloud-write'
          ? syncStage(stage.name, stage.label, 'running', '正在写入数据库')
          : stage,
      ))
      void action
        .then(() => {
          setDatabaseSyncStages((stages) => stages.map((stage) =>
            stage.name === 'cloud-write'
              ? syncStage(stage.name, stage.label, 'success', '数据库写入成功')
              : stage,
          ))
          return refreshData()
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error)
          setDatabaseError(`云同步失败，当前使用本地数据。${message}`)
          setDatabaseSyncStages((stages) => stages.map((stage) =>
            stage.name === 'cloud-write'
              ? syncStage(stage.name, stage.label, 'failed', message)
              : stage,
          ))
          console.error('[app-data] database write failed', error)
        })
    },
    [refreshData],
  )

  const cloud = useMemo(
    () => databaseCloudFacade(
      refreshData,
      databaseSyncing,
      databaseError,
      databaseLastSyncedAt,
      databaseSyncAttempted,
      databaseSyncStages,
      databaseSyncComparison,
    ),
    [
      databaseError,
      databaseLastSyncedAt,
      databaseSyncAttempted,
      databaseSyncComparison,
      databaseSyncStages,
      databaseSyncing,
      refreshData,
    ],
  )

  const value = useMemo<AppDataContextValue>(
    () => ({
      ...data,
      cloudConfigured: cloud.configured,
      cloudUser: cloud.user,
      cloudStatus: cloud.status,
      cloudMessage: cloud.message,
      cloudLastSyncedAt: cloud.lastSyncedAt,
      cloudSyncStages: cloud.stages,
      cloudSyncComparison: cloud.comparison,
      cloudPendingChanges: cloud.pendingChanges,
      cloudConflict: cloud.conflict,
      cloudDiagnostic: cloud.diagnostic,
      cloudRemoteSummary: cloud.remoteSummary,
      cloudUploadReport: cloud.uploadReport,
      cloudSyncTimes: cloud.syncTimes,
      cloudSessionExpiresAt: cloud.sessionExpiresAt,
      cloudHasRefreshToken: cloud.hasRefreshToken,
      cloudSignIn: cloud.signIn,
      cloudSignUp: cloud.signUp,
      cloudSignOut: cloud.signOut,
      syncCloudNow: cloud.syncNow,
      refreshCloudSummaryNow: cloud.refreshRemoteSummaryNow,
      uploadCloudNow: cloud.uploadNow,
      pullCloudNow: cloud.pullRemoteNow,
      resolveCloudConflict: cloud.resolveConflict,
      runCloudDiagnostic: cloud.runDiagnostic,
      refreshAppData: refreshData,
      addAccount: (input) => {
        persistAndRefresh(createAccountInDatabase(input))
        setData((current) => {
          createVersionSnapshot(current, '新增账户前')
          return {
            ...current,
            accounts: [
              {
                ...timestamped(input),
                legacyParticipationCount: 0,
                legacyWinCount: 0,
              },
              ...current.accounts,
            ],
          }
        })
      },
      updateAccount: (id, input) => {
        persistAndRefresh(updateAccountInDatabase(id, input))
        setData((current) => {
          const account = current.accounts.find((item) => item.id === id)
          if (!account) return current
          createVersionSnapshot(current, `编辑账户：${account.name}`)
          return {
            ...current,
            accounts: current.accounts.map((item) =>
              item.id === id
                ? { ...item, ...input, updatedAt: new Date().toISOString() }
              : item,
            ),
          }
        })
      },
      deleteAccount: (id) => {
        persistAndRefresh(deleteAccountInDatabase(id))
        setData((current) => {
          const account = current.accounts.find((item) => item.id === id)
          if (!account) return current
          createVersionSnapshot(current, `删除账户：${account.name}`)
          const subscriptionIds = new Set(
            current.subscriptions
              .filter((item) => item.accountId === id)
              .map((item) => item.id),
          )
          return {
            ...current,
            accounts: current.accounts.filter((item) => item.id !== id),
            subscriptions: current.subscriptions.filter(
              (item) => item.accountId !== id,
            ),
            sales: current.sales.filter(
              (item) => !subscriptionIds.has(item.subscriptionId),
            ),
            withdrawals: current.withdrawals.filter(
              (item) => item.accountId !== id,
            ),
            exchangeRecords: current.exchangeRecords.filter(
              (item) => item.accountId !== id,
            ),
            holdings: current.holdings.filter(
              (item) => item.accountId !== id,
            ),
          }
        })
      },
      addIpos: (inputs) => {
        inputs.forEach((input) => persistAndRefresh(createIpoInDatabase(input)))
        setData((current) => {
          createVersionSnapshot(current, '新增新股前')
          const created = inputs.map((input) => timestamped(input) as Ipo)
          created.forEach((ipo) =>
            addOperationLog({
              action: '新增新股',
              objectType: '新股',
              objectName: ipo.name,
              after: ipo,
            }),
          )
          return {
            ...current,
            ipos: [...created, ...current.ipos],
          }
        })
      },
      updateIpo: (id, input) => {
        persistAndRefresh(updateIpoInDatabase(id, input))
        setData((current) => {
          const before = current.ipos.find((ipo) => ipo.id === id)
          if (!before) return current
          createVersionSnapshot(current, `编辑新股：${before.name}`)
          const after = {
            ...before,
            ...input,
            updatedAt: new Date().toISOString(),
          }
          addOperationLog({
            action: '编辑新股',
            objectType: '新股',
            objectName: after.name,
            before,
            after,
          })
          return {
            ...current,
            ipos: current.ipos.map((ipo) => (ipo.id === id ? after : ipo)),
          }
        })
      },
      deleteIpo: (id) => {
        persistAndRefresh(deleteIpoInDatabase(id))
        setData((current) => {
          const before = current.ipos.find((item) => item.id === id)
          if (!before) return current
          createVersionSnapshot(current, `删除新股：${before.name}`)
          addOperationLog({
            action: '删除新股',
            objectType: '新股',
            objectName: before.name,
            before,
          })
          const subscriptionIds = new Set(
            current.subscriptions
              .filter((item) => item.ipoId === id)
              .map((item) => item.id),
          )
          return {
            ...current,
            ipos: current.ipos.filter((item) => item.id !== id),
            subscriptions: current.subscriptions.filter(
              (item) => item.ipoId !== id,
            ),
            sales: current.sales.filter(
              (item) => !subscriptionIds.has(item.subscriptionId),
            ),
          }
        })
      },
      addSubscriptions: (inputs) => {
        persistAndRefresh(createSubscriptionsInDatabase(inputs))
        setData((current) => {
          createVersionSnapshot(current, '新增申购前')
          const created = inputs.map((input) => {
            const account = current.accounts.find(
              (item) => item.id === input.accountId,
            )
            const method =
              input.subscriptionMethod ??
              input.method ??
              account?.defaultSubscriptionMethod ??
              '10x'
            return timestamped({
              ...input,
              method,
              subscriptionMethod: method,
            }) as Subscription
          })
          created.forEach((subscription) => {
            const account = current.accounts.find(
              (item) => item.id === subscription.accountId,
            )
            const ipo = current.ipos.find(
              (item) => item.id === subscription.ipoId,
            )
            addOperationLog({
              action: '新增申购',
              objectType: '申购记录',
              objectName: `${ipo?.name ?? '未知新股'} / ${
                account ? formatAccountNamePlain(account) : '未知账户'
              }`,
              after: subscription,
            })
          })
          return {
            ...current,
            subscriptions: [...created, ...current.subscriptions],
          }
        })
      },
      updateSubscription: (id, input) => {
        persistAndRefresh(updateSubscriptionInDatabase(id, input))
        setData((current) => {
          const before = current.subscriptions.find(
            (item) => item.id === id,
          )
          if (!before) return current
          const ipo = current.ipos.find((item) => item.id === input.ipoId)
          const account = current.accounts.find(
            (item) => item.id === input.accountId,
          )
          const method = getSubscriptionMethod(input, account)
          createVersionSnapshot(current, `修改申购：${ipo?.name ?? ''}`)
          const after = {
            ...before,
            ...input,
            method,
            subscriptionMethod: method,
            updatedAt: new Date().toISOString(),
          }
          addOperationLog({
            action: '修改申购',
            objectType: '申购记录',
            objectName: `${ipo?.name ?? '未知新股'} / ${
              account ? formatAccountNamePlain(account) : '未知账户'
            }`,
            before,
            after,
          })
          return {
            ...current,
            subscriptions: current.subscriptions.map((subscription) =>
              subscription.id === id ? after : subscription,
            ),
          }
        })
      },
      deleteSubscription: (id) => {
        persistAndRefresh(deleteSubscriptionInDatabase(id))
        setData((current) => {
          const before = current.subscriptions.find((item) => item.id === id)
          if (!before) return current
          const ipo = current.ipos.find((item) => item.id === before.ipoId)
          const account = current.accounts.find(
            (item) => item.id === before.accountId,
          )
          createVersionSnapshot(current, `删除申购：${ipo?.name ?? ''}`)
          addOperationLog({
            action: '删除申购',
            objectType: '申购记录',
            objectName: `${ipo?.name ?? '未知新股'} / ${
              account ? formatAccountNamePlain(account) : '未知账户'
            }`,
            before,
          })
          return {
            ...current,
            subscriptions: current.subscriptions.filter(
              (item) => item.id !== id,
            ),
            sales: current.sales.filter(
              (item) => item.subscriptionId !== id,
            ),
          }
        })
      },
      batchUpdateSubscriptions: (ids, changes) => {
        const selectedIds = new Set(ids)
        if (selectedIds.size === 0) return
        setData((current) => {
          const selected = current.subscriptions.filter((item) =>
            selectedIds.has(item.id),
          )
          if (selected.length === 0) return current

          const now = new Date().toISOString()
          const affectedIpoIds = new Set(selected.map((item) => item.ipoId))
          const nextSubscriptions = current.subscriptions.map((item) => {
            if (!selectedIds.has(item.id)) return item
            const method = changes.method ?? getSubscriptionMethod(item)
            return {
              ...item,
              method,
              subscriptionMethod: method,
              subscriptionDate: changes.subscriptionDate
                ? applyDateChange(
                    item.subscriptionDate,
                    changes.subscriptionDate,
                  )
                : item.subscriptionDate,
              remarks: changes.remarks
                ? applyRemarksChange(item.remarks, changes.remarks)
                : item.remarks,
              updatedAt: now,
            }
          })
          const nextIpos = changes.listingDate
            ? current.ipos.map((ipo) =>
                affectedIpoIds.has(ipo.id)
                  ? {
                      ...ipo,
                      listingDate: applyDateChange(
                        ipo.listingDate,
                        changes.listingDate!,
                      ),
                      updatedAt: now,
                    }
                  : ipo,
              )
            : current.ipos
          const next = {
            ...current,
            subscriptions: nextSubscriptions,
            ipos: nextIpos,
          }
          const updatedSubscriptions = nextSubscriptions.filter((item) =>
            selectedIds.has(item.id),
          )
          const updatedIpos =
            changes.listingDate
              ? nextIpos.filter((ipo) => affectedIpoIds.has(ipo.id))
              : []
          persistAndRefresh(
            Promise.all([
              ...updatedSubscriptions.map((subscription) =>
                updateSubscriptionInDatabase(
                  subscription.id,
                  subscriptionToInput(subscription),
                ),
              ),
              ...updatedIpos.map((ipo) =>
                updateIpoInDatabase(ipo.id, {
                  name: ipo.name,
                  stockCode: ipo.stockCode,
                  issuePrice: ipo.issuePrice,
                  lotSize: ipo.lotSize,
                  subscriptionDate: ipo.subscriptionDate,
                  listingDate: ipo.listingDate,
                  industry: ipo.industry,
                }),
              ),
            ]),
          )

          createVersionSnapshot(current, `批量修改申购前（${selected.length}条）`)
          addOperationLog({
            action: '批量修改申购',
            objectType: '申购记录',
            objectName: batchSubscriptionObjectName(
              selected,
              current.ipos,
            ),
            before: batchChangeSummary(selected, current.ipos, changes),
            after: {
              修改人: '本地用户',
              修改数量: selected.length,
              ...batchChangeDescription(changes),
            },
          })
          lastSubscriptionBatch.current = { before: current, after: next }
          return next
        })
        setSubscriptionBatchRevision((revision) => revision + 1)
      },
      batchDeleteSubscriptions: (ids) => {
        const selectedIds = new Set(ids)
        if (selectedIds.size === 0) return
        persistAndRefresh(deleteSubscriptionsInDatabase(ids))
        setData((current) => {
          const selected = current.subscriptions.filter((item) =>
            selectedIds.has(item.id),
          )
          if (selected.length === 0) return current
          const next = {
            ...current,
            subscriptions: current.subscriptions.filter(
              (item) => !selectedIds.has(item.id),
            ),
            sales: current.sales.filter(
              (sale) => !selectedIds.has(sale.subscriptionId),
            ),
          }
          createVersionSnapshot(current, `批量删除申购前（${selected.length}条）`)
          addOperationLog({
            action: '批量删除申购',
            objectType: '申购记录',
            objectName: batchSubscriptionObjectName(
              selected,
              current.ipos,
            ),
            before: {
              记录数量: selected.length,
              关联卖出记录: current.sales.filter((sale) =>
                selectedIds.has(sale.subscriptionId),
              ).length,
            },
            after: {
              修改人: '本地用户',
              删除记录: selected.length,
              删除卖出记录: current.sales.filter((sale) =>
                selectedIds.has(sale.subscriptionId),
              ).length,
            },
          })
          lastSubscriptionBatch.current = { before: current, after: next }
          return next
        })
        setSubscriptionBatchRevision((revision) => revision + 1)
      },
      canUndoSubscriptionBatch:
        subscriptionBatchRevision > 0 &&
        lastSubscriptionBatch.current?.after === data,
      undoLastSubscriptionBatch: () => {
        const last = lastSubscriptionBatch.current
        if (!last || last.after !== data) {
          lastSubscriptionBatch.current = null
          setSubscriptionBatchRevision(0)
          return false
        }
        createVersionSnapshot(data, '撤销批量申购操作前')
        addOperationLog({
          action: '撤销批量申购操作',
          objectType: '申购记录',
          objectName: '恢复到最近一次批量操作前',
          before: {
            subscriptions: data.subscriptions.length,
            sales: data.sales.length,
          },
          after: {
            subscriptions: last.before.subscriptions.length,
            sales: last.before.sales.length,
          },
        })
        setData(last.before)
        lastSubscriptionBatch.current = null
        setSubscriptionBatchRevision(0)
        return true
      },
      addSale: (input) =>
        setData((current) => {
          persistAndRefresh(createSaleInDatabase(input))
          createVersionSnapshot(current, '新增卖出前')
          const after = timestamped(input) as Sale
          const subscription = current.subscriptions.find(
            (item) => item.id === input.subscriptionId,
          )
          const ipo = current.ipos.find(
            (item) => item.id === subscription?.ipoId,
          )
          addOperationLog({
            action: '新增卖出',
            objectType: '卖出记录',
            objectName: ipo?.name ?? '未知新股',
            after,
          })
          return {
            ...current,
            sales: [after, ...current.sales],
          }
        }),
      updateSale: (id, input) =>
        setData((current) => {
          persistAndRefresh(updateSaleInDatabase(id, input))
          const before = current.sales.find((item) => item.id === id)
          if (!before) return current
          const subscription = current.subscriptions.find(
            (item) => item.id === input.subscriptionId,
          )
          const ipo = current.ipos.find(
            (item) => item.id === subscription?.ipoId,
          )
          createVersionSnapshot(current, `修改卖出：${ipo?.name ?? ''}`)
          const after = {
            ...before,
            ...input,
            updatedAt: new Date().toISOString(),
          }
          addOperationLog({
            action: '修改卖出',
            objectType: '卖出记录',
            objectName: ipo?.name ?? '未知新股',
            before,
            after,
          })
          return {
            ...current,
            sales: current.sales.map((sale) =>
              sale.id === id ? after : sale,
            ),
          }
        }),
      deleteSale: (id) =>
        setData((current) => {
          persistAndRefresh(deleteSaleInDatabase(id))
          const before = current.sales.find((item) => item.id === id)
          if (!before) return current
          const subscription = current.subscriptions.find(
            (item) => item.id === before.subscriptionId,
          )
          const ipo = current.ipos.find(
            (item) => item.id === subscription?.ipoId,
          )
          createVersionSnapshot(current, `删除卖出：${ipo?.name ?? ''}`)
          addOperationLog({
            action: '删除卖出',
            objectType: '卖出记录',
            objectName: ipo?.name ?? '未知新股',
            before,
          })
          return {
            ...current,
            sales: current.sales.filter((item) => item.id !== id),
          }
        }),
      addWithdrawal: (input) =>
        setData((current) => {
          persistAndRefresh(createWithdrawalInDatabase(input))
          createVersionSnapshot(current, '新增出金前')
          return {
            ...current,
            withdrawals: [
              timestamped(input) as Withdrawal,
              ...current.withdrawals,
            ],
          }
        }),
      updateWithdrawal: (id, input) =>
        setData((current) => {
          persistAndRefresh(updateWithdrawalInDatabase(id, input))
          const withdrawal = current.withdrawals.find(
            (item) => item.id === id,
          )
          if (!withdrawal) return current
          createVersionSnapshot(current, `编辑出金：${withdrawal.date}`)
          return {
            ...current,
            withdrawals: current.withdrawals.map((item) =>
              item.id === id
                ? {
                    ...item,
                    ...input,
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
          }
        }),
      deleteWithdrawal: (id) =>
        setData((current) => {
          persistAndRefresh(deleteWithdrawalInDatabase(id))
          const withdrawal = current.withdrawals.find(
            (item) => item.id === id,
          )
          if (!withdrawal) return current
          createVersionSnapshot(current, `删除出金：${withdrawal.date}`)
          return {
            ...current,
            withdrawals: current.withdrawals.filter((item) => item.id !== id),
          }
        }),
      addExchangeRecord: (input) =>
        setData((current) => {
          persistAndRefresh(createExchangeRecordInDatabase(input))
          const account = current.accounts.find(
            (item) => item.id === input.accountId,
          )
          createVersionSnapshot(current, '新增换汇记录前')
          const after = timestamped(input) as ExchangeRecord
          addOperationLog({
            action: '新增换汇',
            objectType: '换汇记录',
            objectName: account ? formatAccountNamePlain(account) : '未知账户',
            after,
          })
          return {
            ...current,
            exchangeRecords: [after, ...current.exchangeRecords],
          }
        }),
      updateExchangeRecord: (id, input) =>
        setData((current) => {
          persistAndRefresh(updateExchangeRecordInDatabase(id, input))
          const before = current.exchangeRecords.find(
            (item) => item.id === id,
          )
          if (!before) return current
          const account = current.accounts.find(
            (item) => item.id === input.accountId,
          )
          createVersionSnapshot(current, '编辑换汇记录前')
          const after = {
            ...before,
            ...input,
            updatedAt: new Date().toISOString(),
          }
          addOperationLog({
            action: '编辑换汇',
            objectType: '换汇记录',
            objectName: account ? formatAccountNamePlain(account) : '未知账户',
            before,
            after,
          })
          return {
            ...current,
            exchangeRecords: current.exchangeRecords.map((item) =>
              item.id === id ? after : item,
            ),
          }
        }),
      deleteExchangeRecord: (id) =>
        setData((current) => {
          persistAndRefresh(deleteExchangeRecordInDatabase(id))
          const before = current.exchangeRecords.find(
            (item) => item.id === id,
          )
          if (!before) return current
          createVersionSnapshot(current, '删除换汇记录前')
          addOperationLog({
            action: '删除换汇',
            objectType: '换汇记录',
            objectName:
              current.accounts.find((item) => item.id === before.accountId)
                ?.name ?? '未知账户',
            before,
          })
          return {
            ...current,
            exchangeRecords: current.exchangeRecords.filter(
              (item) => item.id !== id,
            ),
          }
        }),
      updateFxRates: (rates) =>
        setData((current) => ({
          ...current,
          fxRates: {
            ...rates,
            updatedAt: new Date().toISOString(),
          },
        })),
      addHolding: (input) =>
        setData((current) => {
          createVersionSnapshot(current, '新增持仓前')
          const after = timestamped(input) as Holding
          addOperationLog({
            action: '新增持仓',
            objectType: '持仓记录',
            objectName: input.stockName,
            after,
          })
          return {
            ...current,
            holdings: [after, ...current.holdings],
          }
        }),
      updateHolding: (id, input) =>
        setData((current) => {
          const before = current.holdings.find((item) => item.id === id)
          if (!before) return current
          createVersionSnapshot(current, `编辑持仓：${before.stockName}`)
          const after = {
            ...before,
            ...input,
            updatedAt: new Date().toISOString(),
          }
          addOperationLog({
            action: '编辑持仓',
            objectType: '持仓记录',
            objectName: after.stockName,
            before,
            after,
          })
          return {
            ...current,
            holdings: current.holdings.map((item) =>
              item.id === id ? after : item,
            ),
          }
        }),
      deleteHolding: (id) =>
        setData((current) => {
          const before = current.holdings.find((item) => item.id === id)
          if (!before) return current
          createVersionSnapshot(current, `删除持仓：${before.stockName}`)
          addOperationLog({
            action: '删除持仓',
            objectType: '持仓记录',
            objectName: before.stockName,
            before,
          })
          return {
            ...current,
            holdings: current.holdings.filter((item) => item.id !== id),
          }
        }),
      replaceData: (nextData, operation = '导入数据') =>
        setData((current) => {
          const normalizedNextData = normalizeAppData(nextData)
          createVersionSnapshot(current, `${operation}前`)
          addOperationLog({
            action: operation,
            objectType: '系统数据',
            objectName: '完整数据',
            before: {
              accounts: current.accounts.length,
              ipos: current.ipos.length,
              subscriptions: current.subscriptions.length,
              sales: current.sales.length,
            },
            after: {
              accounts: normalizedNextData.accounts.length,
              ipos: normalizedNextData.ipos.length,
              subscriptions: normalizedNextData.subscriptions.length,
              sales: normalizedNextData.sales.length,
            },
          })
          return normalizedNextData
        }),
      restoreAutoBackup: () => {
        return false
      },
    }),
    [cloud, data, persistAndRefresh, refreshData, subscriptionBatchRevision],
  )

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  )
}

function applyDateChange(
  current: string,
  change: NonNullable<SubscriptionBatchChanges['subscriptionDate']>,
) {
  if (change.mode === 'set') return String(change.value)
  if (!current) return current
  const date = new Date(`${current}T00:00:00`)
  if (Number.isNaN(date.getTime())) return current
  date.setDate(date.getDate() + Number(change.value))
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function applyRemarksChange(
  current: string,
  change: NonNullable<SubscriptionBatchChanges['remarks']>,
) {
  if (change.mode === 'clear') return ''
  const value = change.value?.trim() ?? ''
  if (change.mode === 'replace') return value
  return [current.trim(), value].filter(Boolean).join('；')
}

function batchSubscriptionObjectName(
  subscriptions: Subscription[],
  ipos: Ipo[],
) {
  const names = [
    ...new Set(
      subscriptions.map(
        (subscription) =>
          ipos.find((ipo) => ipo.id === subscription.ipoId)?.name ?? '未知新股',
      ),
    ),
  ]
  return `${names.length === 1 ? names[0] : `${names.length}只新股`} · 共${subscriptions.length}条`
}

function batchChangeSummary(
  subscriptions: Subscription[],
  ipos: Ipo[],
  changes: SubscriptionBatchChanges,
) {
  const summary: Record<string, unknown> = {
    修改数量: subscriptions.length,
  }
  if (changes.method) {
    summary.申购方式 = [
      ...new Set(
        subscriptions.map((item) =>
          getSubscriptionMethod(item) === 'cash' ? '现金' : '10x融资',
        ),
      ),
    ].join('、')
  }
  if (changes.subscriptionDate) summary.申购日期 = '原记录日期'
  if (changes.listingDate) {
    summary.上市日期 = [
      ...new Set(
        subscriptions.map(
          (item) => ipos.find((ipo) => ipo.id === item.ipoId)?.listingDate,
        ),
      ),
    ]
      .filter(Boolean)
      .join('、')
  }
  if (changes.remarks) summary.备注 = '原备注'
  return summary
}

function batchChangeDescription(changes: SubscriptionBatchChanges) {
  const summary: Record<string, unknown> = {}
  if (changes.method) {
    summary.申购方式 = changes.method === 'cash' ? '现金' : '10x融资'
  }
  if (changes.subscriptionDate) {
    summary.申购日期 =
      changes.subscriptionDate.mode === 'set'
        ? changes.subscriptionDate.value
        : `顺延 ${changes.subscriptionDate.value} 天`
  }
  if (changes.listingDate) {
    summary.上市日期 =
      changes.listingDate.mode === 'set'
        ? changes.listingDate.value
        : `顺延 ${changes.listingDate.value} 天`
  }
  if (changes.remarks) {
    summary.备注 =
      changes.remarks.mode === 'clear'
        ? '删除备注'
        : `${changes.remarks.mode === 'append' ? '新增' : '替换'}：${
            changes.remarks.value ?? ''
          }`
  }
  return summary
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider')
  }
  return context
}
