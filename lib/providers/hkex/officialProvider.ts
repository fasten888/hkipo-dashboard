import type { Provider } from '../core/index.js'
import { PROVIDER_PRIORITY, type IPORecord, type ProviderFetchResult } from '../shared/index.js'

const HKEX_APP_BASE_URL = 'https://www1.hkexnews.hk/app/'
const HKEX_EDS_BASE_URL = 'https://www1.hkexnews.hk/ncms/json/eds/'

type HkexSourceConfig = {
  id: string
  board: string
  statusHint: string
  url: string
  maxRecords?: number
}

const HKEX_SOURCES: HkexSourceConfig[] = [
  {
    id: 'sehk-active-appphip',
    board: 'Main Board',
    statusHint: 'application',
    url: `${HKEX_EDS_BASE_URL}appactive_appphip_sehk_e.json`,
  },
  {
    id: 'gem-active-appphip',
    board: 'GEM',
    statusHint: 'application',
    url: `${HKEX_EDS_BASE_URL}appactive_appphip_gem_e.json`,
  },
  {
    id: 'sehk-listed',
    board: 'Main Board',
    statusHint: 'listed',
    url: `${HKEX_EDS_BASE_URL}applisted_sehk_e.json`,
    maxRecords: 80,
  },
]

type HkexDocumentRow = {
  d?: string
  nF?: string
  nS1?: string
  nS2?: string
  u1?: string
  u2?: string
}

type HkexApplicationRow = {
  id: number | string
  d?: string
  a?: string
  s?: string
  st?: string
  w?: string
  ls?: HkexDocumentRow[]
  ps?: HkexDocumentRow[]
  hasPhip?: boolean
  postingDate?: string
}

type HkexSourceJson = {
  genDate?: string
  uDate?: string
  app?: HkexApplicationRow[]
}

export type HkexOfficialPayload = {
  sources: Array<{
    sourceId: string
    board: string
    statusHint: string
    url: string
    genDate?: string
    uDate?: string
    app: HkexApplicationRow[]
    fetchedAt: string
  }>
  nextCursor: string
  unchanged: boolean
}

export type HkexParsedApplication = HkexApplicationRow & {
  board: string
  statusHint: string
  sourceId: string
  sourceUrl: string
  fetchedAt: string
}

export type HkexOfficialDocument = {
  type: string
  title: string
  eventDate: string
  pdfUrl?: string
}

export type HkexOfficialIpoRecord = IPORecord & {
  name: string
  status: string
  board: string
  documents: HkexOfficialDocument[]
}

export const hkexOfficialProvider: Provider<
  HkexOfficialPayload,
  HkexParsedApplication,
  HkexOfficialIpoRecord
> = {
  id: 'hkex-official-ipo',
  name: 'HKEX Official IPO',
  domain: 'ipo',
  tier: 'official',
  priority: PROVIDER_PRIORITY.official,
  enabled: true,
  version: '1.0.0',

  async fetch(context) {
    const fetchedAt = new Date()
    const sources = []

    for (const source of HKEX_SOURCES) {
      const json = await fetchHkexJson(source.url, context.signal)
      sources.push({
        sourceId: source.id,
        board: source.board,
        statusHint: source.statusHint,
        url: source.url,
        genDate: json.genDate,
        uDate: json.uDate,
        app: selectRows(json.app ?? [], source),
        fetchedAt: fetchedAt.toISOString(),
      })
    }

    const nextCursor = createCursor(sources)

    return {
      payload: {
        sources,
        nextCursor,
        unchanged: context.lastCursor === nextCursor && !context.force,
      },
      fetchedAt,
      sourceUrl: HKEX_EDS_BASE_URL,
      checksum: nextCursor,
    }
  },

  async parse(fetchResult: ProviderFetchResult<HkexOfficialPayload>) {
    if (fetchResult.payload.unchanged) {
      return {
        records: [],
        skipped: 1,
        nextCursor: fetchResult.payload.nextCursor,
        message: 'HKEX official data unchanged.',
      }
    }

    const records = fetchResult.payload.sources.flatMap((source) =>
      source.app.map((row) => ({
        ...row,
        board: source.board,
        statusHint: source.statusHint,
        sourceId: source.sourceId,
        sourceUrl: source.url,
        fetchedAt: source.fetchedAt,
      })),
    )

    return {
      records,
      nextCursor: fetchResult.payload.nextCursor,
      message: `Fetched ${records.length} HKEX official IPO records.`,
    }
  },

  async normalize(parsed) {
    const records = parsed.records
      .map(normalizeApplication)
      .filter((record): record is HkexOfficialIpoRecord => Boolean(record))

    return {
      records,
      skipped: Math.max(0, parsed.records.length - records.length),
      nextCursor: parsed.nextCursor,
      message: `Normalized ${records.length} HKEX official IPO records.`,
    }
  },
}

async function fetchHkexJson(url: string, signal?: AbortSignal): Promise<HkexSourceJson> {
  const response = await fetch(url, {
    signal,
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'HKIPO-OS/1.0 (+https://hkipo-dashboard.vercel.app)',
    },
  })

  if (!response.ok) {
    throw new Error(`HKEX official source failed: ${response.status} ${url}`)
  }

  return (await response.json()) as HkexSourceJson
}

function selectRows(rows: HkexApplicationRow[], source: HkexSourceConfig) {
  if (!source.maxRecords) {
    return rows
  }

  return [...rows]
    .sort((left, right) => readDateMs(right.d) - readDateMs(left.d))
    .slice(0, source.maxRecords)
}

function normalizeApplication(row: HkexParsedApplication): HkexOfficialIpoRecord | null {
  const name = cleanText(row.a)
  const externalId = String(row.id)

  if (!name || !externalId) {
    return null
  }

  const code = normalizeCode(row.st) ?? `APP-${externalId}`
  const status = normalizeStatus(row.s, row.statusHint)
  const listingDate = status === 'listed' ? normalizeHkexDate(row.d) : undefined

  return {
    externalId,
    sourceUrl: row.sourceUrl,
    fetchedAt: new Date(row.fetchedAt),
    code,
    name,
    status,
    board: row.board,
    listingDate,
    documents: collectDocuments(row),
  }
}

function collectDocuments(row: HkexParsedApplication): HkexOfficialDocument[] {
  const documents: HkexOfficialDocument[] = []
  const fallbackDate = normalizeHkexDate(row.d) ?? new Date().toISOString()

  if (row.w) {
    documents.push({
      type: 'warning',
      title: 'Warning statement',
      eventDate: fallbackDate,
      pdfUrl: toAbsoluteHkexAppUrl(row.w),
    })
  }

  for (const item of [...(row.ls ?? []), ...(row.ps ?? [])]) {
    const title = cleanText([item.nF, item.nS1, item.nS2].filter(Boolean).join(' - '))
    if (!title) {
      continue
    }

    documents.push({
      type: inferDocumentType(title),
      title,
      eventDate: normalizeHkexDate(item.d) ?? fallbackDate,
      pdfUrl: item.u1 ? toAbsoluteHkexAppUrl(item.u1) : undefined,
    })
  }

  return dedupeDocuments(documents)
}

function inferDocumentType(title: string) {
  const normalized = title.toLowerCase()
  if (normalized.includes('allotment')) {
    return 'allotment_result'
  }
  if (normalized.includes('prospectus')) {
    return 'prospectus'
  }
  if (normalized.includes('phip')) {
    return 'phip'
  }
  if (normalized.includes('application proof')) {
    return 'application_proof'
  }
  if (normalized.includes('announcement')) {
    return 'announcement'
  }
  return 'announcement'
}

function dedupeDocuments(documents: HkexOfficialDocument[]) {
  const seen = new Set<string>()

  return documents.filter((document) => {
    const key = [
      document.type,
      document.title,
      document.eventDate.slice(0, 10),
      document.pdfUrl ?? '',
    ].join('|')

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function normalizeStatus(status: string | undefined, statusHint: string) {
  const normalized = cleanText(status).toUpperCase()
  if (normalized === 'LT' || statusHint === 'listed') {
    return 'listed'
  }
  if (normalized === 'A') {
    return 'application'
  }
  if (normalized === 'L') {
    return 'listing'
  }
  return statusHint || 'application'
}

function normalizeCode(code: string | undefined) {
  const cleaned = cleanText(code).replace(/\D/g, '')
  if (!cleaned) {
    return undefined
  }
  return cleaned.padStart(5, '0')
}

function normalizeHkexDate(value: string | undefined) {
  const ms = readDateMs(value)
  if (!Number.isFinite(ms)) {
    return undefined
  }
  return new Date(ms).toISOString()
}

function readDateMs(value: string | undefined) {
  const cleaned = cleanText(value)
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  if (match) {
    const [, day, month, year] = match
    return Date.UTC(Number(year), Number(month) - 1, Number(day))
  }

  const ms = Date.parse(cleaned)
  return Number.isFinite(ms) ? ms : 0
}

function toAbsoluteHkexAppUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  return `${HKEX_APP_BASE_URL}${path.replace(/^\/+/, '')}`
}

function cleanText(value: string | number | undefined) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function createCursor(sources: HkexOfficialPayload['sources']) {
  return JSON.stringify(
    sources.map((source) => ({
      id: source.sourceId,
      genDate: source.genDate,
      uDate: source.uDate,
      count: source.app.length,
    })),
  )
}
