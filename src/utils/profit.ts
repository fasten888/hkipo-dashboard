export type ProfitColorVariant = 'text' | 'background' | 'hex'

const profitColors = {
  positive: {
    text: 'text-red-500',
    background: 'bg-red-500',
    hex: '#ef4444',
  },
  negative: {
    text: 'text-green-500',
    background: 'bg-green-500',
    hex: '#22c55e',
  },
  neutral: {
    text: 'text-slate-400',
    background: 'bg-slate-300',
    hex: '#94a3b8',
  },
} as const

export function getProfitColor(
  value: number,
  variant: ProfitColorVariant = 'text',
) {
  const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
  return profitColors[tone][variant]
}
