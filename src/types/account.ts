import type { SubscriptionMethod } from './subscription'

export interface Account {
  id: string
  name: string
  accountSuffix: string
  phone: string
  brokerName: string
  securitiesAccount: string
  initialDeposit: number
  currentAssets: number
  cashBalance?: number
  exchangeRecordId?: string
  defaultSubscriptionMethod?: SubscriptionMethod
  legacyParticipationCount: number
  legacyWinCount: number
  remarks: string
  createdAt: string
  updatedAt: string
}

export type AccountInput = Pick<
  Account,
  | 'name'
  | 'accountSuffix'
  | 'phone'
  | 'brokerName'
  | 'securitiesAccount'
  | 'initialDeposit'
  | 'currentAssets'
  | 'cashBalance'
  | 'exchangeRecordId'
  | 'defaultSubscriptionMethod'
  | 'remarks'
>

export interface AccountStats {
  participationCount: number
  winCount: number
  winRate: number
  totalProfit: number
  profitRate: number
  withdrawalTotal: number
  actualProfit: number
}
