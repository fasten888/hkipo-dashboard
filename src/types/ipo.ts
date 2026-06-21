export interface Ipo {
  id: string
  name: string
  stockCode: string
  issuePrice: number
  lotSize: number
  subscriptionDate: string
  listingDate: string
  industry: string
  /** Legacy backup compatibility. New records only use industry. */
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export type IpoInput = Pick<
  Ipo,
  | 'name'
  | 'stockCode'
  | 'issuePrice'
  | 'lotSize'
  | 'subscriptionDate'
  | 'listingDate'
  | 'industry'
>
