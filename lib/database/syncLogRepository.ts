import { prisma } from './prisma.js'
import type {
  SyncLogCreateInput,
  SyncLogEntry,
  SyncLogStore,
  SyncLogUpdateInput,
} from '../sync/types.js'

function toSyncLogEntry(record: {
  id: string
  provider: string
  status: string
  startTime: Date
  endTime: Date | null
  added: number
  updated: number
  failed: number
  message: string | null
}): SyncLogEntry {
  return {
    id: record.id,
    provider: record.provider,
    status: record.status,
    startTime: record.startTime,
    endTime: record.endTime,
    added: record.added,
    updated: record.updated,
    failed: record.failed,
    message: record.message,
  }
}

export const syncLogRepository: SyncLogStore = {
  async create(input: SyncLogCreateInput) {
    const record = await prisma.syncLog.create({
      data: input,
    })

    return toSyncLogEntry(record)
  },

  async update(id: string, input: SyncLogUpdateInput) {
    const record = await prisma.syncLog.update({
      where: { id },
      data: input,
    })

    return toSyncLogEntry(record)
  },

  async latest(limit = 20) {
    const records = await prisma.syncLog.findMany({
      orderBy: { startTime: 'desc' },
      take: limit,
    })

    return records.map(toSyncLogEntry)
  },

  async transaction(operation) {
    return prisma.$transaction(operation)
  },
}
