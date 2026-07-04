import type { Provider } from './provider'
import { ProviderManager, sortProviders } from './manager'
import type {
  ProviderDomain,
  ProviderHealth,
  ProviderMetrics,
  ProviderResult,
  ProviderStatusCode,
  SyncContext,
  SyncResult,
} from '../shared'

export type ProviderCursorStore = {
  getLastCursor(providerId: string): string | undefined | Promise<string | undefined>
  setLastCursor(providerId: string, cursor: string): void | Promise<void>
}

export type ProviderRuntimeLogger = {
  info(message: string, metadata?: Record<string, unknown>): void
  warn(message: string, metadata?: Record<string, unknown>): void
  error(message: string, metadata?: Record<string, unknown>): void
}

export type ProviderRuntimeOptions = {
  providers?: Provider[]
  manager?: ProviderManager
  retryAttempts?: number
  timeoutMs?: number
  parallel?: boolean
  cursorStore?: ProviderCursorStore
  logger?: ProviderRuntimeLogger
}

export type ProviderRunOptions = Partial<
  Pick<SyncContext, 'dryRun' | 'force' | 'metadata' | 'providerIds'>
> & {
  runId?: string
  timeoutMs?: number
  retryAttempts?: number
  parallel?: boolean
}

export class MemoryProviderCursorStore implements ProviderCursorStore {
  private cursors = new Map<string, string>()

  getLastCursor(providerId: string) {
    return this.cursors.get(providerId)
  }

  setLastCursor(providerId: string, cursor: string) {
    this.cursors.set(providerId, cursor)
  }
}

export class ProviderRuntime {
  private manager: ProviderManager
  private metrics = new Map<string, ProviderMetrics>()
  private health = new Map<string, ProviderHealth>()
  private cursorStore: ProviderCursorStore
  private logger: ProviderRuntimeLogger
  private retryAttempts: number
  private timeoutMs: number
  private parallel: boolean

  constructor(options: ProviderRuntimeOptions = {}) {
    this.manager = options.manager ?? new ProviderManager()
    this.cursorStore = options.cursorStore ?? new MemoryProviderCursorStore()
    this.logger = options.logger ?? createSilentLogger()
    this.retryAttempts = options.retryAttempts ?? 3
    this.timeoutMs = options.timeoutMs ?? 30_000
    this.parallel = options.parallel ?? true

    for (const provider of options.providers ?? []) {
      this.registerProvider(provider)
    }
  }

  discoverProviders() {
    return this.manager.listProviders()
  }

  registerProvider(provider: Provider) {
    this.manager.registerProvider(provider)
    this.health.set(provider.id, {
      providerId: provider.id,
      providerName: provider.name,
      domain: provider.domain,
      status: provider.enabled ? 'unknown' : 'disabled',
    })
  }

  unregisterProvider(providerId: string) {
    this.manager.unregisterProvider(providerId)
    this.metrics.delete(providerId)
    this.health.delete(providerId)
  }

  enableProvider(providerId: string) {
    this.manager.enableProvider(providerId)
    const provider = this.requireProvider(providerId)
    this.health.set(providerId, {
      providerId,
      providerName: provider.name,
      domain: provider.domain,
      status: 'unknown',
    })
  }

  disableProvider(providerId: string) {
    this.manager.disableProvider(providerId)
    const provider = this.requireProvider(providerId)
    this.health.set(providerId, {
      providerId,
      providerName: provider.name,
      domain: provider.domain,
      status: 'disabled',
      message: 'Provider disabled',
    })
  }

  getMetrics() {
    return [...this.metrics.values()]
  }

  getHealth() {
    return [...this.health.values()]
  }

  async runOne<TRecord = unknown>(
    providerId: string,
    options: ProviderRunOptions = {},
  ): Promise<SyncResult<TRecord>> {
    const provider = this.requireProvider(providerId)
    return this.executeWithRetry<TRecord>(provider, options)
  }

  async runAll<TRecord = unknown>(
    domain?: ProviderDomain,
    options: ProviderRunOptions = {},
  ): Promise<Array<SyncResult<TRecord>>> {
    const providers = this.filterProviders(domain, options.providerIds)
    const shouldRunParallel = options.parallel ?? this.parallel

    if (shouldRunParallel) {
      return Promise.all(
        providers.map((provider) => this.executeWithRetry<TRecord>(provider, options)),
      )
    }

    const results: Array<SyncResult<TRecord>> = []
    for (const provider of providers) {
      results.push(await this.executeWithRetry<TRecord>(provider, options))
    }
    return results
  }

  async runByType<TRecord = unknown>(
    domain: ProviderDomain,
    options: ProviderRunOptions = {},
  ) {
    return this.runAll<TRecord>(domain, options)
  }

  private async executeWithRetry<TRecord>(
    provider: Provider,
    options: ProviderRunOptions,
  ): Promise<SyncResult<TRecord>> {
    const maxAttempts = Math.max(1, options.retryAttempts ?? this.retryAttempts)
    let lastResult: SyncResult<TRecord> | undefined

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const result = await this.executeAttempt<TRecord>(provider, options, attempt)
      lastResult = result

      if (result.status === 'success' || result.status === 'disabled') {
        break
      }

      this.logger.warn('Provider attempt failed', {
        providerId: provider.id,
        attempt,
        maxAttempts,
        message: result.message,
      })
    }

    return lastResult ?? this.createFailureResult(provider, 'Provider did not run', 0)
  }

  private async executeAttempt<TRecord>(
    provider: Provider,
    options: ProviderRunOptions,
    attempt: number,
  ): Promise<SyncResult<TRecord>> {
    const startedAt = new Date()

    if (!provider.enabled) {
      const result = this.createResult<TRecord>({
        provider,
        startedAt,
        status: 'disabled',
        attempts: attempt,
        message: 'Provider disabled',
      })
      this.recordOutcome(result)
      return result
    }

    const abortController = new AbortController()
    const timeoutMs = options.timeoutMs ?? this.timeoutMs
    const timeout = setTimeout(() => abortController.abort(), timeoutMs)

    try {
      const lastCursor = await this.cursorStore.getLastCursor(provider.id)
      const context: SyncContext = {
        runId: options.runId ?? createRunId(provider.id),
        startedAt,
        signal: abortController.signal,
        lastCursor,
        dryRun: options.dryRun,
        force: options.force,
        providerIds: options.providerIds,
        metadata: options.metadata,
      }

      this.logger.info('Provider run started', {
        providerId: provider.id,
        attempt,
        lastCursor,
      })

      const payload = await provider.fetch(context)
      this.throwIfAborted(abortController.signal, provider.id)
      const parsed = await provider.parse(payload, context)
      this.throwIfAborted(abortController.signal, provider.id)
      const normalized = (await provider.normalize(parsed, context)) as ProviderResult<TRecord>
      const result = this.createResult<TRecord>({
        provider,
        startedAt,
        status: 'success',
        records: normalized.records,
        added: normalized.added,
        updated: normalized.updated,
        skipped: normalized.skipped,
        failed: normalized.failed,
        attempts: attempt,
        lastCursor: normalized.lastCursor ?? lastCursor,
        nextCursor: normalized.nextCursor,
        message: normalized.message,
      })

      if (result.nextCursor) {
        await this.cursorStore.setLastCursor(provider.id, result.nextCursor)
      }

      this.recordOutcome(result)
      return result
    } catch (error) {
      const result = this.createFailureResult<TRecord>(
        provider,
        error instanceof Error ? error.message : 'Unknown provider runtime error',
        attempt,
        startedAt,
      )
      this.recordOutcome(result)
      return result
    } finally {
      clearTimeout(timeout)
    }
  }

  private filterProviders(domain?: ProviderDomain, providerIds?: string[]) {
    return this.discoverProviders()
      .filter((provider) => (domain ? provider.domain === domain : true))
      .filter((provider) => (providerIds?.length ? providerIds.includes(provider.id) : true))
      .sort(sortProviders)
  }

  private requireProvider(providerId: string) {
    const provider = this.discoverProviders().find((item) => item.id === providerId)
    if (!provider) {
      throw new Error(`Provider not registered: ${providerId}`)
    }
    return provider
  }

  private createFailureResult<TRecord>(
    provider: Provider,
    message: string,
    attempts: number,
    startedAt = new Date(),
  ): SyncResult<TRecord> {
    return this.createResult<TRecord>({
      provider,
      startedAt,
      status: 'failed',
      attempts,
      failed: 1,
      message,
    })
  }

  private createResult<TRecord>(input: {
    provider: Provider
    startedAt: Date
    status: ProviderStatusCode
    records?: TRecord[]
    added?: number
    updated?: number
    skipped?: number
    failed?: number
    attempts?: number
    lastCursor?: string
    nextCursor?: string
    message?: string
  }): SyncResult<TRecord> {
    const endedAt = new Date()
    return {
      provider: input.provider,
      status: input.status,
      startedAt: input.startedAt,
      endedAt,
      durationMs: endedAt.getTime() - input.startedAt.getTime(),
      records: input.records ?? [],
      added: input.added ?? 0,
      updated: input.updated ?? 0,
      skipped: input.skipped ?? 0,
      failed: input.failed ?? 0,
      attempts: input.attempts,
      lastCursor: input.lastCursor,
      nextCursor: input.nextCursor,
      message: input.message,
    }
  }

  private recordOutcome(result: SyncResult) {
    this.metrics.set(result.provider.id, {
      providerId: result.provider.id,
      providerName: result.provider.name,
      domain: result.provider.domain,
      tier: result.provider.tier,
      durationMs: result.durationMs,
      success: result.added + result.updated + result.skipped,
      added: result.added,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      attempts: result.attempts ?? 1,
      lastRunAt: result.endedAt,
    })

    this.health.set(result.provider.id, {
      providerId: result.provider.id,
      providerName: result.provider.name,
      domain: result.provider.domain,
      status: toHealthStatus(result),
      lastSync: result.endedAt,
      durationMs: result.durationMs,
      message: result.message,
    })
  }

  private throwIfAborted(signal: AbortSignal, providerId: string) {
    if (signal.aborted) {
      throw new Error(`Provider timed out: ${providerId}`)
    }
  }
}

function toHealthStatus(result: SyncResult): ProviderHealth['status'] {
  if (result.status === 'disabled') {
    return 'disabled'
  }
  if (result.status === 'success' && result.failed === 0) {
    return 'healthy'
  }
  if (result.status === 'success') {
    return 'degraded'
  }
  return 'offline'
}

function createRunId(providerId: string) {
  return `${providerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createSilentLogger(): ProviderRuntimeLogger {
  return {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  }
}
