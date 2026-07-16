import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

type RecoveryIpo = {
  name: string
  stockCode?: string
  code?: string
}

const prisma = new PrismaClient()

async function main() {
  const sourcePath = resolve(
    process.cwd(),
    process.argv[2] ?? 'recovery/HKIPO_LIVE_BROWSER_20260714.json',
  )
  const source = JSON.parse(await readFile(sourcePath, 'utf8')) as { ipos?: RecoveryIpo[] }
  let updated = 0

  for (const ipo of source.ipos ?? []) {
    if (!containsChinese(ipo.name)) continue
    const code = normalizeCode(ipo.stockCode ?? ipo.code ?? '')
    if (!code) continue
    const existing = await prisma.ipo.findUnique({ where: { code } })
    if (!existing) continue
    const data = {
      displayNameCn: existing.displayNameCn ?? ipo.name,
      displayNameEn:
        existing.displayNameEn ?? (containsChinese(existing.name) ? null : existing.name),
    }
    if (
      data.displayNameCn === existing.displayNameCn &&
      data.displayNameEn === existing.displayNameEn
    ) continue
    await prisma.ipo.update({ where: { code }, data })
    updated += 1
  }

  console.log(`IPO display-name rows updated: ${updated}`)
}

function normalizeCode(value: string) {
  return value.trim().replace(/^0+/, '').padStart(5, '0').toUpperCase()
}

function containsChinese(value: string) {
  return /[\u3400-\u9fff]/u.test(value)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
