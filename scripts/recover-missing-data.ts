import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

type RecoveryAccount = {
  id: string
  name: string
  accountSuffix?: string
}

type RecoveryIpo = {
  id: string
  name: string
  stockCode?: string
  code?: string
  issuePrice?: number
  lotSize?: number
  subscriptionDate?: string
  listingDate?: string
  industry?: string
  createdAt?: string
  updatedAt?: string
}

type RecoverySubscription = {
  id: string
  accountId: string
  ipoId: string
  method?: string
  subscriptionMethod?: string
  subscriptionAmount?: number
  fee?: number
  subscriptionDate?: string
  remarks?: string
  status?: string
  allottedShares?: number
  allottedLots?: number
  sellPlan?: string
  createdAt?: string
  updatedAt?: string
}

type RecoverySale = {
  id: string
  subscriptionId: string
  price?: number
  date?: string
  shares?: number
  method?: string
  commission?: number
  remarks?: string
  createdAt?: string
  updatedAt?: string
}

type RecoveryData = {
  accounts?: RecoveryAccount[]
  ipos?: RecoveryIpo[]
  subscriptions?: RecoverySubscription[]
  sales?: RecoverySale[]
  sellRecords?: RecoverySale[]
}

const prisma = new PrismaClient()
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const sourceArgument = args.find((value) => !value.startsWith('--'))
const sourcePath = resolve(
  process.cwd(),
  sourceArgument ?? 'recovery/HKIPO_LIVE_BROWSER_20260714.json',
)
const auditedPriceFixes = new Map([
  ['06106', 101.6], ['01688', 10.18], ['09630', 252.73], ['03661', 85.2],
  ['01191', 114], ['01956', 60.7], ['07656', 21.66], ['06880', 295.6],
  ['07687', 87.92], ['09971', 31.62], ['03752', 38], ['06951', 100.3],
] as const)

async function main() {
  const source = JSON.parse(await readFile(sourcePath, 'utf8')) as RecoveryData
  const sourceAccounts = source.accounts ?? []
  const sourceIpos = source.ipos ?? []
  const sourceSubscriptions = source.subscriptions ?? []
  const sourceSales = source.sellRecords ?? source.sales ?? []

  const [accounts, ipos, accountIpos, sellRecords] = await Promise.all([
    prisma.account.findMany({ select: { id: true, name: true, accountSuffix: true } }),
    prisma.ipo.findMany({
      select: {
        id: true,
        code: true,
        offerPriceMin: true,
        offerPriceMax: true,
        lotSize: true,
        lotAmount: true,
      },
    }),
    prisma.accountIpo.findMany({ select: { id: true, accountId: true, ipoId: true } }),
    prisma.sellRecord.findMany({
      select: { id: true, accountIpoId: true, date: true, shares: true, price: true, method: true },
    }),
  ])

  const accountById = new Map(accounts.map((account) => [account.id, account]))
  const accountByIdentity = new Map(
    accounts.map((account) => [accountIdentity(account.name, account.accountSuffix), account]),
  )
  const sourceAccountById = new Map(sourceAccounts.map((account) => [account.id, account]))
  const ipoByCode = new Map(ipos.map((ipo) => [normalizeCode(ipo.code), ipo]))
  const accountIpoById = new Map(accountIpos.map((record) => [record.id, record]))
  const accountIpoByPair = new Map(
    accountIpos.map((record) => [accountIpoPair(record.accountId, record.ipoId), record]),
  )
  const sellRecordIds = new Set(sellRecords.map((record) => record.id))
  const sellSignatures = new Set(sellRecords.map(sellSignature))

  const missingIpos = sourceIpos.filter((ipo) => !ipoByCode.has(normalizeCode(ipo.stockCode ?? ipo.code ?? '')))
  const repairedIpos: Array<{
    id: string
    code: string
    data: {
      offerPriceMin?: number
      offerPriceMax?: number
    }
  }> = []
  const ipoConflicts: string[] = []
  for (const sourceIpo of sourceIpos) {
    const code = normalizeCode(sourceIpo.stockCode ?? sourceIpo.code ?? '')
    const existing = ipoByCode.get(code)
    const auditedPrice = auditedPriceFixes.get(code)
    if (!existing || auditedPrice === undefined) continue
    const sourcePrice = positiveNumber(sourceIpo.issuePrice)
    if (sourcePrice !== null && Math.abs(sourcePrice - auditedPrice) > 0.000001) {
      ipoConflicts.push(`${code}: recovery source price differs from audited price`)
      continue
    }
    const validExistingPrices = [existing.offerPriceMin, existing.offerPriceMax].filter(
      (price): price is number => price !== null && price > 0,
    )
    const needsPrice = existing.offerPriceMin === null || existing.offerPriceMin <= 0
      || existing.offerPriceMax === null || existing.offerPriceMax <= 0
    if (needsPrice && sourcePrice !== null
      && validExistingPrices.some((price) => Math.abs(price - auditedPrice) > 0.000001)) {
      ipoConflicts.push(`${code}: existing price differs from recovery source`)
      continue
    }
    const data = {
      ...(sourcePrice !== null && (existing.offerPriceMin === null || existing.offerPriceMin <= 0)
        ? { offerPriceMin: auditedPrice }
        : {}),
      ...(sourcePrice !== null && (existing.offerPriceMax === null || existing.offerPriceMax <= 0)
        ? { offerPriceMax: auditedPrice }
        : {}),
    }
    if (Object.keys(data).length > 0) repairedIpos.push({ id: existing.id, code, data })
  }
  const plannedIpoIdBySourceId = new Map<string, string>()
  for (const ipo of sourceIpos) {
    const existing = ipoByCode.get(normalizeCode(ipo.stockCode ?? ipo.code ?? ''))
    plannedIpoIdBySourceId.set(ipo.id, existing?.id ?? ipo.id)
  }

  const missingSubscriptions: Array<{
    source: RecoverySubscription
    accountId: string
    ipoId: string
  }> = []
  const skippedReferences: string[] = []

  for (const subscription of sourceSubscriptions) {
    const sourceAccount = sourceAccountById.get(subscription.accountId)
    const account =
      accountById.get(subscription.accountId) ??
      (sourceAccount
        ? accountByIdentity.get(accountIdentity(sourceAccount.name, sourceAccount.accountSuffix))
        : undefined)
    const ipoId = plannedIpoIdBySourceId.get(subscription.ipoId)
    if (!account || !ipoId) {
      skippedReferences.push(subscription.id)
      continue
    }
    if (
      accountIpoById.has(subscription.id) ||
      accountIpoByPair.has(accountIpoPair(account.id, ipoId))
    ) {
      continue
    }
    missingSubscriptions.push({ source: subscription, accountId: account.id, ipoId })
  }

  const plannedAccountIpoIdBySourceId = new Map<string, string>()
  for (const subscription of sourceSubscriptions) {
    const sourceAccount = sourceAccountById.get(subscription.accountId)
    const account =
      accountById.get(subscription.accountId) ??
      (sourceAccount
        ? accountByIdentity.get(accountIdentity(sourceAccount.name, sourceAccount.accountSuffix))
        : undefined)
    const ipoId = plannedIpoIdBySourceId.get(subscription.ipoId)
    if (!account || !ipoId) continue
    const existing =
      accountIpoById.get(subscription.id) ??
      accountIpoByPair.get(accountIpoPair(account.id, ipoId))
    plannedAccountIpoIdBySourceId.set(subscription.id, existing?.id ?? subscription.id)
  }

  const missingSales = sourceSales.filter((sale) => {
    const accountIpoId = plannedAccountIpoIdBySourceId.get(sale.subscriptionId)
    if (!accountIpoId || sellRecordIds.has(sale.id)) return false
    return !sellSignatures.has(
      sellSignature({
        accountIpoId,
        date: nullableDate(sale.date),
        shares: numberOrZero(sale.shares),
        price: numberOrZero(sale.price),
        method: cleanText(sale.method),
      }),
    )
  })

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Source: ${sourcePath}`)
  console.log(`New IPOs: ${missingIpos.length}`)
  console.log(`Repaired IPOs: ${repairedIpos.length}`)
  console.log(`New subscriptions: ${missingSubscriptions.length}`)
  console.log(`New sell records: ${missingSales.length}`)
  console.log(`Skipped: ${skippedReferences.length}`)
  console.log(`Conflicts: ${ipoConflicts.length}`)
  if (ipoConflicts.length > 0) {
    throw new Error(`IPO repair conflicts:\n${ipoConflicts.join('\n')}`)
  }
  if (skippedReferences.length > 0) {
    console.warn(`Skipped unresolved subscriptions: ${skippedReferences.length}`)
  }

  if (!apply) {
    console.log('No database changes were made. Re-run with --apply after reviewing this plan.')
    return
  }

  await prisma.$transaction(async (tx) => {
    for (const ipo of missingIpos) {
      const code = normalizeCode(ipo.stockCode ?? ipo.code ?? '')
      if (!code) throw new Error(`IPO ${ipo.id} has no stock code`)
      await tx.ipo.create({
        data: {
          id: ipo.id,
          code,
          name: ipo.name,
          displayNameCn: containsChinese(ipo.name) ? ipo.name : null,
          displayNameEn: containsChinese(ipo.name) ? null : ipo.name,
          status: 'listed',
          industry: cleanText(ipo.industry),
          offerPriceMin: nullableNumber(ipo.issuePrice),
          offerPriceMax: nullableNumber(ipo.issuePrice),
          lotSize: nullableInteger(ipo.lotSize),
          lotAmount:
            ipo.issuePrice && ipo.lotSize ? numberOrZero(ipo.issuePrice) * numberOrZero(ipo.lotSize) : null,
          subscribeStart: nullableDate(ipo.subscriptionDate),
          subscribeEnd: nullableDate(ipo.subscriptionDate),
          listingDate: nullableDate(ipo.listingDate),
          createdAt: dateOrNow(ipo.createdAt),
          updatedAt: dateOrNow(ipo.updatedAt),
        },
      })
    }

    for (const ipo of repairedIpos) {
      await tx.ipo.update({ where: { id: ipo.id }, data: ipo.data })
    }

    for (const item of missingSubscriptions) {
      const subscription = item.source
      await tx.accountIpo.create({
        data: {
          id: subscription.id,
          accountId: item.accountId,
          ipoId: item.ipoId,
          applyAmount: numberOrZero(subscription.subscriptionAmount),
          status: normalizeStatus(subscription.status),
          subscriptionMethod: cleanText(subscription.subscriptionMethod ?? subscription.method),
          subscriptionDate: nullableDate(subscription.subscriptionDate),
          remarks: cleanText(subscription.remarks),
          allottedShares: numberOrZero(subscription.allottedShares),
          allottedLots: numberOrZero(subscription.allottedLots),
          sellPlan: cleanText(subscription.sellPlan),
          commission: numberOrZero(subscription.fee),
          financingFee: 0,
          createdAt: dateOrNow(subscription.createdAt),
          updatedAt: dateOrNow(subscription.updatedAt),
        },
      })
    }

    for (const sale of missingSales) {
      const accountIpoId = plannedAccountIpoIdBySourceId.get(sale.subscriptionId)
      if (!accountIpoId) continue
      await tx.sellRecord.create({
        data: {
          id: sale.id,
          accountIpoId,
          price: numberOrZero(sale.price),
          date: nullableDate(sale.date),
          shares: numberOrZero(sale.shares),
          method: cleanText(sale.method),
          commission: numberOrZero(sale.commission),
          remarks: cleanText(sale.remarks),
          createdAt: dateOrNow(sale.createdAt),
          updatedAt: dateOrNow(sale.updatedAt),
        },
      })
    }
  }, { maxWait: 20_000, timeout: 120_000 })

  console.log(`IPOs inserted: ${missingIpos.length}`)
  console.log(`IPOs repaired: ${repairedIpos.length}`)
  console.log(`Subscriptions inserted: ${missingSubscriptions.length}`)
  console.log(`SellRecords inserted: ${missingSales.length}`)
}

function normalizeCode(value: string) {
  return value.trim().replace(/^0+/, '').padStart(5, '0').toUpperCase()
}

function accountIdentity(name: string, suffix: string | null | undefined) {
  return `${name.trim()}|${suffix?.trim() ?? ''}`
}

function accountIpoPair(accountId: string, ipoId: string) {
  return `${accountId}|${ipoId}`
}

function sellSignature(record: {
  accountIpoId: string
  date: Date | null
  shares: number
  price: number
  method: string | null
}) {
  return [
    record.accountIpoId,
    record.date?.toISOString().slice(0, 10) ?? '',
    record.shares,
    record.price,
    record.method ?? '',
  ].join('|')
}

function normalizeStatus(value: string | undefined) {
  const normalized = value?.toLowerCase()
  if (normalized === 'won' || normalized === 'allotted') return 'won'
  if (normalized === 'lost' || normalized === 'not_allotted') return 'lost'
  if (normalized === 'published') return 'published'
  return normalized || 'pending'
}

function containsChinese(value: string) {
  return /[\u3400-\u9fff]/u.test(value)
}

function cleanText(value: string | null | undefined) {
  const cleaned = value?.trim()
  return cleaned || null
}

function numberOrZero(value: number | string | null | undefined) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function nullableNumber(value: number | string | null | undefined) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function nullableInteger(value: number | string | null | undefined) {
  const number = nullableNumber(value)
  return number === null ? null : Math.round(number)
}

function positiveNumber(value: number | string | null | undefined) {
  const number = nullableNumber(value)
  return number !== null && number > 0 ? number : null
}

function nullableDate(value: string | Date | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function dateOrNow(value: string | undefined) {
  return nullableDate(value) ?? new Date()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
