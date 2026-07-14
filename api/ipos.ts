import {
  createIpoRecord,
  deleteIpoRecord,
  getAppDataSnapshot,
  updateIpoRecord,
  type IpoInput,
} from '../lib/database/appDataRepository.js'
import { sendError } from './_utils.js'

type VercelRequest = {
  method?: string
  body?: unknown
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

  try {
    if (request.method === 'GET') {
      const data = await getAppDataSnapshot()
      response.status(200).json({ ok: true, ipos: data.ipos })
      return
    }

    if (request.method === 'POST') {
      const ipo = await createIpoRecord(getBody<IpoInput>(request))
      response.status(201).json({ ok: true, ipo })
      return
    }

    if (request.method === 'PUT' || request.method === 'PATCH') {
      const body = getBody<IpoInput & { id?: string }>(request)
      if (!body.id) throw new Error('IPO id is required.')
      const ipo = await updateIpoRecord(body.id, body)
      response.status(200).json({ ok: true, ipo })
      return
    }

    if (request.method === 'DELETE') {
      const id = getSingleQueryValue(request.query?.id)
      if (!id) throw new Error('IPO id is required.')
      await deleteIpoRecord(id)
      response.status(200).json({ ok: true })
      return
    }

    response.status(405).json({ ok: false, message: 'Method not allowed.' })
  } catch (error) {
    sendError(response, error)
  }
}

function getBody<T>(request: VercelRequest): T {
  if (typeof request.body === 'string') return JSON.parse(request.body) as T
  return (request.body ?? {}) as T
}

function getSingleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
