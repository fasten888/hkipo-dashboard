import { prisma } from './prisma.js'
import { getIpoDisplayName } from './ipoDisplayName.js'
import { getTotalFee } from '../../src/utils/feeConsistency.js'

const activeStatuses = ['subscribing', 'open', 'active', 'bookbuilding']

export async function getDashboardCommandCenter(accountId?: string) {
  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10)
  const dayStart = new Date(`${todayKey}T00:00:00.000Z`)
  const dayEnd = new Date(`${todayKey}T23:59:59.999Z`)
  const accountWhere = accountId && accountId !== 'all' ? { id: accountId } : undefined
  const accountIpoWhere = accountId && accountId !== 'all' ? { accountId } : undefined

  const [
    accounts,
    ipos,
    todayEvents,
    accountIpos,
    activeIpos,
    recommendedIpos,
    recentSync,
  ] = await Promise.all([
    prisma.account.findMany({
      where: accountWhere,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.ipo.findMany({
      orderBy: [{ subscribeEnd: 'asc' }, { listingDate: 'asc' }, { updatedAt: 'desc' }],
      include: {
        analysis: true,
      },
    }),
    prisma.ipoEvent.findMany({
      where: {
        eventDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: { eventDate: 'asc' },
      include: {
        ipo: true,
      },
    }),
    prisma.accountIpo.findMany({
      where: accountIpoWhere,
      include: {
        account: true,
        ipo: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ipo.findMany({
      where: {
        OR: [
          { status: { in: activeStatuses } },
          {
            AND: [
              { subscribeStart: { lte: now } },
              { subscribeEnd: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [{ subscribeEnd: 'asc' }, { updatedAt: 'desc' }],
      include: {
        analysis: true,
      },
      take: 12,
    }),
    prisma.ipoAnalysis.findMany({
      where: {
        OR: [
          { rating: { not: null } },
          { recommendation: { not: null } },
          { note: { not: null } },
        ],
      },
      include: {
        ipo: true,
      },
      orderBy: {
        ipo: {
          updatedAt: 'desc',
        },
      },
      take: 8,
    }),
    prisma.syncLog.findFirst({
      orderBy: { startTime: 'desc' },
    }),
  ])

  const accountIds = new Set(accounts.map((account) => account.id))
  const scopedAccountIpos = accountId && accountId !== 'all'
    ? accountIpos.filter((record) => accountIds.has(record.accountId))
    : accountIpos
  const activeIpoIds = new Set(activeIpos.map((ipo) => ipo.id))
  const activeAccountIpos = scopedAccountIpos.filter((record) => activeIpoIds.has(record.ipoId))
  const availableCash = sum(accounts, (account) => account.cash)
  const frozenCash = sum(accounts, (account) => account.frozen)
  const margin = sum(accounts, (account) => account.availableMargin || account.marginLimit)
  const estimatedFees = sum(activeAccountIpos, getTotalFee)
  const activeLotAmount = sum(activeIpos, (ipo) => ipo.lotAmount ?? 0)
  const timelineActions = buildTodayActions(ipos, todayEvents, dayStart, dayEnd)
  const allotmentToday = timelineActions.filter((action) => action.type === 'allotment').length
  const listingToday = timelineActions.filter((action) => action.type === 'listing').length
  const closingToday = timelineActions.filter((action) => action.type === 'closing').length

  return {
    generatedAt: now.toISOString(),
    today: todayKey,
    todayActions: timelineActions,
    marketOverview: {
      ipoThisRound: activeIpos.length,
      closingToday,
      allotmentToday,
      listingToday,
      capitalConflict: activeLotAmount > availableCash + margin,
      capitalConflictAmount: Math.max(0, activeLotAmount - availableCash - margin),
    },
    capitalStatus: {
      accounts: accounts.length,
      availableCash,
      frozenCash,
      margin,
      estimatedFees,
    },
    activeIpos: activeIpos.map(toIpoCard),
    recommendedIpos: recommendedIpos.map((analysis) => ({
      ipo: toIpoCard(analysis.ipo),
      rating: analysis.rating,
      recommendation: analysis.recommendation,
      risk: analysis.risk,
      expectedDark: analysis.expectedDark,
      note: analysis.note,
    })),
    recentSync: recentSync
      ? {
          id: recentSync.id,
          provider: recentSync.provider,
          status: recentSync.status,
          lastSync: recentSync.endTime?.toISOString() ?? recentSync.startTime.toISOString(),
          added: recentSync.added,
          updated: recentSync.updated,
          failed: recentSync.failed,
          message: recentSync.message,
        }
      : null,
  }
}

type IpoWithAnalysis = {
  id: string
  code: string
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
  updatedAt: Date
  analysis?: unknown
}

type IpoEventWithIpo = {
  id: string
  type: string
  title: string
  eventDate: Date
  pdfUrl: string | null
  ipo: IpoWithAnalysis
}

type TodayActionType = 'closing' | 'allotment' | 'listing' | 'dark' | 'event'

function buildTodayActions(
  ipos: IpoWithAnalysis[],
  events: IpoEventWithIpo[],
  dayStart: Date,
  dayEnd: Date,
) {
  const actions = events.map((event) => ({
    id: event.id,
    type: normalizeEventType(event.type),
    title: event.title,
    eventTime: event.eventDate.toISOString(),
    source: 'ipo_event',
    ipo: toIpoCard(event.ipo),
  }))

  for (const ipo of ipos) {
    if (isWithinDay(ipo.subscribeEnd, dayStart, dayEnd)) {
      actions.push({
        id: `${ipo.id}:subscribe_end`,
        type: 'closing',
        title: '申购截止',
        eventTime: ipo.subscribeEnd.toISOString(),
        source: 'ipo.subscribe_end',
        ipo: toIpoCard(ipo),
      })
    }

    if (isWithinDay(ipo.listingDate, dayStart, dayEnd)) {
      actions.push({
        id: `${ipo.id}:listing_date`,
        type: 'listing',
        title: '正式上市',
        eventTime: ipo.listingDate.toISOString(),
        source: 'ipo.listing_date',
        ipo: toIpoCard(ipo),
      })
    }
  }

  return actions.sort((a, b) => a.eventTime.localeCompare(b.eventTime))
}

function normalizeEventType(type: string): TodayActionType {
  const value = type.toLowerCase()
  if (value.includes('close') || value.includes('subscription')) return 'closing'
  if (value.includes('allot') || value.includes('result')) return 'allotment'
  if (value.includes('list')) return 'listing'
  if (value.includes('dark') || value.includes('grey')) return 'dark'
  return 'event'
}

function isWithinDay(value: Date | null, dayStart: Date, dayEnd: Date) {
  if (!value) return false
  return value >= dayStart && value <= dayEnd
}

function toIpoCard(ipo: IpoWithAnalysis) {
  return {
    id: ipo.id,
    code: ipo.code,
    name: getIpoDisplayName(ipo),
    status: ipo.status,
    board: ipo.board,
    industry: ipo.industry,
    lotSize: ipo.lotSize,
    lotAmount: ipo.lotAmount,
    marginMultiple: ipo.marginMultiple,
    subscribeStart: ipo.subscribeStart?.toISOString() ?? null,
    subscribeEnd: ipo.subscribeEnd?.toISOString() ?? null,
    listingDate: ipo.listingDate?.toISOString() ?? null,
    updatedAt: ipo.updatedAt.toISOString(),
  }
}

function sum<T>(items: T[], picker: (item: T) => number) {
  return items.reduce((total, item) => total + picker(item), 0)
}
