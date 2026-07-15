import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [totals, duplicateRecords] = await Promise.all([
    prisma.accountIpo.aggregate({
      _sum: { commission: true, financingFee: true },
    }),
    prisma.accountIpo.count({
      where: { financingFee: { gt: 0 } },
    }),
  ])

  console.log('commission 总计', totals._sum.commission ?? 0)
  console.log('financingFee 总计', totals._sum.financingFee ?? 0)
  console.log('重复记录数量', duplicateRecords)
  if ((totals._sum.financingFee ?? 0) > 0) {
    console.warn('warning: financingFee 仍存在非零记录')
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
