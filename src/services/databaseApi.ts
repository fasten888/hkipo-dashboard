import type { AccountInput } from '../types/account'
import type { IpoInput } from '../types/ipo'
import type { ExchangeRecordInput } from '../types/exchange'
import type { SaleInput } from '../types/sale'
import type { AppData } from '../types/store'
import type { SubscriptionInput } from '../types/subscription'
import type { WithdrawalInput } from '../types/withdrawal'

type ApiResponse<T> = { ok: true } & T

export async function loadDatabaseAppData() {
  const response = await request<ApiResponse<{ data: AppData }>>('/api/app-data')
  return response.data
}

export function createAccountInDatabase(input: AccountInput) {
  return request('/api/accounts', {
    method: 'POST',
    body: { account: input },
  })
}

export function updateAccountInDatabase(id: string, input: AccountInput) {
  return request('/api/accounts', {
    method: 'PUT',
    body: { id, account: input },
  })
}

export function deleteAccountInDatabase(id: string) {
  return request(`/api/accounts?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function createIpoInDatabase(input: IpoInput) {
  return request('/api/ipos', {
    method: 'POST',
    body: input,
  })
}

export function updateIpoInDatabase(id: string, input: IpoInput) {
  return request('/api/ipos', {
    method: 'PUT',
    body: { id, ...input },
  })
}

export function deleteIpoInDatabase(id: string) {
  return request(`/api/ipos?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function createSubscriptionsInDatabase(inputs: SubscriptionInput[]) {
  return request('/api/account-ipos', {
    method: 'POST',
    body: { items: inputs },
  })
}

export function updateSubscriptionInDatabase(id: string, input: SubscriptionInput) {
  return request('/api/account-ipos', {
    method: 'PUT',
    body: { id, ...input },
  })
}

export function deleteSubscriptionInDatabase(id: string) {
  return request(`/api/account-ipos?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function deleteSubscriptionsInDatabase(ids: string[]) {
  return request(`/api/account-ipos?ids=${encodeURIComponent(ids.join(','))}`, {
    method: 'DELETE',
  })
}

export function createSaleInDatabase(input: SaleInput) {
  return request('/api/sell-records', {
    method: 'POST',
    body: input,
  })
}

export function updateSaleInDatabase(id: string, input: SaleInput) {
  return request('/api/sell-records', {
    method: 'PUT',
    body: { id, ...input },
  })
}

export function deleteSaleInDatabase(id: string) {
  return request(`/api/sell-records?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function createWithdrawalInDatabase(input: WithdrawalInput) {
  return request('/api/withdrawals', {
    method: 'POST',
    body: input,
  })
}

export function updateWithdrawalInDatabase(id: string, input: WithdrawalInput) {
  return request('/api/withdrawals', {
    method: 'PUT',
    body: { id, ...input },
  })
}

export function deleteWithdrawalInDatabase(id: string) {
  return request(`/api/withdrawals?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function createExchangeRecordInDatabase(input: ExchangeRecordInput) {
  return request('/api/exchange-records', {
    method: 'POST',
    body: input,
  })
}

export function updateExchangeRecordInDatabase(id: string, input: ExchangeRecordInput) {
  return request('/api/exchange-records', {
    method: 'PUT',
    body: { id, ...input },
  })
}

export function deleteExchangeRecordInDatabase(id: string) {
  return request(`/api/exchange-records?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

async function request<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown } = {},
) {
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers:
      options.body === undefined
        ? undefined
        : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; message?: string }
    | null

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.message ?? `Request failed: ${response.status}`)
  }

  return payload as T
}
