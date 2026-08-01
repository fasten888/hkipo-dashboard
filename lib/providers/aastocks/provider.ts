import type { Ipo, Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma.js'
import { containsChinese } from '../../database/ipoDisplayName.js'
import {
  aastocksCurrentIpoFetcher,
  aastocksCurrentIpoParser,
} from '../../hkex/currentIpo.js'
import { ProviderRuntime } from '../core/index.js'
import type { Provider } from '../core/index.js'
import type { IPORecord } from '../shared/index.js'
import type { ParsedProviderRecord, ProviderRawRecord } from '../../sync/pipeline/index.js'
import type { SyncProvider, SyncProviderResult } from '../../sync/index.js'

const skippedResult = (task: string): SyncProviderResult => ({
  added: 0,
  updated: 0,
  failed: 0,
  message: `${task} skipped in AAStocks Provider V1.`,
})

export const aastocksIpoProvider: Provider<
  ProviderRawRecord[],
  ParsedProviderRecord,
  IPORecord
> = {
  id: 'aastocks-current-ipo',
  name: 'AAStocks Current IPO',
  domain: 'ipo',
  tier: 'market',
  priority: 300,
  enabled: true,
  version: '1.0.0',

  async fetch() {
    return {
      payload: await aastocksCurrentIpoFetcher.fetch(),
      fetchedAt: new Date(),
      sourceUrl: 'https://www.aastocks.com/tc/stocks/market/ipo/upcomingipo.aspx',
    }
  },

  async parse(payload) {
    const records = await aastocksCurrentIpoParser.parse(payload.payload)
    return { records, message: `Parsed ${records.length} current IPO records.` }
  },

  async normalize(parsed) {
    const records = parsed.records.map<IPORecord>((record) => ({
      code: String(record.data.code ?? ''),
      name: String(record.data.name ?? ''),
      status: String(record.data.status ?? 'subscribing'),
      industry: optionalString(record.data.industry),
      offerPriceMin: optionalNumber(record.data.offerPriceMin),
      offerPriceMax: optionalNumber(record.data.offerPriceMax),
      lotSize: optionalNumber(record.data.lotSize),
      lotAmount: optionalNumber(record.data.lotAmount),
      subscribeStart: optionalString(record.data.subscribeStart),
      subscribeEnd: optionalString(record.data.subscribeEnd),
      listingDate: optionalString(record.data.listingDate),
      externalId: record.externalId,
      sourceUrl: record.sourceUrl,
      fetchedAt: record.fetchedAt,
    }))

    return { records, message: `Normalized ${records.length} current IPO records.` }
  },
}

export const aastocksSyncProvider: SyncProvider = {
  name: 'aastocks',

  async syncIPO() {
    const runtime = new ProviderRuntime({
      providers: [aastocksIpoProvider],
      parallel: false,
      retryAttempts: 3,
      timeoutMs: 30_000,
    })
    const result = await runtime.runOne<IPORecord>(aastocksIpoProvider.id)

    if (result.status !== 'success') {
      return {
        added: 0,
        updated: 0,
        failed: result.failed || 1,
        message: result.message ?? 'AAStocks current IPO sync failed.',
      }
    }

    const writeResult = await upsertCurrentIpos(result.records)
    const latest = result.records.at(0)

    return {
      added: writeResult.added,
      updated: writeResult.updated,
      failed: 0,
      message: [
        `AAStocks sync completed.`,
        `Fetched ${result.records.length}.`,
        `Added ${writeResult.added}.`,
        `Updated ${writeResult.updated}.`,
        `Skipped ${writeResult.skipped}.`,
        latest ? `Latest IPO: ${latest.name ?? latest.code} (${latest.code}).` : 'No upcoming IPO today.',
      ].join(' '),
    }
  },

  async syncHearing() {
    return skippedResult('Hearing sync')
  },

  async syncAllotment() {
    return skippedResult('Allotment sync')
  },

  async syncHistory() {
    return skippedResult('History sync')
  },
}

async function upsertCurrentIpos(records: IPORecord[]) {
  return prisma.$transaction(async (transaction) => {
    let added = 0
    let updated = 0
    let skipped = 0

    for (const record of records) {
      if (!record.code || !record.name) {
        throw new Error('AAStocks returned an IPO without code or name.')
      }

      const existing = await transaction.ipo.findUnique({ where: { code: record.code } })

      if (!existing) {
        await transaction.ipo.create({ data: createIpoData(record) })
        added += 1
        continue
      }

      const data = createIpoUpdate(record, existing)
      if (Object.keys(data).length === 0) {
        skipped += 1
        continue
      }

      await transaction.ipo.update({ where: { code: record.code }, data })
      updated += 1
    }

    return { added, updated, skipped }
  })
}

function createIpoData(record: IPORecord): Prisma.IpoCreateInput {
  const chineseName = containsChinese(record.name ?? '') ? record.name : undefined
  return {
    code: record.code,
    name: record.name ?? record.code,
    displayNameCn: chineseName,
    displayNameEn: chineseName ? undefined : record.name,
    status: record.status ?? 'subscribing',
    industry: record.industry,
    offerPriceMin: record.offerPriceMin,
    offerPriceMax: record.offerPriceMax,
    lotSize: record.lotSize,
    lotAmount: record.lotAmount,
    subscribeStart: toDate(record.subscribeStart),
    subscribeEnd: toDate(record.subscribeEnd),
    listingDate: toDate(record.listingDate),
  }
}

function createIpoUpdate(record: IPORecord, existing: Ipo): Prisma.IpoUpdateInput {
  const data: Prisma.IpoUpdateInput = {}
  const incomingName = record.name?.trim()
  const existingHasChineseName = containsChinese(existing.displayNameCn ?? existing.name)

  if (incomingName && containsChinese(incomingName)) {
    setIfChanged(data, 'name', existing.name, incomingName)
    setIfChanged(data, 'displayNameCn', existing.displayNameCn, incomingName)
  } else if (incomingName && !existingHasChineseName) {
    setIfChanged(data, 'name', existing.name, incomingName)
    setIfChanged(data, 'displayNameEn', existing.displayNameEn, incomingName)
  }

  setIfChanged(data, 'status', existing.status, record.status)
  setIfChanged(data, 'industry', existing.industry, record.industry)
  setIfChanged(data, 'offerPriceMin', existing.offerPriceMin, record.offerPriceMin)
  setIfChanged(data, 'offerPriceMax', existing.offerPriceMax, record.offerPriceMax)
  setIfChanged(data, 'lotSize', existing.lotSize, record.lotSize)
  setIfChanged(data, 'lotAmount', existing.lotAmount, record.lotAmount)
  setDateIfChanged(data, 'subscribeStart', existing.subscribeStart, record.subscribeStart)
  setDateIfChanged(data, 'subscribeEnd', existing.subscribeEnd, record.subscribeEnd)
  setDateIfChanged(data, 'listingDate', existing.listingDate, record.listingDate)

  return data
}

function setIfChanged(
  data: Prisma.IpoUpdateInput,
  key: keyof Prisma.IpoUpdateInput,
  current: string | number | null,
  incoming: string | number | undefined,
) {
  if (incoming !== undefined && current !== incoming) {
    Object.assign(data, { [key]: incoming })
  }
}

function setDateIfChanged(
  data: Prisma.IpoUpdateInput,
  key: 'subscribeStart' | 'subscribeEnd' | 'listingDate',
  current: Date | null,
  incoming: string | undefined,
) {
  const date = toDate(incoming)
  if (date && current?.toISOString().slice(0, 10) !== date.toISOString().slice(0, 10)) {
    Object.assign(data, { [key]: date })
  }
}

function toDate(value: string | undefined) {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00+08:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function optionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
