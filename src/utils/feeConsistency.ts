export type FeeRecord = {
  id: string
  commission: number
  financingFee: number
}

export function getTotalFee(record: FeeRecord) {
  if (record.financingFee > 0 && record.commission === record.financingFee) {
    console.warn('[FeeWarning] financingFee duplicates commission', record.id)

    const error = new Error(
      `[FeeWarning] financingFee duplicates commission: ${record.id}`,
    )
    const reportError = (globalThis as { reportError?: (error: Error) => void }).reportError

    if (reportError) {
      reportError(error)
    } else {
      console.error(error)
    }
  }

  return record.commission + record.financingFee
}
