import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const expectedProfit = 87_133.94
const targetPrices = new Map([
  ['06106', 101.6], ['01688', 10.18], ['09630', 252.73], ['03661', 85.2],
  ['01191', 114], ['01956', 60.7], ['07656', 21.66], ['06880', 295.6],
  ['07687', 87.92], ['09971', 31.62], ['03752', 38], ['06951', 100.3],
] as const)

async function main() {
  const [accountIpos, sellRecordCount, ipoTargets] = await Promise.all([
    prisma.accountIpo.findMany({ include: { ipo: true, sellRecords: true } }),
    prisma.sellRecord.count(),
    prisma.ipo.findMany({ where: { code: { in: [...targetPrices.keys()] } } }),
  ])
  const errors: string[] = []
  let cumulativeProfit = 0

  for (const subscription of accountIpos) {
    const price = subscription.ipo.offerPriceMax ?? subscription.ipo.offerPriceMin ?? 0
    const soldShares = subscription.sellRecords.reduce((sum, sale) => sum + sale.shares, 0)
    if (subscription.sellRecords.length > 0 && price <= 0) {
      errors.push(`${subscription.ipo.code}: sold record has no valid issue price`)
    }
    if (subscription.sellRecords.length > 0 && subscription.allottedShares <= 0) {
      errors.push(`${subscription.id}: sold record has no allotted shares`)
    } else if (soldShares > subscription.allottedShares) {
      errors.push(`${subscription.id}: sold ${soldShares} > allotted ${subscription.allottedShares}`)
    }
    const income = subscription.sellRecords.reduce((sum, sale) => sum + sale.shares * sale.price, 0)
    const saleCommission = subscription.sellRecords.reduce((sum, sale) => sum + sale.commission, 0)
    cumulativeProfit += income - soldShares * price - subscription.commission - saleCommission
  }

  for (const [code, expected] of targetPrices) {
    const matches = ipoTargets.filter((ipo) => ipo.code === code)
    if (matches.length !== 1) {
      errors.push(`${code}: expected one IPO, found ${matches.length}`)
      continue
    }
    const ipo = matches[0]
    if (Math.abs((ipo.offerPriceMin ?? 0) - expected) > 0.000001
      || Math.abs((ipo.offerPriceMax ?? 0) - expected) > 0.000001) {
      errors.push(`${code}: expected ${expected}, found ${ipo.offerPriceMin}/${ipo.offerPriceMax}`)
    }
  }

  if (accountIpos.length !== 413) errors.push(`AccountIpo count ${accountIpos.length} != 413`)
  if (sellRecordCount !== 76) errors.push(`SellRecord count ${sellRecordCount} != 76`)
  if (Math.abs(cumulativeProfit - expectedProfit) > 0.05) {
    errors.push(`Cumulative profit ${cumulativeProfit.toFixed(2)} != ${expectedProfit.toFixed(2)}`)
  }

  console.log(`AccountIpo count: ${accountIpos.length}`)
  console.log(`SellRecord count: ${sellRecordCount}`)
  console.log(`Cumulative profit: HK$${cumulativeProfit.toFixed(2)}`)
  console.log(`Errors: ${errors.length}`)
  if (errors.length > 0) {
    errors.forEach((error) => console.error(`[IpoPriceWarning] ${error}`))
    process.exitCode = 1
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
