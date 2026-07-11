import { getDashboardCommandCenter } from '../lib/database/dashboardRepository.js'

type VercelRequest = {
  method?: string
  url?: string
  query?: Record<string, string | string[] | undefined>
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
  end: () => void
}

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
    const accountId = readQueryValue(request, 'accountId')
    const dashboard = await getDashboardCommandCenter(accountId)

    response.status(200).json({
      ok: true,
      dashboard,
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to load dashboard.',
    })
  }
}

function readQueryValue(request: VercelRequest, key: string) {
  const queryValue = request.query?.[key]

  if (Array.isArray(queryValue)) return queryValue[0]
  if (queryValue) return queryValue

  const url = new URL(request.url ?? '/', 'http://localhost')
  return url.searchParams.get(key) ?? undefined
}
