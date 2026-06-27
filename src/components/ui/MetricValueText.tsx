interface MetricValueTextProps {
  value: string
  numericValue?: number
  tone?: 'profit' | 'cost' | 'rate' | 'win' | 'count' | 'neutral'
  className?: string
}

export function MetricValueText({
  value,
  numericValue,
  tone = 'neutral',
  className = '',
}: MetricValueTextProps) {
  const toneClass = {
    profit: 'text-[#EF4444]',
    cost: 'text-[#10B981]',
    rate: 'text-[#7C3AED]',
    win: 'text-[#F59E0B]',
    count: 'text-[#2563EB]',
    neutral: 'text-[#111827]',
  }[tone]

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
            negative ? 'text-red-500' : toneClass
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
        className={`rate-number ${negative ? 'text-red-500' : toneClass} ${className}`}
      >
        {value}
      </span>
    )
  }

  return <span className={`rate-number ${toneClass} ${className}`}>{value}</span>
}
