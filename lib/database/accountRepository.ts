import { prisma } from './prisma.js'

export type AccountStatus = 'active' | 'disabled'

export type AccountManagementInput = {
  name: string
  broker?: string | null
  brokerName?: string | null
  brokerProfileId?: string | null
  accountSuffix?: string | null
  phone?: string | null
  securitiesAccount?: string | null
  initialDeposit?: number | null
  currentAssets?: number | null
  cashBalance?: number | null
  defaultSubscriptionMethod?: string | null
  remarks?: string | null
  currency?: string | null
  cash?: number | null
  frozen?: number | null
  marginLimit?: number | null
  availableMargin?: number | null
  financingMultiple?: number | null
  status?: AccountStatus | string | null
  note?: string | null
}

export type BrokerProfileInput = {
  id?: string
  name: string
  defaultMarginMultiple?: number | null
  defaultFee?: number | null
  defaultFinancingRate?: number | null
}

export type ImportedAccountRow = {
  name?: string
  broker?: string
  currency?: string
  cash?: number
  frozen?: number
  financingMultiple?: number
  status?: string
  note?: string
}

type NormalizedImportedAccountRow = ReturnType<typeof normalizeImportedRow>
type ValidImportedAccountRow = NormalizedImportedAccountRow & { name: string }

export async function getAccountManagementData() {
  const [accounts, brokerProfiles] = await Promise.all([
    prisma.account.findMany({
      orderBy: [{ status: 'asc' }, { cash: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { accountIpos: true },
        },
        brokerProfile: true,
        accountIpos: {
          include: { ipo: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    }),
    prisma.brokerProfile.findMany({
      orderBy: [{ name: 'asc' }],
    }),
  ])

  return {
    accounts,
    brokerProfiles,
    summary: {
      accounts: accounts.length,
      activeAccounts: accounts.filter((account) => account.status === 'active').length,
      disabledAccounts: accounts.filter((account) => account.status === 'disabled').length,
      cash: sum(accounts, (account) => account.cash),
      frozen: sum(accounts, (account) => account.frozen),
      marginLimit: sum(accounts, (account) => account.marginLimit),
      availableMargin: sum(accounts, (account) => account.availableMargin || account.marginLimit),
    },
  }
}

export async function createAccount(input: AccountManagementInput) {
  const normalized = normalizeAccountInput(input)
  const brokerProfile = await resolveBrokerProfile(normalized.brokerProfileId, normalized.broker)

  return prisma.account.create({
    data: {
      ...normalized,
      brokerProfileId: brokerProfile?.id ?? null,
      broker: normalized.broker || brokerProfile?.name || null,
      financingMultiple:
        input.financingMultiple ?? brokerProfile?.defaultMarginMultiple ?? normalized.financingMultiple,
    },
    include: { brokerProfile: true },
  })
}

export async function updateAccount(id: string, input: AccountManagementInput) {
  const normalized = normalizeAccountInput(input)
  const brokerProfile = await resolveBrokerProfile(normalized.brokerProfileId, normalized.broker)

  return prisma.account.update({
    where: { id },
    data: {
      ...normalized,
      brokerProfileId: brokerProfile?.id ?? null,
      broker: normalized.broker || brokerProfile?.name || null,
      financingMultiple:
        input.financingMultiple ?? brokerProfile?.defaultMarginMultiple ?? normalized.financingMultiple,
    },
    include: { brokerProfile: true },
  })
}

export async function deleteAccount(id: string) {
  return prisma.account.delete({
    where: { id },
  })
}

export async function setAccountStatus(id: string, status: AccountStatus) {
  return prisma.account.update({
    where: { id },
    data: { status },
    include: { brokerProfile: true },
  })
}

export async function saveBrokerProfile(input: BrokerProfileInput) {
  const name = input.name.trim()
  if (!name) throw new Error('Broker profile name is required.')

  const data = {
    name,
    defaultMarginMultiple: numberOrDefault(input.defaultMarginMultiple, 10),
    defaultFee: numberOrDefault(input.defaultFee, 100),
    defaultFinancingRate: numberOrDefault(input.defaultFinancingRate, 0),
  }

  if (input.id) {
    return prisma.brokerProfile.update({
      where: { id: input.id },
      data,
    })
  }

  return prisma.brokerProfile.upsert({
    where: { name },
    update: data,
    create: data,
  })
}

export async function deleteBrokerProfile(id: string) {
  return prisma.brokerProfile.delete({
    where: { id },
  })
}

export async function importAccountBalances(rows: ImportedAccountRow[]) {
  const validRows = rows
    .map(normalizeImportedRow)
    .filter((row): row is ValidImportedAccountRow => Boolean(row.name))

  let created = 0
  let updated = 0

  await prisma.$transaction(async (tx) => {
    for (const row of validRows) {
      const existing = await tx.account.findFirst({
        where: {
          name: row.name,
          broker: row.broker || null,
        },
      })
      const brokerProfile = row.broker
        ? await tx.brokerProfile.upsert({
            where: { name: row.broker },
            update: {},
            create: { name: row.broker },
          })
        : null

      const data = {
        name: row.name,
        broker: row.broker || null,
        brokerProfileId: brokerProfile?.id ?? null,
        currency: row.currency || 'HKD',
        cash: numberOrDefault(row.cash, 0),
        frozen: numberOrDefault(row.frozen, 0),
        financingMultiple: numberOrDefault(
          row.financingMultiple,
          brokerProfile?.defaultMarginMultiple ?? 10,
        ),
        status: normalizeStatus(row.status),
        note: row.note || null,
      }

      if (existing) {
        await tx.account.update({
          where: { id: existing.id },
          data,
        })
        updated += 1
      } else {
        await tx.account.create({ data })
        created += 1
      }
    }
  })

  return {
    received: rows.length,
    imported: validRows.length,
    created,
    updated,
  }
}

function normalizeAccountInput(input: AccountManagementInput) {
  const name = input.name.trim()
  if (!name) throw new Error('Account name is required.')
  const broker = input.broker?.trim() || input.brokerName?.trim() || null
  const currentAssets = numberOrDefault(input.currentAssets, numberOrDefault(input.cash, 0))
  const cash = numberOrDefault(input.cashBalance, numberOrDefault(input.cash, currentAssets))

  return {
    name,
    broker,
    brokerProfileId: input.brokerProfileId || null,
    accountSuffix: input.accountSuffix?.trim() || null,
    phone: input.phone?.trim() || '',
    securitiesAccount: input.securitiesAccount?.trim() || null,
    initialDeposit: numberOrDefault(input.initialDeposit, 0),
    currentAssets,
    defaultSubscriptionMethod:
      input.defaultSubscriptionMethod === 'cash' ? 'cash' : '10x',
    currency: (input.currency?.trim() || 'HKD').toUpperCase(),
    cash,
    frozen: numberOrDefault(input.frozen, 0),
    marginLimit: numberOrDefault(input.marginLimit, 0),
    availableMargin: numberOrDefault(input.availableMargin, input.marginLimit ?? 0),
    financingMultiple: numberOrDefault(input.financingMultiple, 10),
    status: normalizeStatus(input.status),
    note: input.note?.trim() || input.remarks?.trim() || null,
  }
}

async function resolveBrokerProfile(profileId?: string | null, broker?: string | null) {
  if (profileId) {
    return prisma.brokerProfile.findUnique({ where: { id: profileId } })
  }
  if (!broker) return null
  return prisma.brokerProfile.upsert({
    where: { name: broker },
    update: {},
    create: { name: broker },
  })
}

function normalizeImportedRow(row: ImportedAccountRow) {
  return {
    name: row.name?.trim(),
    broker: row.broker?.trim(),
    currency: row.currency?.trim().toUpperCase() || 'HKD',
    cash: numberOrDefault(row.cash, 0),
    frozen: numberOrDefault(row.frozen, 0),
    financingMultiple: numberOrDefault(row.financingMultiple, 10),
    status: normalizeStatus(row.status),
    note: row.note?.trim() || '',
  }
}

function normalizeStatus(status?: string | null): AccountStatus {
  if (status === 'disabled' || status === '停用' || status === '禁用') return 'disabled'
  return 'active'
}

function numberOrDefault(value: number | null | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback
}

function sum<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((total, item) => total + pick(item), 0)
}
