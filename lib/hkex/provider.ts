import { prisma } from '../database/prisma'
import { ProviderRuntime } from '../providers/core'
import {
  hkexOfficialProvider,
  type HkexOfficialDocument,
  type HkexOfficialIpoRecord,
} from '../providers/hkex'
import type { SyncProvider, SyncProviderResult } from '../sync'

const skippedResult = (task: string): SyncProviderResult => ({
  added: 0,
  updated: 0,
  failed: 0,
  message: `${task} skipped in HKEX Official Provider V1.`,
})

export const hkexSyncProvider: SyncProvider = {
  name: 'hkex',

  async syncIPO() {
    const runtime = new ProviderRuntime({
      providers: [hkexOfficialProvider],
      parallel: false,
      retryAttempts: 3,
      timeoutMs: 30_000,
    })

    const result = await runtime.runOne<HkexOfficialIpoRecord>(hkexOfficialProvider.id)

    if (result.status !== 'success') {
      return {
        added: 0,
        updated: 0,
        failed: result.failed || 1,
        message: result.message ?? 'HKEX official sync failed.',
      }
    }

    const writeResult = await upsertOfficialIpos(result.records)

    return {
      added: writeResult.added,
      updated: writeResult.updated,
      failed: writeResult.failed,
      message: [
        `HKEX official IPO sync completed.`,
        `Fetched ${result.records.length} records.`,
        `Added ${writeResult.added}.`,
        `Updated ${writeResult.updated}.`,
        `Failed ${writeResult.failed}.`,
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

async function upsertOfficialIpos(records: HkexOfficialIpoRecord[]) {
  let added = 0
  let updated = 0
  let failed = 0

  for (const record of records) {
    try {
      const existing = await prisma.ipo.findUnique({
        where: { code: record.code },
        include: { events: true },
      })
      const data = toIpoWriteData(record)

      if (!existing) {
        const created = await prisma.ipo.create({ data })
        await insertMissingEvents(created.id, [], record.documents)
        added += 1
        continue
      }

      const changed = hasIpoChanged(existing, data)
      const eventCount = await insertMissingEvents(existing.id, existing.events, record.documents)

      if (changed) {
        await prisma.ipo.update({
          where: { code: record.code },
          data,
        })
      }

      if (changed || eventCount > 0) {
        updated += 1
      }
    } catch {
      failed += 1
    }
  }

  return { added, updated, failed }
}

function toIpoWriteData(record: HkexOfficialIpoRecord) {
  return {
    code: record.code,
    name: record.name,
    status: record.status,
    board: record.board,
    industry: record.industry,
    offerPriceMin: record.offerPriceMin,
    offerPriceMax: record.offerPriceMax,
    lotSize: record.lotSize,
    lotAmount: record.lotAmount,
    marginMultiple: record.marginMultiple,
    subscribeStart: toDate(record.subscribeStart),
    subscribeEnd: toDate(record.subscribeEnd),
    listingDate: toDate(record.listingDate),
  }
}

async function insertMissingEvents(
  ipoId: string,
  existingEvents: Array<{
    type: string
    title: string
    eventDate: Date
    pdfUrl: string | null
  }>,
  documents: HkexOfficialDocument[],
) {
  const existingKeys = new Set(existingEvents.map(toExistingEventKey))
  let inserted = 0

  for (const document of documents) {
    const eventDate = toDate(document.eventDate)
    if (!eventDate) {
      continue
    }

    const key = toDocumentEventKey(document, eventDate)
    if (existingKeys.has(key)) {
      continue
    }

    await prisma.ipoEvent.create({
      data: {
        ipoId,
        type: document.type,
        title: document.title,
        eventDate,
        pdfUrl: document.pdfUrl,
      },
    })
    existingKeys.add(key)
    inserted += 1
  }

  return inserted
}

function hasIpoChanged(
  existing: {
    name: string
    status: string
    board: string | null
    industry: string | null
    offerPriceMin: number | null
    offerPriceMax: number | null
    lotSize: number | null
    lotAmount: number | null
    marginMultiple: number | null
    subscribeStart: Date | null
    subscribeEnd: Date | null
    listingDate: Date | null
  },
  next: ReturnType<typeof toIpoWriteData>,
) {
  return (
    existing.name !== next.name ||
    existing.status !== next.status ||
    normalizeNullable(existing.board) !== normalizeNullable(next.board) ||
    normalizeNullable(existing.industry) !== normalizeNullable(next.industry) ||
    normalizeNullableNumber(existing.offerPriceMin) !== normalizeNullableNumber(next.offerPriceMin) ||
    normalizeNullableNumber(existing.offerPriceMax) !== normalizeNullableNumber(next.offerPriceMax) ||
    normalizeNullableNumber(existing.lotSize) !== normalizeNullableNumber(next.lotSize) ||
    normalizeNullableNumber(existing.lotAmount) !== normalizeNullableNumber(next.lotAmount) ||
    normalizeNullableNumber(existing.marginMultiple) !==
      normalizeNullableNumber(next.marginMultiple) ||
    normalizeDate(existing.subscribeStart) !== normalizeDate(next.subscribeStart) ||
    normalizeDate(existing.subscribeEnd) !== normalizeDate(next.subscribeEnd) ||
    normalizeDate(existing.listingDate) !== normalizeDate(next.listingDate)
  )
}

function toExistingEventKey(event: {
  type: string
  title: string
  eventDate: Date
  pdfUrl: string | null
}) {
  return [event.type, event.title, event.eventDate.toISOString().slice(0, 10), event.pdfUrl ?? ''].join(
    '|',
  )
}

function toDocumentEventKey(document: HkexOfficialDocument, eventDate: Date) {
  return [document.type, document.title, eventDate.toISOString().slice(0, 10), document.pdfUrl ?? ''].join(
    '|',
  )
}

function toDate(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : undefined
}

function normalizeNullable(value: string | null | undefined) {
  return value ?? null
}

function normalizeNullableNumber(value: number | null | undefined) {
  return value ?? null
}

function normalizeDate(value: Date | null | undefined) {
  return value?.toISOString().slice(0, 10) ?? null
}
