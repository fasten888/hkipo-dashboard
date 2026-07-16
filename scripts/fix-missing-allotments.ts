import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const dryRun = process.argv.includes('--dry-run') || !apply
const evidencePath = 'recovery/HKIPO_LIVE_BROWSER_20260714.json'
const expectedProfit = 87_133.94
const tolerance = 0.05

const targets = new Map([
  ['02993a63-f5a9-4940-84f0-3016ea7b197b', { shares: 500, lots: 1 }],
  ['c038cac2-cdc9-47f6-b311-7b9e6240dfc4', { shares: 100, lots: 1 }],
  ['5cd73831-fb63-4875-ace7-96e8ac1070c4', { shares: 100, lots: 1 }],
  ['b3ab2a12-b03f-4528-b0a0-3ea90637f8da', { shares: 200, lots: 1 }],
] as const)

type EvidenceSubscription = {
  id: string
  accountId: string
  ipoId: string
  status: string
  allottedShares: number
  allottedLots: number
  updatedAt?: string
}

async function readEvidence() {
  const json = JSON.parse(await readFile(evidencePath, 'utf8')) as {
    subscriptions?: EvidenceSubscription[]
  }
  return json.subscriptions ?? []
}

async function readSnapshot() {
  const [counts, accountIpos] = await Promise.all([
    Promise.all([
      prisma.account.count(),
      prisma.ipo.count(),
      prisma.accountIpo.count(),
      prisma.sellRecord.count(),
    ]),
    prisma.accountIpo.findMany({
      where: { id: { in: [...targets.keys()] } },
      include: {
        account: true,
        ipo: true,
        sellRecords: { orderBy: [{ date: 'asc' }, { id: 'asc' }] },
      },
      orderBy: { id: 'asc' },
    }),
  ])
  return { counts, accountIpos }
}

async function cumulativeProfit() {
  const subscriptions = await prisma.accountIpo.findMany({
    include: { ipo: true, sellRecords: true },
  })
  return subscriptions.reduce((total, subscription) => {
    const issuePrice = subscription.ipo.offerPriceMax ?? subscription.ipo.offerPriceMin ?? 0
    const soldShares = subscription.sellRecords.reduce((sum, sale) => sum + sale.shares, 0)
    const income = subscription.sellRecords.reduce(
      (sum, sale) => sum + sale.shares * sale.price,
      0,
    )
    const saleCommission = subscription.sellRecords.reduce(
      (sum, sale) => sum + sale.commission,
      0,
    )
    return total + income - soldShares * issuePrice - subscription.commission - saleCommission
  }, 0)
}

async function inspect() {
  const [snapshot, evidence, profitBefore] = await Promise.all([
    readSnapshot(),
    readEvidence(),
    cumulativeProfit(),
  ])
  const conflicts: string[] = []
  const planned: Array<{
    row: (typeof snapshot.accountIpos)[number]
    evidence: EvidenceSubscription
  }> = []
  let skipped = 0

  if (snapshot.counts[2] !== 413) conflicts.push(`AccountIpo count ${snapshot.counts[2]} != 413`)
  if (snapshot.counts[3] !== 76) conflicts.push(`SellRecord count ${snapshot.counts[3]} != 76`)
  if (Math.abs(profitBefore - expectedProfit) > tolerance) {
    conflicts.push(`Cumulative profit ${profitBefore.toFixed(2)} != ${expectedProfit.toFixed(2)}`)
  }

  for (const [id, expected] of targets) {
    const databaseMatches = snapshot.accountIpos.filter((row) => row.id === id)
    const evidenceMatches = evidence.filter((row) => row.id === id)
    if (databaseMatches.length !== 1) {
      conflicts.push(`${id}: database matched ${databaseMatches.length} rows`)
      continue
    }
    if (evidenceMatches.length !== 1) {
      conflicts.push(`${id}: evidence matched ${evidenceMatches.length} rows`)
      continue
    }
    const row = databaseMatches[0]
    const source = evidenceMatches[0]
    const soldShares = row.sellRecords.reduce((sum, sale) => sum + sale.shares, 0)
    if (source.accountId !== row.accountId || source.ipoId !== row.ipoId) {
      conflicts.push(`${id}: evidence foreign keys do not match database`)
      continue
    }
    if (source.status !== 'won'
      || source.allottedShares !== expected.shares
      || source.allottedLots !== expected.lots) {
      conflicts.push(`${id}: evidence value is not the audited won/${expected.shares}/${expected.lots}`)
      continue
    }
    if (source.allottedShares < soldShares) {
      conflicts.push(`${id}: evidence allotted ${source.allottedShares} < sold ${soldShares}`)
      continue
    }
    if (row.allottedShares === 0) {
      planned.push({ row, evidence: source })
      continue
    }
    if (row.allottedShares === source.allottedShares
      && row.allottedLots === source.allottedLots
      && row.status === source.status) {
      skipped += 1
      continue
    }
    conflicts.push(
      `${id}: database ${row.status}/${row.allottedShares}/${row.allottedLots} conflicts with evidence ${source.status}/${source.allottedShares}/${source.allottedLots}`,
    )
  }

  return { snapshot, planned, skipped, conflicts, profitBefore, profitAfter: profitBefore }
}

function printPlan(plan: Awaited<ReturnType<typeof inspect>>) {
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`)
  console.log(`Evidence: ${evidencePath}`)
  console.log(`Anomalies found: ${plan.planned.length}`)
  console.table(plan.planned.map(({ row, evidence }) => ({
    accountIpoId: row.id,
    stock: `${row.ipo.displayNameCn ?? row.ipo.name} (${row.ipo.code})`,
    account: `${row.account.name}${row.account.accountSuffix ? ` (${row.account.accountSuffix})` : ''}`,
    current: `${row.status}/${row.allottedShares}/${row.allottedLots}`,
    evidence: `${evidence.status}/${evidence.allottedShares}/${evidence.allottedLots}`,
    evidenceUpdatedAt: evidence.updatedAt ?? '',
    soldShares: row.sellRecords.reduce((sum, sale) => sum + sale.shares, 0),
  })))
  console.log(`Profit before: HK$${plan.profitBefore.toFixed(2)}`)
  console.log(`Profit after expected: HK$${plan.profitAfter.toFixed(2)}`)
  console.log(`Planned: ${plan.planned.length}`)
  console.log(`Skipped: ${plan.skipped}`)
  console.log(`Conflicts: ${plan.conflicts.length}`)
}

function assertPlan(plan: Awaited<ReturnType<typeof inspect>>) {
  if (plan.conflicts.length > 0) {
    throw new Error(`Safety checks failed:\n${plan.conflicts.join('\n')}`)
  }
  if (Math.abs(plan.profitAfter - plan.profitBefore) > tolerance) {
    throw new Error('Allotment repair would change cumulative profit')
  }
}

async function backup(plan: Awaited<ReturnType<typeof inspect>>) {
  await mkdir('recovery', { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const path = `recovery/account-ipo-allotment-backup-${timestamp}.json`
  await writeFile(path, `${JSON.stringify({
    createdAt: new Date().toISOString(),
    counts: {
      account: plan.snapshot.counts[0],
      ipo: plan.snapshot.counts[1],
      accountIpo: plan.snapshot.counts[2],
      sellRecord: plan.snapshot.counts[3],
    },
    accountIpos: plan.snapshot.accountIpos,
  }, null, 2)}\n`, { flag: 'wx' })
  return path
}

async function main() {
  const before = await inspect()
  printPlan(before)
  assertPlan(before)
  if (dryRun) {
    console.log('No database changes were made.')
    return
  }

  const backupPath = await backup(before)
  console.log(`Backup: ${backupPath}`)
  await prisma.$transaction(async (tx) => {
    for (const { row, evidence } of before.planned) {
      const current = await tx.accountIpo.findUniqueOrThrow({ where: { id: row.id } })
      if (current.allottedShares !== 0) {
        throw new Error(`${row.id}: allottedShares changed after dry-run; transaction aborted`)
      }
      await tx.accountIpo.update({
        where: { id: row.id },
        data: {
          allottedShares: evidence.allottedShares,
          allottedLots: evidence.allottedLots,
          status: 'won',
        },
      })
    }
  }, { maxWait: 20_000, timeout: 120_000 })

  const after = await inspect()
  assertPlan(after)
  if (after.planned.length !== 0 || after.skipped !== targets.size) {
    throw new Error(`Verification failed: planned ${after.planned.length}, skipped ${after.skipped}`)
  }
  if (before.snapshot.counts.some((count, index) => count !== after.snapshot.counts[index])) {
    throw new Error(`Business record counts changed: ${before.snapshot.counts} -> ${after.snapshot.counts}`)
  }
  if (Math.abs(after.profitBefore - expectedProfit) > tolerance) {
    throw new Error(`Verified profit ${after.profitBefore.toFixed(2)} != ${expectedProfit.toFixed(2)}`)
  }
  console.log(`Actually updated: ${before.planned.length}`)
  console.log(`Verified cumulative profit: HK$${after.profitBefore.toFixed(2)}`)
  console.log(`Counts unchanged: ${after.snapshot.counts.join(' / ')}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
