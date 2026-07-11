import { prisma } from '../lib/database/prisma.js'

type VercelRequest = {
  method?: string
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
  end: () => void
}

const providerNames = ['HKEX', 'AAStocks', 'Futu', 'Tiger'] as const

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  if (request.method !== 'GET') {
    response.status(405).json({ ok: false, message: 'Method not allowed.' })
    return
  }

  try {
    const [logs, accountCount, ipoCount, historyCount] = await Promise.all([
      prisma.syncLog.findMany({
        orderBy: { startTime: 'desc' },
        take: 20,
      }),
      prisma.account.count(),
      prisma.ipo.count(),
      prisma.accountIpo.count(),
    ])

    const providerStatus = providerNames.map((provider) => {
      const providerLogs = logs.filter(
        (log) => log.provider.toLowerCase() === provider.toLowerCase(),
      )
      const latest = providerLogs[0]
      const status = getProviderStatus(provider, latest)

      return {
        provider,
        status,
        lastSyncTime: latest?.endTime ?? latest?.startTime ?? null,
        added: latest?.added ?? 0,
        updated: latest?.updated ?? 0,
        failed: latest?.failed ?? 0,
        message: latest?.message ?? null,
      }
    })

    const latestLog = logs[0]

    response.status(200).json({
      ok: true,
      data: {
        ipoSync: {
          lastSyncTime: latestLog?.endTime ?? latestLog?.startTime ?? null,
          dataSource: latestLog?.provider ?? 'None',
          added: latestLog?.added ?? 0,
          updated: latestLog?.updated ?? 0,
          failed: latestLog?.failed ?? 0,
          providerStatus: providerStatus[0]?.status ?? 'Disabled',
        },
        providerStatus,
        providerMetrics: providerStatus,
        syncLogs: logs.map((log) => ({
          id: log.id,
          provider: log.provider,
          status: log.status,
          startTime: log.startTime,
          endTime: log.endTime,
          durationMs: log.endTime
            ? log.endTime.getTime() - log.startTime.getTime()
            : null,
          added: log.added,
          updated: log.updated,
          failed: log.failed,
          message: log.message,
        })),
        accountCount,
        ipoCount,
        historyCount,
      },
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Data center request failed.',
    })
  }
}

function getProviderStatus(
  provider: (typeof providerNames)[number],
  latest: { status: string; endTime: Date | null; startTime: Date } | undefined,
) {
  if (provider !== 'HKEX') return 'Disabled'
  if (!latest) return 'Offline'
  if (latest.status === 'failed') return 'Degraded'
  if (latest.status === 'running') return 'Degraded'

  const lastTime = latest.endTime ?? latest.startTime
  const daysSinceSync = (Date.now() - lastTime.getTime()) / 86_400_000
  if (daysSinceSync > 7) return 'Offline'
  return 'Healthy'
}
