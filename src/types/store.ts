import type { Account } from './account'
import type { Ipo } from './ipo'
import type { Sale } from './sale'
import type { Subscription } from './subscription'
import type { Withdrawal } from './withdrawal'
import type { ExchangeRecord, FxRateSettings } from './exchange'
import type { Holding } from './holding'

export interface AppData {
  version: 3
  accounts: Account[]
  ipos: Ipo[]
  subscriptions: Subscription[]
  sales: Sale[]
  withdrawals: Withdrawal[]
  exchangeRecords: ExchangeRecord[]
  fxRates: FxRateSettings
  holdings: Holding[]
}
