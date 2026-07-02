import type { NormalizedIpoMasterRecord, ParsedProviderRecord } from './types'

export function createNormalizer() {
  return {
    async normalize(records: ParsedProviderRecord[]): Promise<NormalizedIpoMasterRecord[]> {
      return records.map(normalizeRecord)
    },
  }
}

function normalizeRecord(record: ParsedProviderRecord): NormalizedIpoMasterRecord {
  const code = readString(record.data, ['code', 'stockCode', 'ticker'])
  const name = readString(record.data, ['name', 'stockName', 'companyName'])
  const status = readString(record.data, ['status', 'ipoStatus']) || 'unknown'

  return {
    code,
    name,
    status,
    board: readOptionalString(record.data, ['board', 'market']),
    industry: readOptionalString(record.data, ['industry', 'sectorName']),
    sector: readOptionalString(record.data, ['sector']),
    issuer: readOptionalString(record.data, ['issuer']),
    sponsor: readOptionalString(record.data, ['sponsor']),
    subscription: {
      offerPriceMin: readOptionalNumber(record.data, ['offerPriceMin', 'priceMin']),
      offerPriceMax: readOptionalNumber(record.data, ['offerPriceMax', 'priceMax']),
      finalOfferPrice: readOptionalNumber(record.data, ['finalOfferPrice']),
      lotSize: readOptionalNumber(record.data, ['lotSize', 'boardLot']),
      lotAmount: readOptionalNumber(record.data, ['lotAmount']),
      currency: readOptionalString(record.data, ['currency']) || 'HKD',
    },
    source: {
      provider: record.provider,
      sourceType: record.sourceType,
      externalId: record.externalId,
      sourceUrl: record.sourceUrl,
      pdfUrl: record.pdfUrl,
      payloadHash: createPayloadHash(record.data),
      rawPayload: record.data,
      fetchedAt: record.fetchedAt,
    },
  }
}

function readString(data: Record<string, unknown>, keys: string[]) {
  return readOptionalString(data, keys) ?? ''
}

function readOptionalString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function readOptionalNumber(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value)
    }
  }

  return undefined
}

function createPayloadHash(data: Record<string, unknown>) {
  return JSON.stringify(data)
}
