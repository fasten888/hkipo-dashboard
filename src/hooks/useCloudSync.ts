import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  fetchCloudSnapshot,
  hashAppData,
  isCloudConfigured,
  isCloudAuthError,
  isEmptyAppData,
  loadCloudSession,
  loadSyncMeta,
  saveCloudSession,
  saveCloudSnapshot,
  saveSyncMeta,
  signInWithPassword,
  signOutCloud,
  signUpWithPassword,
} from '../services/cloud'
import { saveAppData } from '../services/storage'
import type {
  CloudConflict,
  CloudDiagnosticResult,
  CloudDiagnosticStep,
  CloudRemoteSummary,
  CloudSession,
  CloudSyncStatus,
  CloudSyncTimes,
  CloudUploadReport,
} from '../types/cloud'
import type { AppData } from '../types/store'

export function useCloudSync(
  data: AppData,
  setData: Dispatch<SetStateAction<AppData>>,
) {
  const configured = isCloudConfigured()
  const [session, setSession] = useState<CloudSession | null>(
    configured ? loadCloudSession : null,
  )
  const [status, setStatus] = useState<CloudSyncStatus>(
    configured ? (session ? 'loading' : 'signed_out') : 'disabled',
  )
  const [message, setMessage] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
    session ? loadSyncMeta(session.user.id)?.remoteUpdatedAt ?? null : null,
  )
  const [pendingChanges, setPendingChanges] = useState(false)
  const [conflict, setConflict] = useState<CloudConflict | null>(null)
  const [diagnostic, setDiagnostic] = useState<CloudDiagnosticResult | null>(
    null,
  )
  const [remoteSummary, setRemoteSummary] =
    useState<CloudRemoteSummary | null>(null)
  const [uploadReport, setUploadReport] = useState<CloudUploadReport | null>(
    null,
  )
  const [syncTimes, setSyncTimes] = useState<CloudSyncTimes>(() => {
    const meta = session ? loadSyncMeta(session.user.id) : null
    return {
      lastUploadedAt: meta?.lastUploadedAt ?? null,
      lastDownloadedAt: meta?.lastDownloadedAt ?? null,
    }
  })
  const dataRef = useRef(data)
  const sessionRef = useRef(session)
  const statusRef = useRef(status)
  const initializedRef = useRef(false)
  const uploadTimerRef = useRef<number | null>(null)
  const retryTimerRef = useRef<number | null>(null)
  const uploadPromiseRef = useRef<Promise<void> | null>(null)
  const queuedUploadDataRef = useRef<AppData | null>(null)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const updateSession = useCallback((next: CloudSession | null) => {
    sessionRef.current = next
    setSession(next)
    saveCloudSession(next)
  }, [])

  const updateRemoteSummary = useCallback(
    (snapshot: { data: AppData; updatedAt: string; rowId?: string } | null) => {
      const rowId = snapshot?.rowId ?? null
      if (rowId || snapshot?.updatedAt) {
        console.info('[HKIPO Cloud] active remote snapshot', {
          rowId,
          updatedAt: snapshot?.updatedAt ?? null,
        })
      }
      setRemoteSummary({
        counts: snapshot
          ? countAppData(snapshot.data)
          : {
              accounts: 0,
              ipos: 0,
              subscriptions: 0,
              allotments: 0,
              sales: 0,
            },
        updatedAt: snapshot?.updatedAt ?? null,
        rowId,
        checkedAt: new Date().toISOString(),
      })
    },
    [],
  )

  const saveMeta = useCallback(
    (
      userId: string,
      remoteUpdatedAt: string,
      nextData: AppData,
      event?: 'upload' | 'download',
    ) => {
      const meta = saveSyncMeta(userId, remoteUpdatedAt, nextData, event)
      setSyncTimes({
        lastUploadedAt: meta.lastUploadedAt ?? null,
        lastDownloadedAt: meta.lastDownloadedAt ?? null,
      })
      return meta
    },
    [],
  )

  const handleSyncError = useCallback(
    (error: unknown) => {
      const text = error instanceof Error ? error.message : '云同步失败'
      if (isCloudAuthError(error)) {
        setStatus('auth_expired')
        setMessage(text)
        setPendingChanges(false)
        return true
      }
      setStatus(navigator.onLine ? 'error' : 'offline')
      setMessage(text)
      return false
    },
    [],
  )

  const applyRemoteData = useCallback(
    (nextData: AppData, reason: string) => {
      saveAppData(nextData)
      setData(nextData)
      window.dispatchEvent(
        new CustomEvent('hkipo:app-data-replaced', {
          detail: {
            reason,
            subscriptions: nextData.subscriptions.length,
            wins: nextData.subscriptions.filter(
              (item) => item.status === 'won',
            ).length,
            updatedAt: new Date().toISOString(),
          },
        }),
      )
    },
    [setData],
  )

  const upload = useCallback(
    async (nextData: AppData, activeSession?: CloudSession) => {
      if (uploadPromiseRef.current) {
        queuedUploadDataRef.current = nextData
        return uploadPromiseRef.current
      }
      const currentSession = activeSession ?? sessionRef.current
      if (!currentSession) return
      let completed = false
      const task = (async () => {
        setStatus('syncing')
        setMessage('正在上传本机数据…')
        const startedAt = new Date().toISOString()
        const localCounts = countAppData(nextData)
        console.info('[HKIPO Cloud] uploadToCloud before upload', {
          uploadDataKeys: Object.keys(nextData),
          lengths: summarizeUploadData(nextData),
        })
        setUploadReport({
          startedAt,
          beforeCounts: null,
          localCounts,
          returnedCounts: null,
          confirmedCounts: null,
          writtenCounts: null,
          supabaseUpdatedAt: null,
          supabaseReturnedRows: 0,
          status: 'running',
        })
        const before = await fetchCloudSnapshot(currentSession)
        updateSession(before.session)
        updateRemoteSummary(before.snapshot)
        const beforeCounts = before.snapshot
          ? countAppData(before.snapshot.data)
          : null
        console.info('[HKIPO Cloud] database before upload', {
          recordId: before.snapshot?.rowId ?? null,
          updatedAt: before.snapshot?.updatedAt ?? null,
          lengths: before.snapshot
            ? summarizeUploadData(before.snapshot.data)
            : null,
        })
        setUploadReport((current) =>
          current ? { ...current, beforeCounts } : current,
        )
        const result = await saveCloudSnapshot(before.session, nextData)
        console.info('[HKIPO Cloud] uploadToCloud upsert returned', {
          recordId: result.snapshot.rowId ?? null,
          updatedAt: result.snapshot.updatedAt,
          lengths: summarizeUploadData(result.snapshot.data),
        })
        const localHash = hashAppData(nextData)
        const savedHash = hashAppData(result.snapshot.data)
        if (localHash !== savedHash) {
          throw new Error('云端保存校验失败，请重新同步')
        }
        updateSession(result.session)
        updateRemoteSummary(result.snapshot)
        const returnedCounts = countAppData(result.snapshot.data)
        const confirmed = await fetchCloudSnapshot(result.session)
        updateSession(confirmed.session)
        updateRemoteSummary(confirmed.snapshot)
        const confirmedCounts = confirmed.snapshot
          ? countAppData(confirmed.snapshot.data)
          : null
        console.info('[HKIPO Cloud] database after upload readback', {
          recordId: confirmed.snapshot?.rowId ?? null,
          updatedAt: confirmed.snapshot?.updatedAt ?? null,
          lengths: confirmed.snapshot
            ? summarizeUploadData(confirmed.snapshot.data)
            : null,
        })
        const writtenCounts =
          beforeCounts && confirmedCounts
            ? diffCounts(beforeCounts, confirmedCounts)
            : null
        saveMeta(
          result.session.user.id,
          result.snapshot.updatedAt,
          result.snapshot.data,
          'upload',
        )
        setLastSyncedAt(result.snapshot.updatedAt)
        setPendingChanges(false)
        setConflict(null)
        setStatus('synced')
        setMessage('上传完成，已读取云端记录数确认')
        setUploadReport({
          startedAt,
          completedAt: new Date().toISOString(),
          beforeCounts,
          localCounts,
          returnedCounts,
          confirmedCounts,
          writtenCounts,
          supabaseUpdatedAt: result.snapshot.updatedAt,
          supabaseReturnedRows: 1,
          status: 'success',
        })
        completed = true
      })()
      uploadPromiseRef.current = task
      try {
        await task
      } catch (error) {
        const persistedSession = loadCloudSession()
        if (
          persistedSession &&
          persistedSession.user.id === currentSession.user.id &&
          persistedSession.accessToken !== currentSession.accessToken
        ) {
          updateSession(persistedSession)
        }
        handleSyncError(error)
        setUploadReport((current) =>
          current
            ? {
                ...current,
                completedAt: new Date().toISOString(),
                status: 'failed',
                error: error instanceof Error ? error.message : '上传失败',
              }
            : current,
        )
        throw error
      } finally {
        uploadPromiseRef.current = null
      }
      const queuedData = queuedUploadDataRef.current
      queuedUploadDataRef.current = null
      if (
        completed &&
        queuedData &&
        hashAppData(queuedData) !== hashAppData(nextData)
      ) {
        await upload(queuedData, sessionRef.current ?? currentSession)
      }
    },
    [handleSyncError, saveMeta, updateRemoteSummary, updateSession],
  )

  const reconcile = useCallback(
    async (activeSession: CloudSession) => {
      setStatus('loading')
      setMessage('正在检查云端数据…')
      try {
        const result = await fetchCloudSnapshot(activeSession)
        updateSession(result.session)
        updateRemoteSummary(result.snapshot)
        const local = dataRef.current
        const remote = result.snapshot

        if (!remote) {
          await upload(local, result.session)
          initializedRef.current = true
          return
        }

        const localHash = hashAppData(local)
        const remoteHash = hashAppData(remote.data)
        const meta = loadSyncMeta(result.session.user.id)

        if (localHash === remoteHash) {
          saveMeta(result.session.user.id, remote.updatedAt, remote.data)
          setLastSyncedAt(remote.updatedAt)
          setPendingChanges(false)
          setStatus('synced')
          setMessage('数据已同步')
        } else if (isEmptyAppData(local)) {
          applyRemoteData(remote.data, 'cloud-download-empty-local')
          saveMeta(result.session.user.id, remote.updatedAt, remote.data, 'download')
          setLastSyncedAt(remote.updatedAt)
          setPendingChanges(false)
          setStatus('synced')
          setMessage('已从云端恢复数据')
        } else if (!meta) {
          setConflict({
            local,
            remote: remote.data,
            remoteUpdatedAt: remote.updatedAt,
          })
          setStatus('conflict')
          setMessage('本机和云端都有数据，请选择保留哪一份')
        } else {
          const localChanged = meta.dataHash !== localHash
          const remoteChanged = meta.dataHash !== remoteHash
          if (remoteChanged && !localChanged) {
            setConflict({
              local,
              remote: remote.data,
              remoteUpdatedAt: remote.updatedAt,
            })
            setStatus('conflict')
            setMessage('云端有新版本，请确认后再覆盖本机数据')
          } else if (localChanged && !remoteChanged) {
            await upload(local, result.session)
          } else if (localChanged && remoteChanged) {
            setConflict({
              local,
              remote: remote.data,
              remoteUpdatedAt: remote.updatedAt,
            })
            setStatus('conflict')
            setMessage('检测到两台设备都修改过数据，请选择保留版本')
          } else {
            saveMeta(result.session.user.id, remote.updatedAt, remote.data)
            setLastSyncedAt(remote.updatedAt)
            setPendingChanges(false)
            setStatus('synced')
            setMessage('数据已同步')
          }
        }
      } catch (error) {
        const persistedSession = loadCloudSession()
        if (
          persistedSession &&
          persistedSession.user.id === activeSession.user.id &&
          persistedSession.accessToken !== activeSession.accessToken
        ) {
          updateSession(persistedSession)
        }
        handleSyncError(error)
      } finally {
        initializedRef.current = true
      }
    },
    [
      applyRemoteData,
      handleSyncError,
      saveMeta,
      updateRemoteSummary,
      updateSession,
      upload,
    ],
  )

  useEffect(() => {
    if (!configured || !session || initializedRef.current) return
    void reconcile(session)
  }, [configured, reconcile, session])

  useEffect(() => {
    if (
      !configured ||
      !session ||
      !initializedRef.current ||
      status === 'conflict' ||
      status === 'loading' ||
      status === 'syncing' ||
      status === 'error' ||
      status === 'offline' ||
      status === 'auth_expired'
    ) {
      return
    }
    const meta = loadSyncMeta(session.user.id)
    if (meta?.dataHash === hashAppData(data)) {
      setPendingChanges(false)
      return
    }
    setPendingChanges(true)
    setMessage('本机有新修改，等待上传…')

    if (uploadTimerRef.current) window.clearTimeout(uploadTimerRef.current)
    uploadTimerRef.current = window.setTimeout(() => {
      void upload(data).catch((error: unknown) => {
        const isAuthProblem = handleSyncError(error)
        if (isAuthProblem) return
        if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
        retryTimerRef.current = window.setTimeout(() => {
          if (sessionRef.current) void reconcile(sessionRef.current)
        }, 5_000)
      })
    }, 600)
    return () => {
      if (uploadTimerRef.current) window.clearTimeout(uploadTimerRef.current)
    }
  }, [configured, data, handleSyncError, reconcile, session, status, upload])

  useEffect(() => {
    const handleResume = () => {
      if (
        document.visibilityState === 'visible' &&
        sessionRef.current &&
        initializedRef.current &&
        !conflict &&
        !uploadPromiseRef.current &&
        statusRef.current !== 'auth_expired'
      ) {
        void reconcile(sessionRef.current)
      }
    }
    window.addEventListener('online', handleResume)
    document.addEventListener('visibilitychange', handleResume)
    const pollingTimer = window.setInterval(handleResume, 30_000)
    return () => {
      window.removeEventListener('online', handleResume)
      document.removeEventListener('visibilitychange', handleResume)
      window.clearInterval(pollingTimer)
    }
  }, [conflict, reconcile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      setStatus('loading')
      setMessage('')
      try {
        const next = await signInWithPassword(email, password)
        initializedRef.current = false
        setConflict(null)
        setDiagnostic(null)
        const meta = loadSyncMeta(next.user.id)
        setSyncTimes({
          lastUploadedAt: meta?.lastUploadedAt ?? null,
          lastDownloadedAt: meta?.lastDownloadedAt ?? null,
        })
        updateSession(next)
        await reconcile(next)
      } catch (error) {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : '登录失败')
      }
    },
    [reconcile, updateSession],
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      setStatus('loading')
      setMessage('')
      try {
        const result = await signUpWithPassword(email, password)
        setMessage(result.message)
        if (!result.session) {
          setStatus('signed_out')
          return
        }
        initializedRef.current = false
        updateSession(result.session)
        await reconcile(result.session)
      } catch (error) {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : '注册失败')
      }
    },
    [reconcile, updateSession],
  )

  const signOut = useCallback(async () => {
    const currentSession = sessionRef.current
    try {
      if (currentSession) await signOutCloud(currentSession)
    } catch {
      // Local credentials are cleared below even if the remote logout token is invalid.
    }
    initializedRef.current = false
    updateSession(null)
    setConflict(null)
    setLastSyncedAt(null)
    setPendingChanges(false)
    setRemoteSummary(null)
    setSyncTimes({ lastUploadedAt: null, lastDownloadedAt: null })
    setStatus(configured ? 'signed_out' : 'disabled')
    setMessage('')
  }, [configured, updateSession])

  const syncNow = useCallback(async () => {
    const currentSession = sessionRef.current
    if (currentSession) await reconcile(currentSession)
  }, [reconcile])

  const refreshRemoteSummaryNow = useCallback(async () => {
    const currentSession = sessionRef.current
    if (!currentSession) return
    try {
      const result = await fetchCloudSnapshot(currentSession)
      updateSession(result.session)
      updateRemoteSummary(result.snapshot)
      if (statusRef.current === 'auth_expired') {
        setStatus('synced')
      }
      setMessage('已刷新云端统计')
    } catch (error) {
      handleSyncError(error)
    }
  }, [handleSyncError, updateRemoteSummary, updateSession])

  const uploadNow = useCallback(async () => {
    const currentSession = sessionRef.current
    if (!currentSession) return
    try {
      await upload(dataRef.current, currentSession)
    } catch (error) {
      handleSyncError(error)
    }
  }, [handleSyncError, upload])

  const pullRemoteNow = useCallback(async () => {
    const currentSession = sessionRef.current
    if (!currentSession) return
    try {
      setStatus('loading')
      setMessage('正在强制读取云端数据…')
      const result = await fetchCloudSnapshot(currentSession)
      updateSession(result.session)
      updateRemoteSummary(result.snapshot)
      if (!result.snapshot) {
        setStatus('synced')
        setMessage('云端还没有数据')
        return
      }
      applyRemoteData(result.snapshot.data, 'cloud-force-download')
      saveMeta(
        result.session.user.id,
        result.snapshot.updatedAt,
        result.snapshot.data,
        'download',
      )
      setLastSyncedAt(result.snapshot.updatedAt)
      setPendingChanges(false)
      setConflict(null)
      setStatus('synced')
      setMessage('已强制使用云端数据')
    } catch (error) {
      handleSyncError(error)
    }
  }, [
    applyRemoteData,
    handleSyncError,
    saveMeta,
    updateRemoteSummary,
    updateSession,
  ])

  const resolveConflict = useCallback(
    async (choice: 'local' | 'remote') => {
      const currentSession = sessionRef.current
      if (!currentSession || !conflict) return
      try {
        if (choice === 'local') {
          await upload(dataRef.current, currentSession)
        } else {
          applyRemoteData(conflict.remote, 'cloud-conflict-remote')
          saveMeta(
            currentSession.user.id,
            conflict.remoteUpdatedAt,
            conflict.remote,
            'download',
          )
          setLastSyncedAt(conflict.remoteUpdatedAt)
          setPendingChanges(false)
          setConflict(null)
          setStatus('synced')
          setMessage('已使用云端数据')
        }
      } catch (error) {
        handleSyncError(error)
      }
    },
    [applyRemoteData, conflict, handleSyncError, saveMeta, upload],
  )

  const runDiagnostic = useCallback(async () => {
    const currentSession = sessionRef.current
    const startedAt = new Date().toISOString()
    const testRecordId = `sync-test-${crypto.randomUUID()}`
    const tableName = 'public.user_data'
    const steps: CloudDiagnosticStep[] = []

    const updateDiagnostic = (
      step: CloudDiagnosticStep,
      extra?: Partial<CloudDiagnosticResult>,
    ) => {
      steps.push(step)
      setDiagnostic({
        testRecordId,
        tableName,
        startedAt,
        steps: [...steps],
        ...extra,
      })
    }

    if (!currentSession) {
      updateDiagnostic(
        {
          name: '登录状态',
          status: 'failed',
          detail: '没有找到同步账号，请先登录云同步。',
        },
        { completedAt: new Date().toISOString(), lostAt: '登录状态' },
      )
      return
    }

    setStatus('syncing')
    setMessage('正在运行同步诊断…')
    setDiagnostic({
      testRecordId,
      tableName,
      startedAt,
      steps: [],
    })

    try {
      updateDiagnostic({
        name: '登录状态',
        status: 'success',
        detail: `当前用户ID：${currentSession.user.id}`,
      })

      const fetched = await fetchCloudSnapshot(currentSession)
      updateSession(fetched.session)
      updateRemoteSummary(fetched.snapshot)
      const localData = dataRef.current
      const localCounts = countAppData(localData)
      const remoteData = fetched.snapshot?.data ?? null
      const remoteCounts = remoteData ? countAppData(remoteData) : null
      const readDetail = formatCloudReadDebug(fetched.debug)

      if (!remoteData || !remoteCounts) {
        updateDiagnostic(
          {
            name: '读取 Supabase',
            status: 'failed',
            detail: `云端没有读取到数据。${readDetail}`,
          },
          {
            completedAt: new Date().toISOString(),
            lostAt: '读取 Supabase',
          },
        )
        throw new Error('云端没有读取到数据')
      }

      updateDiagnostic({
        name: '读取 Supabase',
        status: 'success',
        detail: `${readDetail}。云端当前数量：${remoteCounts.ipos} 新股 / ${remoteCounts.subscriptions} 申购 / ${remoteCounts.allotments} 中签 / ${remoteCounts.sales} 卖出`,
      })

      const hashMatched = hashAppData(localData) === hashAppData(remoteData)
      let detail = `本地：${localCounts.ipos} 新股 / ${localCounts.subscriptions} 申购 / ${localCounts.allotments} 中签 / ${localCounts.sales} 卖出；云端：${remoteCounts.ipos} 新股 / ${remoteCounts.subscriptions} 申购 / ${remoteCounts.allotments} 中签 / ${remoteCounts.sales} 卖出。`
      if (hashMatched) {
        detail += ' 本地与云端一致。'
      } else if (localCounts.subscriptions > remoteCounts.subscriptions) {
        detail += ' 本地申购更多，请在电脑端点击“上传本机数据”。'
      } else if (localCounts.subscriptions < remoteCounts.subscriptions) {
        detail += ' 云端申购更多，请点击“强制使用云端数据”。'
      } else {
        detail += ' 数量相同但内容不同，请核对后选择上传本机或使用云端。'
      }
      updateDiagnostic({
        name: '本地/云端一致性',
        status: 'success',
        detail,
      }, { completedAt: new Date().toISOString() })
      setStatus('synced')
      setMessage('同步诊断完成，未修改云端数据')
    } catch (error) {
      handleSyncError(error)
      if (!steps.some((step) => step.status === 'failed')) {
        updateDiagnostic(
          {
            name: '同步诊断异常',
            status: 'failed',
            detail: error instanceof Error ? error.message : '未知错误',
          },
          {
            completedAt: new Date().toISOString(),
            lostAt: '同步诊断异常',
          },
        )
      }
    }
  }, [handleSyncError, updateRemoteSummary, updateSession])

  return {
    configured,
    user: session?.user ?? null,
    status,
    message,
    lastSyncedAt,
    pendingChanges,
    conflict,
    diagnostic,
    uploadReport,
    remoteSummary,
    syncTimes,
    sessionExpiresAt: session?.expiresAt ?? null,
    hasRefreshToken: Boolean(session?.refreshToken),
    signIn,
    signUp,
    signOut,
    syncNow,
    refreshRemoteSummaryNow,
    uploadNow,
    pullRemoteNow,
    resolveConflict,
    runDiagnostic,
  }
}

function countAppData(data: AppData) {
  return {
    accounts: data.accounts.length,
    ipos: data.ipos.length,
    subscriptions: data.subscriptions.length,
    allotments: data.subscriptions.filter((item) => item.status === 'won')
      .length,
    sales: data.sales.length,
  }
}

function summarizeUploadData(data: unknown) {
  const record = data as Record<string, unknown>
  return {
    subscriptions: getArrayLength(record.subscriptions),
    applications: getArrayLength(record.applications),
    subscriptionRecords: getArrayLength(record.subscriptionRecords),
    ipos: getArrayLength(record.ipos),
    accounts: getArrayLength(record.accounts),
    sales: getArrayLength(record.sales),
    wins: Array.isArray(record.subscriptions)
      ? record.subscriptions.filter(
          (item) =>
            typeof item === 'object' &&
            item !== null &&
            (item as { status?: unknown }).status === 'won',
        ).length
      : null,
  }
}

function getArrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : null
}

function diffCounts(
  before: ReturnType<typeof countAppData>,
  after: ReturnType<typeof countAppData>,
) {
  return {
    accounts: after.accounts - before.accounts,
    ipos: after.ipos - before.ipos,
    subscriptions: after.subscriptions - before.subscriptions,
    allotments: after.allotments - before.allotments,
    sales: after.sales - before.sales,
  }
}

function formatCloudReadDebug(debug: {
  userId: string
  rowCount: number
  rows: { rowId: string; updatedAt: string }[]
  selectedRowId: string | null
  selectedUpdatedAt: string | null
}) {
  const rows = debug.rows
    .map((row, index) => `${index + 1}. ${row.rowId} @ ${row.updatedAt}`)
    .join('；')
  return `当前用户ID：${debug.userId}；查询到记录数量：${debug.rowCount}；每条记录：${rows || '无'}；最终采用记录ID：${debug.selectedRowId ?? '无'}；采用记录更新时间：${debug.selectedUpdatedAt ?? '无'}`
}
