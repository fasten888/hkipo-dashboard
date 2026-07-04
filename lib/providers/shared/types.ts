export type ProviderDomain =
  | 'ipo'
  | 'broker'
  | 'account'
  | 'history'
  | 'market'
  | 'news'
  | 'ai'

export type ProviderTier = 'official' | 'broker' | 'market' | 'community' | 'ai'

export type ProviderStatusCode = 'idle' | 'running' | 'success' | 'failed' | 'disabled'

export type ProviderDescriptor = {
  id: string
  name: string
  domain: ProviderDomain
  tier: ProviderTier
  priority: number
  enabled: boolean
  version: string
}

export type ProviderFetchResult<TPayload = unknown> = {
  payload: TPayload
  fetchedAt: Date
  sourceUrl?: string
  checksum?: string
}

export type ProviderResult<TRecord = unknown> = {
  records: TRecord[]
  added?: number
  updated?: number
  skipped?: number
  failed?: number
  lastCursor?: string
  nextCursor?: string
  warnings?: string[]
  message?: string
}

export type SyncContext = {
  runId: string
  startedAt: Date
  signal?: AbortSignal
  lastCursor?: string
  dryRun?: boolean
  force?: boolean
  providerIds?: string[]
  metadata?: Record<string, unknown>
}

export type SyncResult<TRecord = unknown> = {
  provider: ProviderDescriptor
  status: ProviderStatusCode
  startedAt: Date
  endedAt: Date
  durationMs: number
  records: TRecord[]
  added: number
  updated: number
  skipped: number
  failed: number
  attempts?: number
  lastCursor?: string
  nextCursor?: string
  message?: string
}

export type ProviderStatus = {
  providerId: string
  providerName: string
  status: ProviderStatusCode
  lastSync?: Date
  durationMs?: number
  success: number
  failed: number
  items: number
  version: string
  message?: string
}

export type ProviderMetrics = {
  providerId: string
  providerName: string
  domain: ProviderDomain
  tier: ProviderTier
  durationMs: number
  success: number
  added: number
  updated: number
  skipped: number
  failed: number
  attempts: number
  lastRunAt: Date
}

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'offline' | 'disabled' | 'unknown'

export type ProviderHealth = {
  providerId: string
  providerName: string
  domain: ProviderDomain
  status: ProviderHealthStatus
  lastSync?: Date
  durationMs?: number
  message?: string
}

export type FieldSource = {
  providerId: string
  providerName: string
  tier: ProviderTier
  priority: number
  sourceUrl?: string
  confidence?: number
  fetchedAt: Date
}

export type FieldSourceMap = Record<string, FieldSource>

export type ProviderRecordBase = {
  externalId?: string
  sourceUrl?: string
  fetchedAt?: Date
}

export type IPORecord = ProviderRecordBase & {
  code: string
  name?: string
  status?: string
  board?: string
  industry?: string
  sponsor?: string
  offerPriceMin?: number
  offerPriceMax?: number
  lotSize?: number
  lotAmount?: number
  marginMultiple?: number
  subscribeStart?: string
  subscribeEnd?: string
  listingDate?: string
  darkDate?: string
}

export type BrokerRecord = ProviderRecordBase & {
  name: string
  defaultMarginMultiple?: number
  defaultFee?: number
  defaultFinancingRate?: number
  supportedMarkets?: string[]
}

export type NewsRecord = ProviderRecordBase & {
  id: string
  title: string
  summary?: string
  url?: string
  publishedAt?: string
  relatedCodes?: string[]
}

export type MarketRecord = ProviderRecordBase & {
  code: string
  price?: number
  change?: number
  changePercent?: number
  turnover?: number
  updatedAt?: string
}

export type DataHealthMetric = {
  domain: ProviderDomain
  totalFields: number
  sourcedFields: number
  coveragePercent: number
  byTier: Partial<Record<ProviderTier, number>>
}

export type DataHealthReport = {
  generatedAt: Date
  metrics: DataHealthMetric[]
}

export const PROVIDER_PRIORITY = {
  official: 500,
  broker: 400,
  market: 300,
  community: 200,
  ai: 100,
} as const
