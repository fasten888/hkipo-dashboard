import { Info, type LucideIcon } from 'lucide-react'
import { MetricValueText } from './MetricValueText'

interface StatCardProps {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  tone: 'blue' | 'violet' | 'emerald' | 'amber'
  profitValue?: number
  tooltip?: string
}

/* 莫兰迪配色映射:
   blue(原)    → 灰紫 info  #8E87A6
   violet(原)  → 灰紫 info  #8E87A6（保持原语义"计数/比率"）
   emerald(原) → 灰玫 brand #B08B7E（收益类）/ 灰绿 success #7E9587（成本类，由调用方用 profitValue 区分）
   amber(原)   → 灰金 warning #BC9A5F
*/
const toneStyles = {
  blue:    { icon: 'bg-[#DAD7E0] text-[#8E87A6]', value: 'rate'   as const },
  violet:  { icon: 'bg-[#DAD7E0] text-[#8E87A6]', value: 'count'  as const },
  emerald: { icon: 'bg-[#E8D9D3] text-[#B08B7E]', value: 'profit' as const },
  amber:   { icon: 'bg-[#EFE3D2] text-[#BC9A5F]', value: 'win'    as const },
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  profitValue,
  tooltip,
}: StatCardProps) {
  const style = toneStyles[tone]

  return (
    <div className="os-card os-card-hover group relative min-w-0" title={tooltip}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium" style={{ color: '#8C8273' }}>{label}</p>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${style.icon}`}>
          <Icon size={18} />
        </span>
      </div>

      <div className="mt-4 min-w-0 overflow-hidden">
        <MetricValueText
          value={value}
          numericValue={profitValue}
          tone={style.value}
        />
      </div>

      <p className="mt-3 text-[12px] leading-5" style={{ color: '#A8A296' }}>
        {hint}
      </p>

      {tooltip && (
        <div className="pointer-events-none absolute bottom-[calc(100%-0.25rem)] left-5 z-30 hidden max-w-64 rounded-[10px] bg-[#4A4540] px-3 py-2 text-[11px] font-medium leading-5 text-white shadow-xl group-hover:block">
          {tooltip}
        </div>
      )}

      {tooltip && <Info size={12} className="absolute right-5 top-5 text-[#D2CBBF]" />}
    </div>
  )
}
