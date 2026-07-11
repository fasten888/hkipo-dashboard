import type {
  DiffResult,
  ExistingIpoSnapshot,
  IpoDiffItem,
  NormalizedIpoMasterRecord,
} from './types.js'

export function createDiffEngine() {
  return {
    diff(existing: ExistingIpoSnapshot[], incoming: NormalizedIpoMasterRecord[]): DiffResult {
      const existingByCode = new Map(existing.map((record) => [record.code, record]))
      const incomingCodes = new Set(incoming.map((record) => record.code))
      const inserts: IpoDiffItem[] = []
      const updates: IpoDiffItem[] = []
      const skips: IpoDiffItem[] = []
      const deletes: IpoDiffItem[] = []

      for (const record of incoming) {
        const current = existingByCode.get(record.code)

        if (!current) {
          inserts.push({
            operation: 'insert',
            record,
            changedFields: ['*'],
            reason: 'IPO does not exist in database.',
          })
          continue
        }

        const changedFields = getChangedFields(current, record)

        if (changedFields.length === 0) {
          skips.push({
            operation: 'skip',
            record,
            existing: current,
            changedFields: [],
            reason: 'No data changes detected.',
          })
          continue
        }

        updates.push({
          operation: 'update',
          record,
          existing: current,
          changedFields,
          reason: 'Provider data differs from database snapshot.',
        })
      }

      for (const current of existing) {
        if (!incomingCodes.has(current.code)) {
          deletes.push({
            operation: 'delete',
            record: {
              code: current.code,
              name: current.name,
              status: current.status,
              source: {
                provider: 'system',
                sourceType: 'diff',
                payloadHash: current.sourceHash ?? '',
                rawPayload: current,
                fetchedAt: new Date(),
              },
            },
            existing: current,
            changedFields: [],
            reason: 'Existing IPO not present in provider payload.',
          })
        }
      }

      return { inserts, updates, skips, deletes }
    },
  }
}

function getChangedFields(
  existing: ExistingIpoSnapshot,
  incoming: NormalizedIpoMasterRecord,
) {
  const changedFields: string[] = []

  if (existing.name !== incoming.name) changedFields.push('name')
  if (existing.status !== incoming.status) changedFields.push('status')

  return changedFields
}
