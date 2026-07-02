export type IpoRecord = {
  id: string
  code: string
  name: string
  status: string
  board?: string | null
  industry?: string | null
  offerPriceMin?: number | null
  offerPriceMax?: number | null
  lotSize?: number | null
  lotAmount?: number | null
  marginMultiple?: number | null
  subscribeStart?: Date | null
  subscribeEnd?: Date | null
  listingDate?: Date | null
}

export type AccountRecord = {
  id: string
  name: string
  broker?: string | null
  currency: string
  cash: number
  frozen: number
  marginLimit: number
  availableMargin: number
}

export type AccountIpoRecord = {
  id: string
  accountId: string
  ipoId: string
  applyLots: number
  applyAmount: number
  status: string
  commission: number
  financingFee: number
  profit: number
}
