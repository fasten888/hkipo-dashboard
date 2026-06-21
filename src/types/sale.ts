export type SaleMethod = 'grey_market' | 'first_day' | 'held_sale'

export interface Sale {
  id: string
  subscriptionId: string
  price: number
  date: string
  shares: number
  method: SaleMethod
  commission?: number
  remarks: string
  createdAt: string
  updatedAt: string
}

export type SaleInput = Pick<
  Sale,
  | 'subscriptionId'
  | 'price'
  | 'date'
  | 'shares'
  | 'method'
  | 'commission'
  | 'remarks'
>
