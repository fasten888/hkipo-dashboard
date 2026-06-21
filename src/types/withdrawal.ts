export interface Withdrawal {
  id: string
  accountId: string
  date: string
  amount: number
  remarks: string
  createdAt: string
  updatedAt: string
}

export type WithdrawalInput = Pick<
  Withdrawal,
  'accountId' | 'date' | 'amount' | 'remarks'
>
