import type { ParsedProviderRecord, ProviderRawRecord } from '../sync/pipeline/index.js'

const AASTOCKS_UPCOMING_IPO_URL =
  'https://www.aastocks.com/en/stocks/market/ipo/upcomingipo.aspx'

export type CurrentIpoRow = {
  code: string
  name: string
  industry?: string
  offerPriceMin?: number
  offerPriceMax?: number
  lotSize?: number
  lotAmount?: number
  subscribeStart?: string
  subscribeEnd?: string
  listingDate?: string
  sourceUrl: string
}

export const hkexCurrentIpoFetcher = {
  async fetch(): Promise<ProviderRawRecord[]> {
    const response = await fetch(AASTOCKS_UPCOMING_IPO_URL, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      throw new Error(`IPO source returned HTTP ${response.status}.`)
    }

    return [
      {
        provider: 'hkex',
        sourceType: 'current-ipo-list',
        sourceUrl: AASTOCKS_UPCOMING_IPO_URL,
        payload: await response.text(),
        fetchedAt: new Date(),
      },
    ]
  },
}

export const hkexCurrentIpoParser = {
  async parse(records: ProviderRawRecord[]): Promise<ParsedProviderRecord[]> {
    const parsed: ParsedProviderRecord[] = []

    for (const record of records) {
      if (typeof record.payload !== 'string') {
        throw new Error('IPO source payload is not HTML.')
      }

      const rows = parseCurrentIpoRows(record.payload, record.sourceUrl ?? AASTOCKS_UPCOMING_IPO_URL)
      const firstRow = rows[0]

      if (!firstRow) {
        throw new Error('No current IPO rows were found in the source page.')
      }

      parsed.push({
        provider: record.provider,
        sourceType: record.sourceType,
        externalId: firstRow.code,
        sourceUrl: firstRow.sourceUrl,
        data: {
          code: firstRow.code,
          name: firstRow.name,
          status: 'subscribing',
          industry: firstRow.industry,
          offerPriceMin: firstRow.offerPriceMin,
          offerPriceMax: firstRow.offerPriceMax,
          lotSize: firstRow.lotSize,
          lotAmount: firstRow.lotAmount,
          subscribeStart: firstRow.subscribeStart,
          subscribeEnd: firstRow.subscribeEnd,
          listingDate: firstRow.listingDate,
          currency: 'HKD',
        },
        fetchedAt: record.fetchedAt,
      })
    }

    return parsed
  },
}

function parseCurrentIpoRows(html: string, sourceUrl: string): CurrentIpoRow[] {
  const tableHtml = extractUpcomingTable(html)
  const rowMatches = Array.from(tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))

  return rowMatches
    .map((rowMatch) => parseTableRow(rowMatch[1], sourceUrl))
    .filter((row): row is CurrentIpoRow => Boolean(row))
}

function extractUpcomingTable(html: string) {
  const tableStart = html.search(/<table[^>]+id=["']tblGMUpcoming["']/i)

  if (tableStart === -1) {
    throw new Error('Upcoming IPO table was not found in the source page.')
  }

  const tableEnd = html.indexOf('</table>', tableStart)

  if (tableEnd === -1) {
    throw new Error('Upcoming IPO table is incomplete.')
  }

  return html.slice(tableStart, tableEnd + '</table>'.length)
}

function parseTableRow(rowHtml: string, sourceUrl: string): CurrentIpoRow | null {
  const cells = Array.from(rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((match) =>
    cleanHtml(match[1]),
  )

  if (cells.length < 9) return null

  const nameAndCode = cells[1]
  const codeMatch = nameAndCode.match(/(\d{4,5})\.HK/i)
  const code = codeMatch?.[1]

  if (!code) return null

  const name = nameAndCode.replace(/\d{4,5}\.HK/i, '').trim()
  const [offerPriceMin, offerPriceMax] = parseOfferPriceRange(cells[3])

  return {
    code,
    name,
    industry: cells[2] || undefined,
    offerPriceMin,
    offerPriceMax,
    lotSize: parseNumber(cells[4]),
    lotAmount: parseNumber(cells[5]),
    subscribeEnd: normalizeDate(cells[6]),
    listingDate: normalizeDate(cells[8]),
    sourceUrl,
  }
}

function cleanHtml(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
}

function parseOfferPriceRange(value: string): [number | undefined, number | undefined] {
  if (!value || value.toUpperCase() === 'N/A') return [undefined, undefined]

  const parts = value.split('-').map(parseNumber)
  const min = parts[0]
  const max = parts[1] ?? parts[0]

  return [min, max]
}

function parseNumber(value: string | undefined) {
  if (!value) return undefined
  const normalized = value.replace(/,/g, '').trim()
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeDate(value: string | undefined) {
  if (!value) return undefined
  const match = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)

  if (!match) return undefined

  const [, year, month, day] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}
