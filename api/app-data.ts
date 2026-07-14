import { getAppDataSnapshot } from '../lib/database/appDataRepository.js'
import { sendError } from './_utils.js'

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

  if (request.method !== 'GET') {
    response.status(405).json({ ok: false, message: 'Method not allowed.' })
    return
  }

  try {
    const data = await getAppDataSnapshot()
    response.status(200).json({ ok: true, data })
  } catch (error) {
    sendError(response, error)
  }
}
