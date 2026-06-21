export type ExchangeCurrency = 'CNY' | 'HKD' | 'USD'
export type ExchangeChannel =
  | 'boc_hk'
  | 'za_bank'
  | 'futu'
  | 'chief'
  | 'cash'
  | 'other'

export interface ExchangeRecord {
  id: string
  accountId: string
  date: string
  sourceCurrency: ExchangeCurrency
  sourceAmount: number
  sourceAmountCny: number
  targetCurrency: ExchangeCurrency
  targetAmount: number
  exchangeRate: number
  manualRate: number | null
  originalCostCny: number
  feeCny: number
  channel: ExchangeChannel
  remarks: string
  createdAt: string
  updatedAt: string
}

export type ExchangeRecordInput = Pick<
  ExchangeRecord,
  | 'accountId'
  | 'date'
  | 'sourceCurrency'
  | 'sourceAmount'
  | 'sourceAmountCny'
  | 'targetCurrency'
  | 'targetAmount'
  | 'exchangeRate'
  | 'manualRate'
  | 'originalCostCny'
  | 'feeCny'
  | 'channel'
  | 'remarks'
>

export interface FxRateSettings {
  HKD: number
  USD: number
  updatedAt: string
}

export const EMPTY_FX_RATES: FxRateSettings = {
  HKD: 0,
  USD: 0,
  updatedAt: '',
}
