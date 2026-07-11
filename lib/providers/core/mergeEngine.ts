import type { FieldSource, FieldSourceMap, ProviderDescriptor } from '../shared/index.js'

export type MergeableRecord = Record<string, unknown>

export type MergeInput<TRecord extends MergeableRecord> = {
  record: Partial<TRecord>
  provider: ProviderDescriptor
  fetchedAt?: Date
  sourceUrl?: string
}

export type MergedRecord<TRecord extends MergeableRecord> = {
  data: TRecord
  sources: FieldSourceMap
  updatedFields: string[]
  skippedFields: string[]
}

export function mergeRecord<TRecord extends MergeableRecord>(
  current: MergedRecord<TRecord> | undefined,
  incoming: MergeInput<TRecord>,
): MergedRecord<TRecord> {
  const data = { ...(current?.data ?? {}) } as TRecord
  const sources: FieldSourceMap = { ...(current?.sources ?? {}) }
  const updatedFields: string[] = []
  const skippedFields: string[] = []
  const nextSource = createFieldSource(incoming)

  for (const [field, incomingValue] of Object.entries(incoming.record)) {
    if (incomingValue === undefined || incomingValue === null || incomingValue === '') {
      skippedFields.push(field)
      continue
    }

    const currentSource = sources[field]
    const currentValue = data[field]

    if (!currentSource || shouldReplaceField(currentSource, nextSource, currentValue, incomingValue)) {
      data[field as keyof TRecord] = incomingValue as TRecord[keyof TRecord]
      sources[field] = nextSource
      updatedFields.push(field)
      continue
    }

    skippedFields.push(field)
  }

  return {
    data,
    sources,
    updatedFields,
    skippedFields,
  }
}

export function mergeRecordsByKey<TRecord extends MergeableRecord>(
  records: Array<MergeInput<TRecord>>,
  getKey: (record: Partial<TRecord>) => string,
) {
  const merged = new Map<string, MergedRecord<TRecord>>()

  for (const record of records) {
    const key = getKey(record.record)
    const current = merged.get(key)
    merged.set(key, mergeRecord(current, record))
  }

  return merged
}

export function createFieldSource(input: MergeInput<MergeableRecord>): FieldSource {
  return {
    providerId: input.provider.id,
    providerName: input.provider.name,
    tier: input.provider.tier,
    priority: input.provider.priority,
    sourceUrl: input.sourceUrl,
    fetchedAt: input.fetchedAt ?? new Date(),
  }
}

export function shouldReplaceField(
  currentSource: FieldSource,
  incomingSource: FieldSource,
  currentValue: unknown,
  incomingValue: unknown,
) {
  if (JSON.stringify(currentValue) === JSON.stringify(incomingValue)) {
    return false
  }

  if (incomingSource.priority !== currentSource.priority) {
    return incomingSource.priority > currentSource.priority
  }

  return incomingSource.fetchedAt.getTime() >= currentSource.fetchedAt.getTime()
}
