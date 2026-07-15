import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const before = await prisma.accountIpo.aggregate({
    _sum: { commission: true, financingFee: true },
  })
  console.log('before', before)

  const result = await prisma.accountIpo.updateMany({
    where: { financingFee: { gt: 0 } },
    data: { financingFee: 0 },
  })
  console.log('updated', result.count)

  const after = await prisma.accountIpo.aggregate({
    _sum: { commission: true, financingFee: true },
  })
  console.log('after', after)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
