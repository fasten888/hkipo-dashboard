interface MetricValueTextProps {
  value: string
  numericValue?: number
  className?: string
}

export function MetricValueText({
  value,
  numericValue,
  className = '',
}: MetricValueTextProps) {
  if (value.startsWith('HK$')) {
    const amount = value.replace(/^HK\$\s*/, '')
    const compact = amount.replace(/[^\d]/g, '').length >= 8
    const negative =
      numericValue !== undefined ? numericValue < 0 : amount.includes('-')

    return (
      <span className={`amount-line ${className}`}>
        <span className="amount-prefix">HK$</span>
        <span
          className={`amount-number ${compact ? 'amount-number-compact' : ''} ${
            negative ? 'text-red-500' : 'text-slate-950'
          }`}
        >
          {amount}
        </span>
      </span>
    )
  }

  if (value.endsWith('%')) {
    const negative =
      numericValue !== undefined ? numericValue < 0 : value.startsWith('-')
    return (
      <span
        className={`rate-number ${negative ? 'text-red-500' : 'text-slate-950'} ${className}`}
      >
        {value}
      </span>
    )
  }

  return <span className={`rate-number ${className}`}>{value}</span>
}
