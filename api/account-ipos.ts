import {
  batchDeleteAccountIpoRecords,
  batchUpdateAccountIpoRecords,
  createAccountIpoRecord,
  deleteAccountIpoRecord,
  getAppDataSnapshot,
  updateAccountIpoRecord,
  type AccountIpoInput,
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
      response.status(200).json({ ok: true, accountIpos: data.subscriptions })
      return
    }

    if (request.method === 'POST') {
      const body = getBody<AccountIpoInput | { items?: AccountIpoInput[] }>(request)
      if ('items' in body && Array.isArray(body.items)) {
        const records = []
        for (const item of body.items) {
          records.push(await createAccountIpoRecord(item))
        }
        response.status(201).json({ ok: true, records })
        return
      }
      const record = await createAccountIpoRecord(body as AccountIpoInput)
      response.status(201).json({ ok: true, record })
      return
    }

    if (request.method === 'PUT' || request.method === 'PATCH') {
      const body = getBody<(AccountIpoInput & { id?: string }) | { ids?: string[]; changes?: Partial<AccountIpoInput> }>(request)
      if ('ids' in body && Array.isArray(body.ids)) {
        const result = await batchUpdateAccountIpoRecords(body.ids, body.changes ?? {})
        response.status(200).json({ ok: true, result })
        return
      }
      const recordBody = body as AccountIpoInput & { id?: string }
      if (!recordBody.id) throw new Error('Account IPO id is required.')
      const record = await updateAccountIpoRecord(recordBody.id, recordBody)
      response.status(200).json({ ok: true, record })
      return
    }

    if (request.method === 'DELETE') {
      const ids = getSingleQueryValue(request.query?.ids)
      if (ids) {
        const result = await batchDeleteAccountIpoRecords(ids.split(',').filter(Boolean))
        response.status(200).json({ ok: true, result })
        return
      }
      const id = getSingleQueryValue(request.query?.id)
      if (!id) throw new Error('Account IPO id is required.')
      await deleteAccountIpoRecord(id)
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
