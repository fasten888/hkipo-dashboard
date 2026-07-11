import { createSyncService } from '../lib/sync/createSyncService.js'

type VercelRequest = {
  method?: string
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

  const syncService = createSyncService()

  if (request.method === 'GET') {
    response.status(200).json(await syncService.getState())
    return
  }

  if (request.method === 'POST') {
    const result = await syncService.runAll()
    response.status(200).json({
      ok: result.every((item) => item.status === 'success'),
      result,
    })
    return
  }

  response.status(405).json({ ok: false, message: 'Method not allowed.' })
}
