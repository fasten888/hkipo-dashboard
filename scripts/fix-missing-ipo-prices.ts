import { mkdir, writeFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const dryRun = process.argv.includes('--dry-run') || !apply
const expectedMissingCost = 214_161.4
const expectedProfitBefore = 301_295.34
const expectedProfitAfter = 87_133.94
const tolerance = 0.05

const targetPrices = new Map([
  ['06106', 101.6],
  ['01688', 10.18],
  ['09630', 252.73],
  ['03661', 85.2],
  ['01191', 114],
  ['01956', 60.7],
  ['07656', 21.66],
  ['06880', 295.6],
  ['07687', 87.92],
  ['09971', 31.62],
  ['03752', 38],
  ['06951', 100.3],
] as const)

type DatabaseSnapshot = Awaited<ReturnType<typeof readSnapshot>>

async function readSnapshot() {
  const [counts, ipos, accountIpos] = await Promise.all([
    Promise.all([
      prisma.account.count(),
      prisma.ipo.count(),
      prisma.accountIpo.count(),
      prisma.sellRecord.count(),
    ]),
    prisma.ipo.findMany({
      where: { code: { in: [...targetPrices.keys()] } },
      include: {
        accountIpos: {
          include: { sellRecords: true },
        },
      },
      orderBy: { code: 'asc' },
    }),
    prisma.accountIpo.findMany({
      include: { ipo: true, sellRecords: true },
    }),
  ])
  return { counts, ipos, accountIpos }
}

function issuePrice(ipo: { offerPriceMin: number | null; offerPriceMax: number | null }) {
  return ipo.offerPriceMax ?? ipo.offerPriceMin ?? 0
}

function cumulativeProfit(snapshot: DatabaseSnapshot) {
  return snapshot.accountIpos.reduce((total, subscription) => {
    const salesIncome = subscription.sellRecords.reduce(
      (sum, sale) => sum + sale.shares * sale.price,
      0,
    )
    const soldShares = subscription.sellRecords.reduce((sum, sale) => sum + sale.shares, 0)
    const saleCommissions = subscription.sellRecords.reduce(
      (sum, sale) => sum + sale.commission,
      0,
    )
    return total + salesIncome - soldShares * issuePrice(subscription.ipo)
      - subscription.commission - saleCommissions
  }, 0)
}

function inspect(snapshot: DatabaseSnapshot) {
  const byCode = new Map<string, typeof snapshot.ipos>()
  for (const ipo of snapshot.ipos) {
    const matches = byCode.get(ipo.code) ?? []
    matches.push(ipo)
    byCode.set(ipo.code, matches)
  }

  const missingCodes: string[] = []
  const conflicts: string[] = []
  const updates: Array<(typeof snapshot.ipos)[number] & { targetPrice: number }> = []
  let skipped = 0
  let affectedSales = 0
  let missingCost = 0

  for (const [code, targetPrice] of targetPrices) {
    const matches = byCode.get(code) ?? []
    if (matches.length === 0) {
      missingCodes.push(code)
      continue
    }
    if (matches.length !== 1) {
      conflicts.push(`${code}: matched ${matches.length} rows`)
      continue
    }
    const ipo = matches[0]
    const validPrices = [ipo.offerPriceMin, ipo.offerPriceMax].filter(
      (price): price is number => price !== null && price > 0,
    )
    if (validPrices.some((price) => Math.abs(price - targetPrice) > 0.000001)) {
      conflicts.push(`${code}: existing price ${validPrices.join('/')} differs from ${targetPrice}`)
      continue
    }
    if (ipo.offerPriceMin !== null && ipo.offerPriceMin > 0
      && ipo.offerPriceMax !== null && ipo.offerPriceMax > 0) {
      skipped += 1
      continue
    }
    const sales = ipo.accountIpos.flatMap((subscription) => subscription.sellRecords)
    const soldShares = sales.reduce((sum, sale) => sum + sale.shares, 0)
    affectedSales += sales.length
    missingCost += soldShares * targetPrice
    updates.push({ ...ipo, targetPrice })
  }

  const profitBefore = cumulativeProfit(snapshot)
  const profitAfter = profitBefore - missingCost
  return {
    missingCodes,
    conflicts,
    updates,
    skipped,
    affectedSales,
    missingCost,
    profitBefore,
    profitAfter,
  }
}

function assertPlan(plan: ReturnType<typeof inspect>, beforeApply: boolean) {
  const errors = [...plan.missingCodes.map((code) => `${code}: IPO not found`), ...plan.conflicts]
  if (beforeApply && plan.updates.length > 0) {
    if (Math.abs(plan.missingCost - expectedMissingCost) > tolerance) {
      errors.push(`missing cost ${plan.missingCost.toFixed(2)} != ${expectedMissingCost.toFixed(2)}`)
    }
    if (Math.abs(plan.profitBefore - expectedProfitBefore) > tolerance) {
      errors.push(`profit before ${plan.profitBefore.toFixed(2)} != ${expectedProfitBefore.toFixed(2)}`)
    }
    if (Math.abs(plan.profitAfter - expectedProfitAfter) > tolerance) {
      errors.push(`profit after ${plan.profitAfter.toFixed(2)} != ${expectedProfitAfter.toFixed(2)}`)
    }
  }
  if (errors.length > 0) throw new Error(`Safety checks failed:\n${errors.join('\n')}`)
}

function printPlan(snapshot: DatabaseSnapshot, plan: ReturnType<typeof inspect>) {
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`)
  console.log(`Current IPO count: ${snapshot.counts[1]}`)
  console.table(plan.updates.map((ipo) => ({
    code: ipo.code,
    name: ipo.displayNameCn ?? ipo.name,
    offerPriceMinBefore: ipo.offerPriceMin,
    offerPriceMaxBefore: ipo.offerPriceMax,
    plannedPrice: ipo.targetPrice.toFixed(2),
    affectedSellRecords: ipo.accountIpos.reduce((sum, item) => sum + item.sellRecords.length, 0),
    restoredIssueCost: ipo.accountIpos
      .flatMap((item) => item.sellRecords)
      .reduce((sum, sale) => sum + sale.shares * ipo.targetPrice, 0)
      .toFixed(2),
  })))
  console.log(`Targets found: ${targetPrices.size - plan.missingCodes.length}`)
  console.log(`Updated/planned: ${plan.updates.length}`)
  console.log(`Skipped: ${plan.skipped}`)
  console.log(`Conflicts: ${plan.conflicts.length}`)
  console.log(`Affected SellRecords: ${plan.affectedSales}`)
  console.log(`Expected restored issue cost: HK$${plan.missingCost.toFixed(2)}`)
  console.log(`Profit before: HK$${plan.profitBefore.toFixed(2)}`)
  console.log(`Profit after expected: HK$${plan.profitAfter.toFixed(2)}`)
}

async function backup(snapshot: DatabaseSnapshot) {
  await mkdir('recovery', { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const path = `recovery/ipo-price-backup-${timestamp}.json`
  await writeFile(path, `${JSON.stringify({
    createdAt: new Date().toISOString(),
    counts: {
      account: snapshot.counts[0],
      ipo: snapshot.counts[1],
      accountIpo: snapshot.counts[2],
      sellRecord: snapshot.counts[3],
    },
    ipos: snapshot.ipos,
  }, null, 2)}\n`, { flag: 'wx' })
  return path
}

async function main() {
  const before = await readSnapshot()
  const plan = inspect(before)
  printPlan(before, plan)
  assertPlan(plan, true)
  if (dryRun) {
    console.log('No database changes were made.')
    return
  }

  const backupPath = await backup(before)
  console.log(`Backup: ${backupPath}`)
  await prisma.$transaction(async (tx) => {
    for (const ipo of plan.updates) {
      const current = await tx.ipo.findUniqueOrThrow({ where: { id: ipo.id } })
      const validPrices = [current.offerPriceMin, current.offerPriceMax].filter(
        (price): price is number => price !== null && price > 0,
      )
      if (validPrices.some((price) => Math.abs(price - ipo.targetPrice) > 0.000001)) {
        throw new Error(`${ipo.code}: price changed after dry-run; transaction aborted`)
      }
      await tx.ipo.update({
        where: { id: ipo.id },
        data: {
          ...(current.offerPriceMin === null || current.offerPriceMin <= 0
            ? { offerPriceMin: ipo.targetPrice }
            : {}),
          ...(current.offerPriceMax === null || current.offerPriceMax <= 0
            ? { offerPriceMax: ipo.targetPrice }
            : {}),
        },
      })
    }
  }, { maxWait: 20_000, timeout: 120_000 })

  const after = await readSnapshot()
  const afterPlan = inspect(after)
  assertPlan(afterPlan, false)
  const countsUnchanged = before.counts.every((count, index) => count === after.counts[index])
  if (!countsUnchanged) throw new Error(`Business record counts changed: ${before.counts} -> ${after.counts}`)
  const profitAfter = cumulativeProfit(after)
  if (Math.abs(profitAfter - expectedProfitAfter) > tolerance) {
    throw new Error(`Verified profit ${profitAfter.toFixed(2)} != ${expectedProfitAfter.toFixed(2)}`)
  }
  console.log(`Actually updated: ${plan.updates.length}`)
  console.log(`Verified restored issue cost: HK$${(plan.profitBefore - profitAfter).toFixed(2)}`)
  console.log(`Verified cumulative profit: HK$${profitAfter.toFixed(2)}`)
  console.log(`Counts unchanged: ${after.counts.join(' / ')}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
