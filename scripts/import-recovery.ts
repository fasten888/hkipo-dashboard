import { PrismaClient } from '@prisma/client'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const prisma = new PrismaClient()

type LegacyAccount = {
  id: string
  name: string
  accountSuffix?: string
  brokerName?: string
  securitiesAccount?: string
  initialDeposit?: number
  currentAssets?: number
  defaultSubscriptionMethod?: string
  remarks?: string
  createdAt?: string
  updatedAt?: string
}

type LegacyIpo = {
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

type LegacySubscription = {
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

type LegacyAllotment = {
  subscriptionId: string
  status?: string
  allottedShares?: number
  allottedLots?: number
  issuePrice?: number
  listingDate?: string
  sellPlan?: string
}

type LegacySellRecord = {
  id: string
  subscriptionId: string
  price?: number
  date?: string
  shares?: number
  method?: string
  remarks?: string
  createdAt?: string
  updatedAt?: string
}

type LegacyWithdrawal = {
  id: string
  accountId: string
  date?: string
  amount?: number
  remarks?: string
  createdAt?: string
  updatedAt?: string
}

type LegacyExchangeRecord = {
  id: string
  accountId: string
  date?: string
  sourceCurrency?: string
  sourceAmount?: number
  sourceAmountCny?: number
  targetCurrency?: string
  targetAmount?: number
  exchangeRate?: number
  manualRate?: number | null
  originalCostCny?: number
  feeCny?: number
  channel?: string
  remarks?: string
  createdAt?: string
  updatedAt?: string
}

type SqliteIpoEvent = {
  id: string
  ipo_id: string
  type: string
  title: string
  event_date: string | number
  pdf_url?: string | null
  created_at?: string | number
}

type SqliteIpo = {
  id: string
  code: string
  name: string
  status?: string
  board?: string | null
  industry?: string | null
  offer_price_min?: number | null
  offer_price_max?: number | null
  lot_size?: number | null
  lot_amount?: number | null
  margin_multiple?: number | null
  subscribe_start?: string | number | null
  subscribe_end?: string | number | null
  listing_date?: string | number | null
  created_at?: string | number
  updated_at?: string | number
}

type RecoveryFile = {
  accounts?: LegacyAccount[]
  ipos?: LegacyIpo[]
  subscriptions?: LegacySubscription[]
  allotments?: LegacyAllotment[]
  sellRecords?: LegacySellRecord[]
  withdrawals?: LegacyWithdrawal[]
  exchangeRecords?: LegacyExchangeRecord[]
}

type ImportStats = {
  accounts: number
  ipos: number
  subscriptions: number
  sellRecords: number
  brokerProfiles: number
  ipoEvents: number
  withdrawals: number
  exchangeRecords: number
  sqliteEventIpos: number
}

const recoveryPath = resolve(process.cwd(), 'HKIPO_LATEST_RECOVERY_IMPORT.json')
const sellRecordsPath = resolve(process.cwd(), 'recovery', 'sell_records.json')
const sqlitePath = resolve(process.cwd(), 'prisma', 'dev.db')

async function main() {
  await ensureRecoveryColumns()

  const recovery = await readRecoveryFile(recoveryPath)
  const allotmentsBySubscriptionId = new Map(
    (recovery.allotments ?? []).map((allotment) => [allotment.subscriptionId, allotment]),
  )
  const brokerProfileIds = await importBrokerProfiles(recovery.accounts ?? [])
  const importedIpos = await importIpos(recovery.ipos ?? [])
  const sqliteEventIpos = await importSqliteEventIpos()

  const stats: ImportStats = {
    brokerProfiles: brokerProfileIds.size,
    accounts: await importAccounts(recovery.accounts ?? [], brokerProfileIds),
    ipos: importedIpos,
    sqliteEventIpos: sqliteEventIpos.imported,
    ipoEvents: await importSqliteIpoEvents(sqliteEventIpos.idMap),
    subscriptions: await importSubscriptions(
      recovery.subscriptions ?? [],
      allotmentsBySubscriptionId,
    ),
    sellRecords: await importSellRecords(await getSellRecords(recovery)),
    withdrawals: await importWithdrawals(recovery.withdrawals ?? []),
    exchangeRecords: await importExchangeRecords(recovery.exchangeRecords ?? []),
  }

  console.log(`BrokerProfiles imported: ${stats.brokerProfiles}`)
  console.log(`Accounts imported: ${stats.accounts}`)
  console.log(`IPOs imported: ${stats.ipos}`)
  console.log(`SQLite event IPOs imported: ${stats.sqliteEventIpos}`)
  console.log(`IPO events imported: ${stats.ipoEvents}`)
  console.log(`Subscriptions imported: ${stats.subscriptions}`)
  console.log(`SellRecords imported: ${stats.sellRecords}`)
  console.log(`Withdrawals imported: ${stats.withdrawals}`)
  console.log(`ExchangeRecords imported: ${stats.exchangeRecords}`)
}

async function ensureRecoveryColumns() {
  const statements = [
    'ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "account_suffix" TEXT',
    'ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "phone" TEXT DEFAULT \'\'',
    'ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "securities_account" TEXT',
    'ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "initial_deposit" DOUBLE PRECISION NOT NULL DEFAULT 0',
    'ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "current_assets" DOUBLE PRECISION NOT NULL DEFAULT 0',
    'ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "default_subscription_method" TEXT',
    'ALTER TABLE "account_ipo" ADD COLUMN IF NOT EXISTS "subscription_method" TEXT',
    'ALTER TABLE "account_ipo" ADD COLUMN IF NOT EXISTS "subscription_date" TIMESTAMP(3)',
    'ALTER TABLE "account_ipo" ADD COLUMN IF NOT EXISTS "remarks" TEXT',
    'ALTER TABLE "account_ipo" ADD COLUMN IF NOT EXISTS "allotted_shares" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "account_ipo" ADD COLUMN IF NOT EXISTS "allotted_lots" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "account_ipo" ADD COLUMN IF NOT EXISTS "sell_plan" TEXT',
    'ALTER TABLE "account_ipo" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
    `CREATE TABLE IF NOT EXISTS "sell_record" (
      "id" TEXT NOT NULL,
      "account_ipo_id" TEXT NOT NULL,
      "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "date" TIMESTAMP(3),
      "shares" INTEGER NOT NULL DEFAULT 0,
      "method" TEXT,
      "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "remarks" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "sell_record_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "sell_record_account_ipo_id_fkey" FOREIGN KEY ("account_ipo_id") REFERENCES "account_ipo"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    'CREATE INDEX IF NOT EXISTS "sell_record_account_ipo_id_idx" ON "sell_record"("account_ipo_id")',
    'CREATE INDEX IF NOT EXISTS "sell_record_date_idx" ON "sell_record"("date")',
    `CREATE TABLE IF NOT EXISTS "exchange_record" (
      "id" TEXT NOT NULL,
      "account_id" TEXT NOT NULL,
      "date" TIMESTAMP(3),
      "source_currency" TEXT NOT NULL DEFAULT 'CNY',
      "source_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "source_amount_cny" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "target_currency" TEXT NOT NULL DEFAULT 'HKD',
      "target_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "exchange_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "manual_rate" DOUBLE PRECISION,
      "original_cost_cny" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "fee_cny" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "channel" TEXT,
      "remarks" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "exchange_record_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "exchange_record_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    'CREATE INDEX IF NOT EXISTS "exchange_record_account_id_idx" ON "exchange_record"("account_id")',
    'CREATE INDEX IF NOT EXISTS "exchange_record_date_idx" ON "exchange_record"("date")',
    `CREATE TABLE IF NOT EXISTS "withdrawal" (
      "id" TEXT NOT NULL,
      "account_id" TEXT NOT NULL,
      "date" TIMESTAMP(3),
      "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "remarks" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "withdrawal_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "withdrawal_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    'CREATE INDEX IF NOT EXISTS "withdrawal_account_id_idx" ON "withdrawal"("account_id")',
    'CREATE INDEX IF NOT EXISTS "withdrawal_date_idx" ON "withdrawal"("date")',
  ]

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }
}

async function readRecoveryFile(filePath: string): Promise<RecoveryFile> {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw) as RecoveryFile
}

async function importBrokerProfiles(accounts: LegacyAccount[]) {
  const brokerNames = Array.from(
    new Set(
      accounts
        .map((account) => cleanText(account.brokerName))
        .filter((brokerName): brokerName is string => Boolean(brokerName)),
    ),
  )
  const brokerProfileIds = new Map<string, string>()

  for (const name of brokerNames) {
    const brokerProfile = await prisma.brokerProfile.upsert({
      where: { name },
      create: {
        name,
        defaultMarginMultiple: 10,
        defaultFee: 100,
        defaultFinancingRate: 0,
      },
      update: {
        name,
      },
    })
    brokerProfileIds.set(name, brokerProfile.id)
  }

  return brokerProfileIds
}

async function importAccounts(
  accounts: LegacyAccount[],
  brokerProfileIds: Map<string, string>,
) {
  let imported = 0

  for (const account of accounts) {
    const brokerName = cleanText(account.brokerName)
    const brokerProfileId = brokerName ? brokerProfileIds.get(brokerName) : undefined

    await prisma.account.upsert({
      where: { id: account.id },
      create: {
        id: account.id,
        name: account.name,
        broker: brokerName,
        brokerProfileId,
        accountSuffix: cleanText(account.accountSuffix),
        securitiesAccount: cleanText(account.securitiesAccount),
        initialDeposit: numberOrZero(account.initialDeposit),
        currentAssets: numberOrZero(account.currentAssets),
        defaultSubscriptionMethod: cleanText(account.defaultSubscriptionMethod),
        currency: 'HKD',
        cash: numberOrZero(account.currentAssets),
        frozen: 0,
        marginLimit: 0,
        availableMargin: 0,
        financingMultiple: subscriptionMethodToMultiple(account.defaultSubscriptionMethod),
        status: 'active',
        note: cleanText(account.remarks),
        createdAt: dateOrNow(account.createdAt),
        updatedAt: dateOrNow(account.updatedAt),
      },
      update: {
        name: account.name,
        broker: brokerName,
        brokerProfileId,
        accountSuffix: cleanText(account.accountSuffix),
        securitiesAccount: cleanText(account.securitiesAccount),
        initialDeposit: numberOrZero(account.initialDeposit),
        currentAssets: numberOrZero(account.currentAssets),
        defaultSubscriptionMethod: cleanText(account.defaultSubscriptionMethod),
        cash: numberOrZero(account.currentAssets),
        financingMultiple: subscriptionMethodToMultiple(account.defaultSubscriptionMethod),
        note: cleanText(account.remarks),
        updatedAt: dateOrNow(account.updatedAt),
      },
    })
    imported += 1
  }

  return imported
}

async function importIpos(ipos: LegacyIpo[]) {
  let imported = 0

  for (const ipo of ipos) {
    const code = normalizeCode(ipo.stockCode ?? ipo.code ?? ipo.id)
    const issuePrice = nullableNumber(ipo.issuePrice)
    const lotSize = nullableInteger(ipo.lotSize)

    await prisma.ipo.upsert({
      where: { code },
      create: {
        id: ipo.id,
        code,
        name: ipo.name,
        status: 'legacy',
        industry: cleanText(ipo.industry),
        offerPriceMin: issuePrice,
        offerPriceMax: issuePrice,
        lotSize,
        lotAmount: issuePrice && lotSize ? issuePrice * lotSize : undefined,
        marginMultiple: 10,
        subscribeStart: nullableDate(ipo.subscriptionDate),
        subscribeEnd: nullableDate(ipo.subscriptionDate),
        listingDate: nullableDate(ipo.listingDate),
        createdAt: dateOrNow(ipo.createdAt),
        updatedAt: dateOrNow(ipo.updatedAt),
      },
      update: {
        name: ipo.name,
        industry: cleanText(ipo.industry),
        offerPriceMin: issuePrice,
        offerPriceMax: issuePrice,
        lotSize,
        lotAmount: issuePrice && lotSize ? issuePrice * lotSize : undefined,
        subscribeStart: nullableDate(ipo.subscriptionDate),
        subscribeEnd: nullableDate(ipo.subscriptionDate),
        listingDate: nullableDate(ipo.listingDate),
        updatedAt: dateOrNow(ipo.updatedAt),
      },
    })
    imported += 1
  }

  return imported
}

async function importSubscriptions(
  subscriptions: LegacySubscription[],
  allotmentsBySubscriptionId: Map<string, LegacyAllotment>,
) {
  let imported = 0

  for (const subscription of subscriptions) {
    const allotment = allotmentsBySubscriptionId.get(subscription.id)
    const status = allotment?.status ?? subscription.status ?? 'applied'
    const allottedShares = numberOrZero(allotment?.allottedShares ?? subscription.allottedShares)
    const allottedLots = numberOrZero(allotment?.allottedLots ?? subscription.allottedLots)
    const sellPlan = allotment?.sellPlan ?? subscription.sellPlan
    const commission = numberOrZero(subscription.fee)

    await prisma.accountIpo.upsert({
      where: { id: subscription.id },
      create: {
        id: subscription.id,
        accountId: subscription.accountId,
        ipoId: subscription.ipoId,
        applyLots: allottedLots,
        applyAmount: numberOrZero(subscription.subscriptionAmount),
        status,
        subscriptionMethod: cleanText(subscription.subscriptionMethod ?? subscription.method),
        subscriptionDate: nullableDate(subscription.subscriptionDate),
        remarks: cleanText(subscription.remarks),
        allottedShares,
        allottedLots,
        sellPlan: cleanText(sellPlan),
        commission,
        financingFee: 0,
        profit: 0,
        createdAt: dateOrNow(subscription.createdAt),
        updatedAt: dateOrNow(subscription.updatedAt),
      },
      update: {
        accountId: subscription.accountId,
        ipoId: subscription.ipoId,
        applyLots: allottedLots,
        applyAmount: numberOrZero(subscription.subscriptionAmount),
        status,
        subscriptionMethod: cleanText(subscription.subscriptionMethod ?? subscription.method),
        subscriptionDate: nullableDate(subscription.subscriptionDate),
        remarks: cleanText(subscription.remarks),
        allottedShares,
        allottedLots,
        sellPlan: cleanText(sellPlan),
        commission,
        financingFee: 0,
        updatedAt: dateOrNow(subscription.updatedAt),
      },
    })
    imported += 1
  }

  return imported
}

async function importSqliteEventIpos() {
  const idMap = new Map<string, string>()
  let ipos: SqliteIpo[] = []

  try {
    const raw = execFileSync('sqlite3', [
      '-json',
      sqlitePath,
      `select distinct i.id, i.code, i.name, i.status, i.board, i.industry,
        i.offer_price_min, i.offer_price_max, i.lot_size, i.lot_amount,
        i.margin_multiple, i.subscribe_start, i.subscribe_end, i.listing_date,
        i.created_at, i.updated_at
       from ipo i
       inner join ipo_event e on e.ipo_id = i.id`,
    ], {
      encoding: 'utf8',
    })
    ipos = JSON.parse(raw || '[]') as SqliteIpo[]
  } catch {
    return { imported: 0, idMap }
  }

  let imported = 0
  for (const ipo of ipos) {
    const code = normalizeCode(ipo.code)
    const record = await prisma.ipo.upsert({
      where: { code },
      create: {
        id: ipo.id,
        code,
        name: ipo.name,
        status: ipo.status ?? 'sqlite-import',
        board: cleanText(ipo.board ?? undefined),
        industry: cleanText(ipo.industry ?? undefined),
        offerPriceMin: nullableNumber(ipo.offer_price_min ?? undefined),
        offerPriceMax: nullableNumber(ipo.offer_price_max ?? undefined),
        lotSize: nullableInteger(ipo.lot_size ?? undefined),
        lotAmount: nullableNumber(ipo.lot_amount ?? undefined),
        marginMultiple: nullableNumber(ipo.margin_multiple ?? undefined),
        subscribeStart: sqliteDateOrUndefined(ipo.subscribe_start),
        subscribeEnd: sqliteDateOrUndefined(ipo.subscribe_end),
        listingDate: sqliteDateOrUndefined(ipo.listing_date),
        createdAt: sqliteDate(ipo.created_at),
        updatedAt: sqliteDate(ipo.updated_at),
      },
      update: {
        name: ipo.name,
        status: ipo.status ?? 'sqlite-import',
        board: cleanText(ipo.board ?? undefined),
        industry: cleanText(ipo.industry ?? undefined),
        offerPriceMin: nullableNumber(ipo.offer_price_min ?? undefined),
        offerPriceMax: nullableNumber(ipo.offer_price_max ?? undefined),
        lotSize: nullableInteger(ipo.lot_size ?? undefined),
        lotAmount: nullableNumber(ipo.lot_amount ?? undefined),
        marginMultiple: nullableNumber(ipo.margin_multiple ?? undefined),
        subscribeStart: sqliteDateOrUndefined(ipo.subscribe_start),
        subscribeEnd: sqliteDateOrUndefined(ipo.subscribe_end),
        listingDate: sqliteDateOrUndefined(ipo.listing_date),
        updatedAt: sqliteDate(ipo.updated_at),
      },
    })
    idMap.set(ipo.id, record.id)
    imported += 1
  }

  return { imported, idMap }
}

async function importSqliteIpoEvents(ipoIdMap: Map<string, string>) {
  let events: SqliteIpoEvent[] = []
  try {
    const raw = execFileSync('sqlite3', [
      '-json',
      sqlitePath,
      'select id, ipo_id, type, title, event_date, pdf_url, created_at from ipo_event',
    ], {
      encoding: 'utf8',
    })
    events = JSON.parse(raw || '[]') as SqliteIpoEvent[]
  } catch {
    return 0
  }

  let imported = 0
  for (const event of events) {
    const ipoId = ipoIdMap.get(event.ipo_id) ?? event.ipo_id
    try {
      await prisma.ipoEvent.upsert({
        where: { id: event.id },
        create: {
          id: event.id,
          ipoId,
          type: event.type,
          title: event.title,
          eventDate: sqliteDate(event.event_date),
          pdfUrl: cleanText(event.pdf_url ?? undefined),
          createdAt: sqliteDate(event.created_at),
        },
        update: {
          ipoId,
          type: event.type,
          title: event.title,
          eventDate: sqliteDate(event.event_date),
          pdfUrl: cleanText(event.pdf_url ?? undefined),
        },
      })
      imported += 1
    } catch {
      // Skip events whose IPO does not exist in the target database.
    }
  }

  return imported
}

async function getSellRecords(recovery: RecoveryFile) {
  if (recovery.sellRecords?.length) return recovery.sellRecords

  try {
    const raw = await readFile(sellRecordsPath, 'utf8')
    const parsed = JSON.parse(raw) as { sellRecords?: LegacySellRecord[] }
    return parsed.sellRecords ?? []
  } catch {
    return []
  }
}

async function importSellRecords(sellRecords: LegacySellRecord[]) {
  let imported = 0

  for (const sellRecord of sellRecords) {
    try {
      await prisma.sellRecord.upsert({
        where: { id: sellRecord.id },
        create: {
          id: sellRecord.id,
          accountIpoId: sellRecord.subscriptionId,
          price: numberOrZero(sellRecord.price),
          date: nullableDate(sellRecord.date),
          shares: numberOrZero(sellRecord.shares),
          method: cleanText(sellRecord.method),
          remarks: cleanText(sellRecord.remarks),
          createdAt: dateOrNow(sellRecord.createdAt),
          updatedAt: dateOrNow(sellRecord.updatedAt),
        },
        update: {
          accountIpoId: sellRecord.subscriptionId,
          price: numberOrZero(sellRecord.price),
          date: nullableDate(sellRecord.date),
          shares: numberOrZero(sellRecord.shares),
          method: cleanText(sellRecord.method),
          remarks: cleanText(sellRecord.remarks),
          updatedAt: dateOrNow(sellRecord.updatedAt),
        },
      })
      imported += 1
    } catch {
      // Skip sell records whose account IPO record does not exist.
    }
  }

  return imported
}

async function importWithdrawals(withdrawals: LegacyWithdrawal[]) {
  let imported = 0

  for (const withdrawal of withdrawals) {
    try {
      await prisma.withdrawal.upsert({
        where: { id: withdrawal.id },
        create: {
          id: withdrawal.id,
          accountId: withdrawal.accountId,
          date: nullableDate(withdrawal.date),
          amount: numberOrZero(withdrawal.amount),
          remarks: cleanText(withdrawal.remarks),
          createdAt: dateOrNow(withdrawal.createdAt),
          updatedAt: dateOrNow(withdrawal.updatedAt),
        },
        update: {
          accountId: withdrawal.accountId,
          date: nullableDate(withdrawal.date),
          amount: numberOrZero(withdrawal.amount),
          remarks: cleanText(withdrawal.remarks),
          updatedAt: dateOrNow(withdrawal.updatedAt),
        },
      })
      imported += 1
    } catch {
      // Skip withdrawals whose account does not exist.
    }
  }

  return imported
}

async function importExchangeRecords(exchangeRecords: LegacyExchangeRecord[]) {
  let imported = 0

  for (const record of exchangeRecords) {
    try {
      await prisma.exchangeRecord.upsert({
        where: { id: record.id },
        create: {
          id: record.id,
          accountId: record.accountId,
          date: nullableDate(record.date),
          sourceCurrency: cleanText(record.sourceCurrency) ?? 'CNY',
          sourceAmount: numberOrZero(record.sourceAmount),
          sourceAmountCny: numberOrZero(record.sourceAmountCny),
          targetCurrency: cleanText(record.targetCurrency) ?? 'HKD',
          targetAmount: numberOrZero(record.targetAmount),
          exchangeRate: numberOrZero(record.exchangeRate),
          manualRate: nullableNumber(record.manualRate ?? undefined),
          originalCostCny: numberOrZero(record.originalCostCny),
          feeCny: numberOrZero(record.feeCny),
          channel: cleanText(record.channel),
          remarks: cleanText(record.remarks),
          createdAt: dateOrNow(record.createdAt),
          updatedAt: dateOrNow(record.updatedAt),
        },
        update: {
          accountId: record.accountId,
          date: nullableDate(record.date),
          sourceCurrency: cleanText(record.sourceCurrency) ?? 'CNY',
          sourceAmount: numberOrZero(record.sourceAmount),
          sourceAmountCny: numberOrZero(record.sourceAmountCny),
          targetCurrency: cleanText(record.targetCurrency) ?? 'HKD',
          targetAmount: numberOrZero(record.targetAmount),
          exchangeRate: numberOrZero(record.exchangeRate),
          manualRate: nullableNumber(record.manualRate ?? undefined),
          originalCostCny: numberOrZero(record.originalCostCny),
          feeCny: numberOrZero(record.feeCny),
          channel: cleanText(record.channel),
          remarks: cleanText(record.remarks),
          updatedAt: dateOrNow(record.updatedAt),
        },
      })
      imported += 1
    } catch {
      // Skip exchange records whose account does not exist.
    }
  }

  return imported
}

function cleanText(value: string | undefined) {
  const text = value?.trim()
  return text ? text : undefined
}

function numberOrZero(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0
}

function nullableNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : undefined
}

function nullableInteger(value: number | undefined) {
  return Number.isInteger(value) ? Number(value) : undefined
}

function nullableDate(value: string | undefined) {
  if (!value) {
    return undefined
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function dateOrNow(value: string | undefined) {
  return nullableDate(value) ?? new Date()
}

function sqliteDate(value: string | number | undefined | null) {
  if (typeof value === 'number') {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000
    return new Date(milliseconds)
  }
  return nullableDate(value ?? undefined) ?? new Date()
}

function sqliteDateOrUndefined(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === '') return undefined
  return sqliteDate(value)
}

function normalizeCode(value: string) {
  return value.trim().padStart(5, '0')
}

function subscriptionMethodToMultiple(value: string | undefined) {
  return isFinancing(value) ? 10 : 1
}

function isFinancing(value: string | undefined) {
  return (value ?? '').toLowerCase().includes('10x')
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
