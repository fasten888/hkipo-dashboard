import { prisma } from './prisma.js'

const activeStatuses = ['subscribing', 'open', 'active', 'bookbuilding']

export async function getPlannerContext() {
  const now = new Date()
  const inThirtyDays = new Date(now)
  inThirtyDays.setDate(inThirtyDays.getDate() + 30)

  const [accounts, activeIpos, timelineEvents] = await Promise.all([
    prisma.account.findMany({
      orderBy: [{ cash: 'desc' }, { createdAt: 'asc' }],
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
      orderBy: [{ subscribeEnd: 'asc' }, { listingDate: 'asc' }, { updatedAt: 'desc' }],
      include: {
        analysis: true,
      },
      take: 20,
    }),
    prisma.ipoEvent.findMany({
      where: {
        eventDate: {
          gte: now,
          lte: inThirtyDays,
        },
      },
      orderBy: { eventDate: 'asc' },
      include: {
        ipo: true,
      },
      take: 30,
    }),
  ])

  const availableCash = sum(accounts, (account) => account.cash)
  const frozenCash = sum(accounts, (account) => account.frozen)
  const margin = sum(accounts, (account) => account.availableMargin || account.marginLimit)
  const selectedIpoCost = sum(activeIpos, (ipo) => ipo.lotAmount ?? 0)
  const estimatedFees = activeIpos.length * Math.max(100, accounts.length > 0 ? accounts.length * 20 : 100)
  const totalRequired = selectedIpoCost + estimatedFees
  const fundingCapacity = availableCash + margin

  return {
    generatedAt: now.toISOString(),
    roundOverview: {
      ipoCount: activeIpos.length,
      accountCount: accounts.length,
      selectedIpoCost,
      estimatedFees,
      availableCash,
      frozenCash,
      margin,
      fundingCapacity,
      capitalGap: Math.max(0, totalRequired - fundingCapacity),
    },
    ipos: activeIpos.map(toPlannerIpo),
    accounts: accounts.map(toPlannerAccount),
    timeline: buildTimeline(activeIpos, timelineEvents),
    conflictAdvisor: {
      hasConflict: totalRequired > fundingCapacity,
      required: totalRequired,
      capacity: fundingCapacity,
      gap: Math.max(0, totalRequired - fundingCapacity),
      message:
        totalRequired > fundingCapacity
          ? '当前活跃 IPO 的一手资金加预估费用超过可用现金与融资额度。'
          : '当前资金容量可以覆盖活跃 IPO 的一手参与与预估费用。',
    },
  }
}

export async function generateDraftAllocation() {
  const context = await getPlannerContext()
  const sortedAccounts = [...context.accounts].sort(
    (a, b) => b.availableCapacity - a.availableCapacity,
  )

  const allocations = context.ipos.flatMap((ipo, ipoIndex) => {
    if (sortedAccounts.length === 0) return []

    const account = sortedAccounts[ipoIndex % sortedAccounts.length]
    const lotAmount = ipo.lotAmount ?? 0
    const fee = estimateFee(ipo, account)
    const useCash = account.cash >= lotAmount + fee

    return [{
      id: `${ipo.code}:${account.id}`,
      ipoCode: ipo.code,
      ipoName: ipo.name,
      accountId: account.id,
      accountName: account.name,
      broker: account.broker,
      applyLots: 1,
      applyAmount: lotAmount,
      estimatedFee: fee,
      fundingSource: useCash ? 'cash' : 'margin',
      confidence: 'draft',
      note: 'Draft Allocation：已读取真实数据库账户，下一 Sprint 会替换为正式分配算法。',
    }]
  })

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      selectedIpos: context.ipos.length,
      selectedAccounts: context.accounts.length,
      allocationCount: allocations.length,
      totalApplyAmount: sum(allocations, (item) => item.applyAmount),
      totalEstimatedFee: sum(allocations, (item) => item.estimatedFee),
    },
    allocations,
    warnings: context.conflictAdvisor.hasConflict
      ? [context.conflictAdvisor.message]
      : [],
  }
}

type PlannerIpoInput = {
  id: string
  code: string
  name: string
  status: string
  board: string | null
  industry: string | null
  lotSize: number | null
  lotAmount: number | null
  marginMultiple: number | null
  subscribeStart: Date | null
  subscribeEnd: Date | null
  listingDate: Date | null
  analysis?: {
    rating: string | null
    recommendation: string | null
    risk: string | null
  } | null
}

type PlannerAccountInput = {
  id: string
  name: string
  broker: string | null
  currency: string
  cash: number
  frozen: number
  marginLimit: number
  availableMargin: number
}

type PlannerEventInput = {
  id: string
  type: string
  title: string
  eventDate: Date
  ipo: PlannerIpoInput
}

function toPlannerIpo(ipo: PlannerIpoInput) {
  return {
    id: ipo.id,
    code: ipo.code,
    name: ipo.name,
    status: ipo.status,
    board: ipo.board,
    industry: ipo.industry,
    lotSize: ipo.lotSize,
    lotAmount: ipo.lotAmount,
    marginMultiple: ipo.marginMultiple,
    subscribeStart: ipo.subscribeStart?.toISOString() ?? null,
    subscribeEnd: ipo.subscribeEnd?.toISOString() ?? null,
    listingDate: ipo.listingDate?.toISOString() ?? null,
    analysis: ipo.analysis
      ? {
          rating: ipo.analysis.rating,
          recommendation: ipo.analysis.recommendation,
          risk: ipo.analysis.risk,
        }
      : null,
  }
}

function toPlannerAccount(account: PlannerAccountInput) {
  return {
    id: account.id,
    name: account.name,
    broker: account.broker,
    currency: account.currency,
    cash: account.cash,
    frozen: account.frozen,
    marginLimit: account.marginLimit,
    availableMargin: account.availableMargin,
    availableCapacity: account.cash + (account.availableMargin || account.marginLimit),
  }
}

function buildTimeline(ipos: PlannerIpoInput[], events: PlannerEventInput[]) {
  const timeline = events.map((event) => ({
    id: event.id,
    type: event.type,
    title: event.title,
    eventTime: event.eventDate.toISOString(),
    ipoCode: event.ipo.code,
    ipoName: event.ipo.name,
    source: 'ipo_event',
  }))

  for (const ipo of ipos) {
    if (ipo.subscribeEnd) {
      timeline.push({
        id: `${ipo.id}:subscribe_end`,
        type: 'subscription_close',
        title: '申购截止',
        eventTime: ipo.subscribeEnd.toISOString(),
        ipoCode: ipo.code,
        ipoName: ipo.name,
        source: 'ipo.subscribe_end',
      })
    }

    if (ipo.listingDate) {
      timeline.push({
        id: `${ipo.id}:listing_date`,
        type: 'listing',
        title: '上市日期',
        eventTime: ipo.listingDate.toISOString(),
        ipoCode: ipo.code,
        ipoName: ipo.name,
        source: 'ipo.listing_date',
      })
    }
  }

  return timeline.sort((a, b) => a.eventTime.localeCompare(b.eventTime)).slice(0, 20)
}

function estimateFee(ipo: { lotAmount: number | null }, account: { availableCapacity: number }) {
  const base = 100
  const fundingFee = account.availableCapacity > 0 && (ipo.lotAmount ?? 0) > account.availableCapacity
    ? 80
    : 0

  return base + fundingFee
}

function sum<T>(items: T[], picker: (item: T) => number) {
  return items.reduce((total, item) => total + picker(item), 0)
}
