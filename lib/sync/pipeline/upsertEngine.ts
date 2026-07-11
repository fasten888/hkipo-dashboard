import type { DiffResult, UpsertResult } from './types.js'

export type IpoMasterStore = {
  transaction: <T>(operation: () => Promise<T>) => Promise<T>
  insertMany: (diff: DiffResult['inserts']) => Promise<number>
  updateMany: (diff: DiffResult['updates']) => Promise<number>
}

export function createUpsertEngine(store: IpoMasterStore) {
  return {
    async upsert(diff: DiffResult): Promise<UpsertResult> {
      return store.transaction(async () => {
        const added = await store.insertMany(diff.inserts)
        const updated = await store.updateMany(diff.updates)

        return {
          added,
          updated,
          skipped: diff.skips.length,
          deleted: 0,
          failed: 0,
          message: 'Pipeline upsert completed.',
        }
      })
    },
  }
}
