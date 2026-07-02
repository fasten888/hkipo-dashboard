import type {
  NormalizedIpoMasterRecord,
  ValidationIssue,
  ValidationResult,
} from './types'

const validStatuses = new Set([
  'unknown',
  'draft',
  'hearing',
  'subscribing',
  'pricing',
  'allotment',
  'listed',
  'withdrawn',
])

export function createIpoValidator() {
  return {
    validate(records: NormalizedIpoMasterRecord[]): ValidationResult<NormalizedIpoMasterRecord> {
      const valid: NormalizedIpoMasterRecord[] = []
      const invalid: ValidationResult<NormalizedIpoMasterRecord>['invalid'] = []

      for (const record of records) {
        const issues = validateRecord(record)

        if (issues.some((issue) => issue.severity === 'error')) {
          invalid.push({ record, issues })
        } else {
          valid.push(record)
        }
      }

      return { valid, invalid }
    },
  }
}

function validateRecord(record: NormalizedIpoMasterRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!record.code) {
    issues.push({ field: 'code', message: 'Stock code is required.', severity: 'error' })
  }

  if (record.code && !/^\d{4,5}$/.test(record.code)) {
    issues.push({ field: 'code', message: 'Stock code must be 4-5 digits.', severity: 'error' })
  }

  if (!record.name) {
    issues.push({ field: 'name', message: 'IPO name is required.', severity: 'error' })
  }

  if (!validStatuses.has(record.status)) {
    issues.push({ field: 'status', message: 'IPO status is not supported.', severity: 'error' })
  }

  validateNonNegative(record.subscription?.offerPriceMin, 'offerPriceMin', issues)
  validateNonNegative(record.subscription?.offerPriceMax, 'offerPriceMax', issues)
  validateNonNegative(record.subscription?.finalOfferPrice, 'finalOfferPrice', issues)
  validateNonNegative(record.subscription?.lotSize, 'lotSize', issues)
  validateNonNegative(record.subscription?.lotAmount, 'lotAmount', issues)

  for (const event of record.timeline ?? []) {
    if (!(event.eventAt instanceof Date) || Number.isNaN(event.eventAt.getTime())) {
      issues.push({
        field: 'timeline.eventAt',
        message: 'Timeline event date is invalid.',
        severity: 'error',
      })
    }
  }

  return issues
}

function validateNonNegative(
  value: number | undefined,
  field: string,
  issues: ValidationIssue[],
) {
  if (value !== undefined && value < 0) {
    issues.push({ field, message: 'Amount must not be negative.', severity: 'error' })
  }
}
