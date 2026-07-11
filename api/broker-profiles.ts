import {
  deleteBrokerProfile,
  getAccountManagementData,
  saveBrokerProfile,
  type BrokerProfileInput,
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
      response.status(200).json({ ok: true, brokerProfiles: data.brokerProfiles })
      return
    }

    if (request.method === 'POST' || request.method === 'PATCH') {
      const profile = await saveBrokerProfile(getBody<BrokerProfileInput>(request))
      response.status(200).json({ ok: true, profile })
      return
    }

    if (request.method === 'DELETE') {
      const id = getSingleQueryValue(request.query?.id)
      if (!id) throw new Error('Broker profile id is required.')
      await deleteBrokerProfile(id)
      response.status(200).json({ ok: true })
      return
    }

    response.status(405).json({ ok: false, message: 'Method not allowed.' })
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Broker profile request failed.',
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
