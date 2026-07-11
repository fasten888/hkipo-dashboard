import {
  createAccount,
  deleteAccount,
  getAccountManagementData,
  importAccountBalances,
  setAccountStatus,
  updateAccount,
  type AccountManagementInput,
  type AccountStatus,
  type ImportedAccountRow,
} from '../lib/database/accountRepository.js'

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
      const data = await getAccountManagementData()
      response.status(200).json({ ok: true, data })
      return
    }

    if (request.method === 'POST') {
      const body = getBody<{ action?: string; account?: AccountManagementInput; rows?: ImportedAccountRow[] }>(request)
      if (body.action === 'import') {
        const result = await importAccountBalances(body.rows ?? [])
        response.status(200).json({ ok: true, result })
        return
      }

      const account = await createAccount(body.account ?? (body as AccountManagementInput))
      response.status(201).json({ ok: true, account })
      return
    }

    if (request.method === 'PATCH') {
      const body = getBody<{ id?: string; action?: string; status?: AccountStatus; account?: AccountManagementInput }>(request)
      if (!body.id) throw new Error('Account id is required.')

      if (body.action === 'status') {
        const account = await setAccountStatus(body.id, body.status === 'disabled' ? 'disabled' : 'active')
        response.status(200).json({ ok: true, account })
        return
      }

      const account = await updateAccount(body.id, body.account ?? (body as AccountManagementInput))
      response.status(200).json({ ok: true, account })
      return
    }

    if (request.method === 'DELETE') {
      const id = getSingleQueryValue(request.query?.id)
      if (!id) throw new Error('Account id is required.')
      await deleteAccount(id)
      response.status(200).json({ ok: true })
      return
    }

    response.status(405).json({ ok: false, message: 'Method not allowed.' })
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Account request failed.',
    })
  }
}

function getBody<T>(request: VercelRequest): T {
  if (typeof request.body === 'string') return JSON.parse(request.body) as T
  return (request.body ?? {}) as T
}

function getSingleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
