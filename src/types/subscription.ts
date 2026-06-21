export type SubscriptionStatus = 'applied' | 'announced' | 'won' | 'lost'
export type SubscriptionMethod = 'cash' | '10x'
export type SellPlan = 'grey_market' | 'first_day' | 'hold'
export type FundingSource =
  | 'cash'
  | 'financing'
  | 'collateral'
  | 'mixed'

export interface Subscription {
  id: string
  accountId: string
  ipoId: string
  method: SubscriptionMethod
  subscriptionMethod?: SubscriptionMethod
  subscriptionAmount: number
  fee: number
  subscriptionDate: string
  remarks: string
  status: SubscriptionStatus
  allottedShares: number
  allottedLots: number
  sellPlan: SellPlan
  fundingSource: FundingSource
  createdAt: string
  updatedAt: string
}

export type SubscriptionInput = Pick<
  Subscription,
  | 'accountId'
  | 'ipoId'
  | 'method'
  | 'subscriptionMethod'
  | 'subscriptionAmount'
  | 'fee'
  | 'subscriptionDate'
  | 'remarks'
  | 'status'
  | 'allottedShares'
  | 'allottedLots'
  | 'sellPlan'
  | 'fundingSource'
>

export interface BatchDateChange {
  mode: 'set' | 'shift'
  value: string | number
}

export interface BatchRemarksChange {
  mode: 'append' | 'clear' | 'replace'
  value?: string
}

export interface SubscriptionBatchChanges {
  method?: SubscriptionMethod
  subscriptionDate?: BatchDateChange
  listingDate?: BatchDateChange
  remarks?: BatchRemarksChange
}
