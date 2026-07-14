import { prisma } from '../lib/database/prisma.js'
import { sendError } from './_utils.js'

type VercelRequest = {
  method?: string
  url?: string
  query?: Record<string, string | string[] | undefined>
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
  end: () => void
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  if (request.method !== 'GET') {
    response.status(405).json({ ok: false, message: 'Method not allowed.' })
    return
  }

  try {
    const code = readQueryValue(request, 'code')

    if (!code) {
      const ipos = await prisma.ipo.findMany({
        orderBy: [{ subscribeEnd: 'asc' }, { updatedAt: 'desc' }],
        take: 50,
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          industry: true,
          subscribeStart: true,
          subscribeEnd: true,
          listingDate: true,
          lotSize: true,
          lotAmount: true,
        },
      })

      response.status(200).json({ ok: true, ipos })
      return
    }

    const ipo = await prisma.ipo.findUnique({
      where: { code },
      include: {
        events: {
          orderBy: { eventDate: 'asc' },
        },
        analysis: true,
        accountIpos: {
          orderBy: { createdAt: 'desc' },
          include: {
            account: true,
          },
        },
      },
    })

    if (!ipo) {
      response.status(404).json({
        ok: false,
        message: `IPO ${code} was not found in database.`,
      })
      return
    }

    response.status(200).json({
      ok: true,
      ipo,
    })
  } catch (error) {
    sendError(response, error)
  }
}

function readQueryValue(request: VercelRequest, key: string) {
  const queryValue = request.query?.[key]

  if (Array.isArray(queryValue)) return queryValue[0]
  if (queryValue) return queryValue

  const url = new URL(request.url ?? '/', 'http://localhost')
  return url.searchParams.get(key) ?? undefined
}
