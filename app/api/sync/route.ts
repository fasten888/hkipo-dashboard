import { createSyncService } from '../../../lib/sync/createSyncService'

export async function GET() {
  const syncService = createSyncService()
  const state = await syncService.getState()

  return Response.json(state)
}

export async function POST() {
  const syncService = createSyncService()
  const result = await syncService.runAll()

  return Response.json({
    ok: result.every((item) => item.status === 'success'),
    result,
  })
}
