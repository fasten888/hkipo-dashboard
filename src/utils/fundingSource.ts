import type { FundingSource } from '../types/subscription'

export const FUNDING_SOURCE_OPTIONS: {
  value: FundingSource
  label: string
}[] = [
  { value: 'cash', label: '现金' },
  { value: 'financing', label: '融资' },
  { value: 'collateral', label: '股票抵押融资' },
  { value: 'mixed', label: '混合' },
]

export function getFundingSourceLabel(source: FundingSource) {
  return (
    FUNDING_SOURCE_OPTIONS.find((option) => option.value === source)?.label ??
    source
  )
}
