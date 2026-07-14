import {
  deleteBrokerProfile,
  getAccountManagementData,
  saveBrokerProfile,
  type BrokerProfileInput,
} from '../lib/database/accountRepository.js'
import {
  createExchangeRecord,
  createSaleRecord,
  createWithdrawalRecord,
  deleteExchangeRecord,
  deleteSaleRecord,
  deleteWithdrawalRecord,
  updateExchangeRecord,
  updateSaleRecord,
  updateWithdrawalRecord,
  type ExchangeRecordInput,
  type SaleInput,
  type WithdrawalInput,
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

type ResourceName = 'broker-profiles' | 'sell-records' | 'withdrawals' | 'exchange-records'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  try {
    const resource = getSingleQueryValue(request.query?.resource) as ResourceName | undefined

    if (resource === 'broker-profiles') {
      await handleBrokerProfiles(request, response)
      return
    }

    if (resource === 'sell-records') {
      await handleSellRecords(request, response)
      return
    }

    if (resource === 'withdrawals') {
      await handleWithdrawals(request, response)
      return
    }

    if (resource === 'exchange-records') {
      await handleExchangeRecords(request, response)
      return
    }

    response.status(404).json({ ok: false, message: 'Resource not found.' })
  } catch (error) {
    sendError(response, error)
  }
}

async function handleBrokerProfiles(request: VercelRequest, response: VercelResponse) {
  if (request.method === 'GET') {
    const data = await getAccountManagementData()
    response.status(200).json({ ok: true, brokerProfiles: data.brokerProfiles })
    return
  }

  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
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
}

async function handleSellRecords(request: VercelRequest, response: VercelResponse) {
  if (request.method === 'POST') {
    const record = await createSaleRecord(getBody<SaleInput>(request))
    response.status(201).json({ ok: true, record })
    return
  }

  if (request.method === 'PUT' || request.method === 'PATCH') {
    const body = getBody<SaleInput & { id?: string }>(request)
    if (!body.id) throw new Error('Sale record id is required.')
    const record = await updateSaleRecord(body.id, body)
    response.status(200).json({ ok: true, record })
    return
  }

  if (request.method === 'DELETE') {
    const id = getSingleQueryValue(request.query?.id)
    if (!id) throw new Error('Sale record id is required.')
    await deleteSaleRecord(id)
    response.status(200).json({ ok: true })
    return
  }

  response.status(405).json({ ok: false, message: 'Method not allowed.' })
}

async function handleWithdrawals(request: VercelRequest, response: VercelResponse) {
  if (request.method === 'POST') {
    const record = await createWithdrawalRecord(getBody<WithdrawalInput>(request))
    response.status(201).json({ ok: true, record })
    return
  }

  if (request.method === 'PUT' || request.method === 'PATCH') {
    const body = getBody<WithdrawalInput & { id?: string }>(request)
    if (!body.id) throw new Error('Withdrawal id is required.')
    const record = await updateWithdrawalRecord(body.id, body)
    response.status(200).json({ ok: true, record })
    return
  }

  if (request.method === 'DELETE') {
    const id = getSingleQueryValue(request.query?.id)
    if (!id) throw new Error('Withdrawal id is required.')
    await deleteWithdrawalRecord(id)
    response.status(200).json({ ok: true })
    return
  }

  response.status(405).json({ ok: false, message: 'Method not allowed.' })
}

async function handleExchangeRecords(request: VercelRequest, response: VercelResponse) {
  if (request.method === 'POST') {
    const record = await createExchangeRecord(getBody<ExchangeRecordInput>(request))
    response.status(201).json({ ok: true, record })
    return
  }

  if (request.method === 'PUT' || request.method === 'PATCH') {
    const body = getBody<ExchangeRecordInput & { id?: string }>(request)
    if (!body.id) throw new Error('Exchange record id is required.')
    const record = await updateExchangeRecord(body.id, body)
    response.status(200).json({ ok: true, record })
    return
  }

  if (request.method === 'DELETE') {
    const id = getSingleQueryValue(request.query?.id)
    if (!id) throw new Error('Exchange record id is required.')
    await deleteExchangeRecord(id)
    response.status(200).json({ ok: true })
    return
  }

  response.status(405).json({ ok: false, message: 'Method not allowed.' })
}

function getBody<T>(request: VercelRequest): T {
  if (typeof request.body === 'string') return JSON.parse(request.body) as T
  return (request.body ?? {}) as T
}

function getSingleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
