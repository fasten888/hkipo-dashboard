import type { Account } from './account'
import type { Ipo } from './ipo'
import type { Sale } from './sale'
import type {
  SellPlan,
  Subscription,
  SubscriptionStatus,
} from './subscription'
import type { Withdrawal } from './withdrawal'
import type { ExchangeRecord, FxRateSettings } from './exchange'
import type { Holding } from './holding'

export interface AllotmentExport {
  subscriptionId: string
  status: SubscriptionStatus
  allottedShares: number
  allottedLots: number
  issuePrice: number
  listingDate: string
  sellPlan: SellPlan
}

export interface AppBackup {
  version: 3
  exportedAt: string
  accounts: Account[]
  ipos: Ipo[]
  subscriptions: Subscription[]
  allotments: AllotmentExport[]
  sellRecords: Sale[]
  withdrawals: Withdrawal[]
  exchangeRecords?: ExchangeRecord[]
  fxRates?: FxRateSettings
  holdings?: Holding[]
}
