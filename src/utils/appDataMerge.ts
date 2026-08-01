import type { AppData } from '../types/store'

type TimestampedRecord = {
  id: string
  createdAt?: string
  updatedAt?: string
}

function timestamp(record: Pick<TimestampedRecord, 'createdAt' | 'updatedAt'>) {
  const value = Date.parse(record.updatedAt ?? record.createdAt ?? '')
  return Number.isFinite(value) ? value : 0
}

function mergeRecords<T extends TimestampedRecord>(local: T[], remote: T[]) {
  const records = new Map<string, T>()

  for (const record of [...local, ...remote]) {
    const current = records.get(record.id)
    if (!current || timestamp(record) > timestamp(current)) {
      records.set(record.id, record)
    }
  }

  return [...records.values()].sort((left, right) => timestamp(right) - timestamp(left))
}

export function latestAppDataTimestamp(data: AppData) {
  const collections = [
    data.accounts,
    data.ipos,
    data.subscriptions,
    data.sales,
    data.withdrawals,
    data.exchangeRecords,
    data.holdings,
  ] as TimestampedRecord[][]

  return Math.max(
    0,
    ...collections.flatMap((records) => records.map(timestamp)),
    timestamp(data.fxRates),
  )
}

/** Keeps local-only records and resolves matching IDs with the newest updatedAt. */
export function mergeAppData(local: AppData, remote: AppData): AppData {
  const localFxTimestamp = timestamp(local.fxRates)
  const remoteFxTimestamp = timestamp(remote.fxRates)

  return {
    version: 3,
    accounts: mergeRecords(local.accounts, remote.accounts),
    ipos: mergeRecords(local.ipos, remote.ipos),
    subscriptions: mergeRecords(local.subscriptions, remote.subscriptions),
    sales: mergeRecords(local.sales, remote.sales),
    withdrawals: mergeRecords(local.withdrawals, remote.withdrawals),
    exchangeRecords: mergeRecords(local.exchangeRecords, remote.exchangeRecords),
    holdings: mergeRecords(local.holdings, remote.holdings),
    fxRates: remoteFxTimestamp > localFxTimestamp ? remote.fxRates : local.fxRates,
  }
}

export function appDataCounts(data: AppData) {
  return {
    accounts: data.accounts.length,
    ipos: data.ipos.length,
    subscriptions: data.subscriptions.length,
    sales: data.sales.length,
  }
}
