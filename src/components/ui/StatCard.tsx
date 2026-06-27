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
  blue: 'bg-[#DBEAFE] text-[#2563EB]',
  violet: 'bg-[#F3E8FF] text-[#7C3AED]',
  emerald: 'bg-[#DCFCE7] text-[#10B981]',
  amber: 'bg-[#FEF3C7] text-[#F59E0B]',
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
  return (
    <div className="group os-card os-card-hover relative min-w-0" title={tooltip}>
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] font-medium text-slate-400">{label}</p>
            {tooltip && <Info size={13} className="text-slate-300" />}
          </div>
          <p className="mt-5 min-w-0 overflow-hidden">
            <MetricValueText value={value} numericValue={profitValue} />
          </p>
          <p className="mt-3 text-[13px] font-normal leading-5 text-slate-400">
            {hint}
          </p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${toneStyles[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
      {tooltip && (
        <div className="pointer-events-none absolute bottom-[calc(100%-0.25rem)] left-5 z-30 hidden max-w-64 rounded-xl bg-slate-950 px-3 py-2 text-xs font-medium leading-5 text-white shadow-xl group-hover:block">
          {tooltip}
        </div>
      )}
    </div>
  )
}
