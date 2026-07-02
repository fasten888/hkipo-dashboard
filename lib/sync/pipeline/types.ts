export type PipelineStage =
  | 'fetch'
  | 'parse'
  | 'normalize'
  | 'validate'
  | 'diff'
  | 'upsert'
  | 'log'

export type ProviderName = 'hkex' | 'futu' | 'yaocai' | 'phillip' | 'bright-smart' | string

export type ProviderRawRecord = {
  provider: ProviderName
  sourceType: string
  externalId?: string
  sourceUrl?: string
  pdfUrl?: string
  payload: unknown
  fetchedAt: Date
}

export type ParsedProviderRecord = {
  provider: ProviderName
  sourceType: string
  externalId?: string
  sourceUrl?: string
  pdfUrl?: string
  data: Record<string, unknown>
  fetchedAt: Date
}

export type NormalizedIpoMasterRecord = {
  code: string
  name: string
  nameEn?: string
  status: string
  board?: string
  industry?: string
  sector?: string
  issuer?: string
  sponsor?: string
  subscription?: {
    offerPriceMin?: number
    offerPriceMax?: number
    finalOfferPrice?: number
    lotSize?: number
    lotAmount?: number
    currency?: string
  }
  timeline?: Array<{
    type: string
    title: string
    eventAt: Date
    timezone?: string
    isConfirmed?: boolean
  }>
  margin?: Array<{
    broker: string
    currency?: string
    marginMultiple?: number
    cashRequiredRate?: number
    annualRate?: number
    handlingFee?: number
  }>
  performance?: {
    finalOfferPrice?: number
    darkOpenPrice?: number
    darkClosePrice?: number
    listingOpenPrice?: number
    listingClosePrice?: number
  }
  source: {
    provider: ProviderName
    sourceType: string
    externalId?: string
    sourceUrl?: string
    pdfUrl?: string
    payloadHash: string
    rawPayload: unknown
    fetchedAt: Date
  }
}

export type ValidationIssue = {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export type ValidationResult<T> = {
  valid: T[]
  invalid: Array<{
    record: T
    issues: ValidationIssue[]
  }>
}

export type ExistingIpoSnapshot = {
  id: string
  code: string
  name: string
  status: string
  sourceHash?: string
  updatedAt?: Date
}

export type DiffOperation = 'insert' | 'update' | 'skip' | 'delete'

export type IpoDiffItem = {
  operation: DiffOperation
  record: NormalizedIpoMasterRecord
  existing?: ExistingIpoSnapshot
  changedFields: string[]
  reason: string
}

export type DiffResult = {
  inserts: IpoDiffItem[]
  updates: IpoDiffItem[]
  skips: IpoDiffItem[]
  deletes: IpoDiffItem[]
}

export type UpsertResult = {
  added: number
  updated: number
  skipped: number
  deleted: number
  failed: number
  message: string
}

export type PipelineRunResult = UpsertResult & {
  provider: ProviderName
  startedAt: Date
  endedAt: Date
}

export type Fetcher = {
  fetch: () => Promise<ProviderRawRecord[]>
}

export type Parser = {
  parse: (records: ProviderRawRecord[]) => Promise<ParsedProviderRecord[]>
}

export type Normalizer = {
  normalize: (records: ParsedProviderRecord[]) => Promise<NormalizedIpoMasterRecord[]>
}

export type Validator<T> = {
  validate: (records: T[]) => ValidationResult<T>
}

export type DiffEngine = {
  diff: (
    existing: ExistingIpoSnapshot[],
    incoming: NormalizedIpoMasterRecord[],
  ) => DiffResult
}

export type UpsertEngine = {
  upsert: (diff: DiffResult) => Promise<UpsertResult>
}

export type PipelineLogStore = {
  write: (result: PipelineRunResult) => Promise<void>
}
