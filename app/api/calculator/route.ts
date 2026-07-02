export async function GET() {
  return Response.json({
    module: 'calculator',
    status: 'v2-route-placeholder',
    source: 'database',
  })
}
