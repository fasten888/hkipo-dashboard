import type { Provider } from './provider.js'
import type { ProviderStatus, SyncContext, SyncResult } from '../shared/index.js'

export class ProviderManager {
  private providers = new Map<string, Provider>()
  private statuses = new Map<string, ProviderStatus>()

  registerProvider(provider: Provider) {
    this.providers.set(provider.id, provider)
    this.statuses.set(provider.id, createInitialStatus(provider))
  }

  unregisterProvider(providerId: string) {
    this.providers.delete(providerId)
    this.statuses.delete(providerId)
  }

  enableProvider(providerId: string) {
    this.setProviderEnabled(providerId, true)
  }

  disableProvider(providerId: string) {
    this.setProviderEnabled(providerId, false)
  }

  listProviders() {
    return [...this.providers.values()].sort(sortProviders)
  }

  getStatus(providerId: string) {
    return this.statuses.get(providerId)
  }

  getStatuses() {
    return [...this.statuses.values()]
  }

  async runProvider<TRecord = unknown>(
    providerId: string,
    context: SyncContext,
  ): Promise<SyncResult<TRecord>> {
    const provider = this.providers.get(providerId)

    if (!provider) {
      throw new Error(`Provider not registered: ${providerId}`)
    }

    const startedAt = new Date()

    if (!provider.enabled) {
      const endedAt = new Date()
      const result: SyncResult<TRecord> = {
        provider,
        status: 'disabled',
        startedAt,
        endedAt,
        durationMs: endedAt.getTime() - startedAt.getTime(),
        records: [],
        added: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        message: 'Provider disabled',
      }
      this.statuses.set(provider.id, toStatus(result))
      return result
    }

    this.statuses.set(provider.id, {
      ...createInitialStatus(provider),
      status: 'running',
      lastSync: startedAt,
    })

    try {
      const payload = await provider.fetch(context)
      const parsed = await provider.parse(payload, context)
      const normalized = (await provider.normalize(parsed, context)) as {
        records: TRecord[]
        added?: number
        updated?: number
        skipped?: number
        failed?: number
        message?: string
      }
      const endedAt = new Date()
      const result: SyncResult<TRecord> = {
        provider,
        status: 'success',
        startedAt,
        endedAt,
        durationMs: endedAt.getTime() - startedAt.getTime(),
        records: normalized.records,
        added: normalized.added ?? 0,
        updated: normalized.updated ?? 0,
        skipped: normalized.skipped ?? 0,
        failed: normalized.failed ?? 0,
        message: normalized.message,
      }
      this.statuses.set(provider.id, toStatus(result))
      return result
    } catch (error) {
      const endedAt = new Date()
      const result: SyncResult<TRecord> = {
        provider,
        status: 'failed',
        startedAt,
        endedAt,
        durationMs: endedAt.getTime() - startedAt.getTime(),
        records: [],
        added: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        message: error instanceof Error ? error.message : 'Unknown provider error',
      }
      this.statuses.set(provider.id, toStatus(result))
      return result
    }
  }

  async runAll(context: SyncContext) {
    const providers = this.listProviders().filter((provider) => {
      if (!context.providerIds?.length) {
        return true
      }
      return context.providerIds.includes(provider.id)
    })

    const results: SyncResult[] = []
    for (const provider of providers) {
      results.push(await this.runProvider(provider.id, context))
    }
    return results
  }

  private setProviderEnabled(providerId: string, enabled: boolean) {
    const provider = this.providers.get(providerId)

    if (!provider) {
      throw new Error(`Provider not registered: ${providerId}`)
    }

    this.providers.set(providerId, { ...provider, enabled })
    this.statuses.set(providerId, {
      ...createInitialStatus({ ...provider, enabled }),
      status: enabled ? 'idle' : 'disabled',
    })
  }
}

export function sortProviders(a: Provider, b: Provider) {
  if (a.priority !== b.priority) {
    return b.priority - a.priority
  }
  return a.name.localeCompare(b.name)
}

function createInitialStatus(provider: Provider): ProviderStatus {
  return {
    providerId: provider.id,
    providerName: provider.name,
    status: provider.enabled ? 'idle' : 'disabled',
    success: 0,
    failed: 0,
    items: 0,
    version: provider.version,
  }
}

function toStatus(result: SyncResult): ProviderStatus {
  return {
    providerId: result.provider.id,
    providerName: result.provider.name,
    status: result.status,
    lastSync: result.endedAt,
    durationMs: result.durationMs,
    success: result.added + result.updated + result.skipped,
    failed: result.failed,
    items: result.records.length,
    version: result.provider.version,
    message: result.message,
  }
}
