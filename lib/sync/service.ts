import type {
  SyncLogStore,
  SyncProvider,
  SyncProviderResult,
  SyncRunSummary,
  SyncState,
  SyncTask,
} from './types'

const syncTasks: Array<{
  task: SyncTask
  run: (provider: SyncProvider, startedAt: Date) => Promise<SyncProviderResult>
}> = [
  {
    task: 'ipo',
    run: (provider, startedAt) =>
      provider.syncIPO({ provider: provider.name, task: 'ipo', startedAt }),
  },
  {
    task: 'hearing',
    run: (provider, startedAt) =>
      provider.syncHearing({ provider: provider.name, task: 'hearing', startedAt }),
  },
  {
    task: 'allotment',
    run: (provider, startedAt) =>
      provider.syncAllotment({ provider: provider.name, task: 'allotment', startedAt }),
  },
  {
    task: 'history',
    run: (provider, startedAt) =>
      provider.syncHistory({ provider: provider.name, task: 'history', startedAt }),
  },
]

export class SyncService {
  constructor(
    private readonly providers: SyncProvider[],
    private readonly logStore: SyncLogStore,
  ) {}

  async getState(): Promise<SyncState> {
    const logs = await this.logStore.latest(20)
    const latest = logs[0]

    return {
      status: latest?.status === 'running' ? 'running' : 'idle',
      lastSyncTime: latest?.endTime ?? latest?.startTime ?? null,
      added: latest?.added ?? 0,
      updated: latest?.updated ?? 0,
      failed: latest?.failed ?? 0,
      logs,
    }
  }

  async runAll(): Promise<SyncRunSummary[]> {
    const summaries: SyncRunSummary[] = []

    for (const provider of this.providers) {
      summaries.push(await this.runProvider(provider))
    }

    return summaries
  }

  private async runProvider(provider: SyncProvider): Promise<SyncRunSummary> {
    const startTime = new Date()
    const log = await this.logStore.create({
      provider: provider.name,
      status: 'running',
      startTime,
      added: 0,
      updated: 0,
      failed: 0,
      message: 'Sync started.',
    })

    try {
      const result = await this.logStore.transaction(async () => {
        const taskResults: SyncProviderResult[] = []

        for (const task of syncTasks) {
          taskResults.push(await task.run(provider, startTime))
        }

        return mergeResults(taskResults)
      })

      const endTime = new Date()
      await this.logStore.update(log.id, {
        status: result.failed > 0 ? 'failed' : 'success',
        endTime,
        added: result.added,
        updated: result.updated,
        failed: result.failed,
        message: result.message,
      })

      return {
        provider: provider.name,
        status: result.failed > 0 ? 'failed' : 'success',
        startTime,
        endTime,
        added: result.added,
        updated: result.updated,
        failed: result.failed,
        message: result.message,
      }
    } catch (error) {
      const endTime = new Date()
      const message = error instanceof Error ? error.message : 'Unknown sync error.'

      await this.logStore.update(log.id, {
        status: 'failed',
        endTime,
        added: 0,
        updated: 0,
        failed: 1,
        message,
      })

      return {
        provider: provider.name,
        status: 'failed',
        startTime,
        endTime,
        added: 0,
        updated: 0,
        failed: 1,
        message,
      }
    }
  }
}

function mergeResults(results: SyncProviderResult[]): SyncProviderResult {
  return results.reduce<SyncProviderResult>(
    (summary, result) => ({
      added: summary.added + result.added,
      updated: summary.updated + result.updated,
      failed: summary.failed + result.failed,
      message: [summary.message, result.message].filter(Boolean).join(' '),
    }),
    {
      added: 0,
      updated: 0,
      failed: 0,
      message: '',
    },
  )
}
