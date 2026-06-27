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

const toneStyles = {
  blue:    { icon: 'bg-[#DBEAFE] text-[#2563EB]', value: 'count'  as const },
  violet:  { icon: 'bg-[#F3E8FF] text-[#7C3AED]', value: 'rate'   as const },
  emerald: { icon: 'bg-[#DCFCE7] text-[#10B981]', value: 'profit' as const },
  amber:   { icon: 'bg-[#FEF3C7] text-[#F59E0B]', value: 'win'    as const },
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
        <p className="text-[13px] font-medium" style={{ color: '#6B7280' }}>{label}</p>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${style.icon}`}>
          <Icon size={18} />
        </span>
      </div>

      <div className="mt-4 min-w-0 overflow-hidden">
        <MetricValueText
          value={value}
          numericValue={profitValue}
          tone={profitValue !== undefined ? (profitValue >= 0 ? style.value : 'profit') : style.value}
        />
      </div>

      <p className="mt-3 text-[12px] leading-5" style={{ color: '#9CA3AF' }}>
        {hint}
      </p>

      {tooltip && (
        <div className="pointer-events-none absolute bottom-[calc(100%-0.25rem)] left-5 z-30 hidden max-w-64 rounded-[10px] bg-[#111827] px-3 py-2 text-[11px] font-medium leading-5 text-white shadow-xl group-hover:block">
          {tooltip}
        </div>
      )}

      {tooltip && <Info size={12} className="absolute right-5 top-5 text-[#D1D5DB]" />}
    </div>
  )
}
