import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const brokerProfiles = [
  { name: '富途证券', defaultMarginMultiple: 10, defaultFee: 100, defaultFinancingRate: 0 },
  { name: '辉立证券', defaultMarginMultiple: 10, defaultFee: 100, defaultFinancingRate: 0 },
  { name: '耀才证券', defaultMarginMultiple: 10, defaultFee: 100, defaultFinancingRate: 0 },
  { name: '致富证券', defaultMarginMultiple: 10, defaultFee: 100, defaultFinancingRate: 0 },
]

async function main() {
  for (const broker of brokerProfiles) {
    await prisma.brokerProfile.upsert({
      where: { name: broker.name },
      create: broker,
      update: broker,
    })
  }

  console.log(`BrokerProfiles seeded: ${brokerProfiles.length}`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
