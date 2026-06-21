export type HealthSeverity = 'high' | 'medium' | 'low'

export interface HealthIssue {
  id: string
  type: string
  severity: HealthSeverity
  title: string
  detail: string
  objectName: string
  fixable: boolean
}

export interface HealthRepairResult {
  fixedCount: number
  dataChanged: boolean
}
