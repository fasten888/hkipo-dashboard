export async function GET() {
  return Response.json({
    module: 'account',
    status: 'v2-route-placeholder',
    source: 'database',
  })
}
