export async function GET() {
  return Response.json({
    module: 'sync',
    status: 'reserved',
    syncEnabled: false,
  })
}
