import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [totals, recordsWithFinancingFee] = await Promise.all([
    prisma.accountIpo.aggregate({
      _sum: { commission: true, financingFee: true },
    }),
    prisma.accountIpo.findMany({
      where: { financingFee: { gt: 0 } },
      select: { id: true, commission: true, financingFee: true },
    }),
  ])

  const duplicateRecords = recordsWithFinancingFee.filter(
    (record) => record.commission === record.financingFee,
  )

  console.log('commission 总计', totals._sum.commission ?? 0)
  console.log('financingFee 总计', totals._sum.financingFee ?? 0)
  console.log('financingFee 非零记录数量', recordsWithFinancingFee.length)
  console.log('重复记录数量', duplicateRecords.length)

  if (recordsWithFinancingFee.length > 0) {
    console.warn('warning: financingFee 存在非零记录，请确认属于真实融资利息')
  }

  if (duplicateRecords.length > 0) {
    console.error(
      'error: financingFee 与 commission 重复',
      duplicateRecords.map((record) => record.id),
    )
    process.exitCode = 1
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
