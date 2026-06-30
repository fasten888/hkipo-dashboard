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
  /* 莫兰迪配色 — tone → color */
  const toneClass = {
    profit:  'text-[#B08B7E]',   // 灰玫 — 收益类
    cost:    'text-[#7E9587]',   // 灰绿 — 成本类
    rate:    'text-[#8E87A6]',   // 灰紫 — 收益率
    win:     'text-[#BC9A5F]',   // 灰金 — 中签率
    count:   'text-[#8E87A6]',   // 灰紫 — 计数类（复用收益率色）
    neutral: 'text-[#4A4540]',   // 主文字
  }[tone]

  // 负数统一用更深的灰玫色表示（莫兰迪体系内没有强对比的"危险红"）
  const negativeClass = 'text-[#9A7468]'

  if (value.startsWith('HK$')) {
    const amount = value.replace(/^HK\$\s*/, '')
    const compact = amount.replace(/[^\d]/g, '').length >= 8
    const negative =
      numericValue !== undefined ? numericValue < 0 : amount.includes('-')

    return (
      <span className={`amount-line ${className}`}>
        <span className="amount-prefix" style={{ color: '#8C8273' }}>HK$</span>
        <span
          className={`amount-number ${compact ? 'amount-number-compact' : ''} ${
            negative ? negativeClass : toneClass
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
        className={`rate-number ${negative ? negativeClass : toneClass} ${className}`}
      >
        {value}
      </span>
    )
  }

  return <span className={`rate-number ${toneClass} ${className}`}>{value}</span>
}
