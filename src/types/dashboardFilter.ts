export type DashboardRangePreset = '12m' | '6m' | '3m' | 'custom'

export interface DashboardFilter {
  accountId: string
  rangePreset: DashboardRangePreset
  customStartMonth: string
  customEndMonth: string
}

