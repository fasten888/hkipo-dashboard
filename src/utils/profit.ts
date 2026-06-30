export type ProfitColorVariant = 'text' | 'background' | 'hex'

/* 莫兰迪配色：
   positive(盈利) → 灰玫 #B08B7E
   negative(亏损) → 灰绿 #7E9587
   neutral(零)    → 米灰 #A8A296 */
const profitColors = {
  positive: {
    text: 'text-[#B08B7E]',
    background: 'bg-[#B08B7E]',
    hex: '#B08B7E',
  },
  negative: {
    text: 'text-[#7E9587]',
    background: 'bg-[#7E9587]',
    hex: '#7E9587',
  },
  neutral: {
    text: 'text-[#A8A296]',
    background: 'bg-[#D2CBBF]',
    hex: '#A8A296',
  },
} as const

export function getProfitColor(
  value: number,
  variant: ProfitColorVariant = 'text',
) {
  const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
  return profitColors[tone][variant]
}
