export interface Holding {
  id: string
  accountId: string
  stockCode: string
  stockName: string
  quantity: number
  cost: number
  marketValue: number
  collateralRate: number
  remarks: string
  createdAt: string
  updatedAt: string
}

export type HoldingInput = Pick<
  Holding,
  | 'accountId'
  | 'stockCode'
  | 'stockName'
  | 'quantity'
  | 'cost'
  | 'marketValue'
  | 'collateralRate'
  | 'remarks'
>
