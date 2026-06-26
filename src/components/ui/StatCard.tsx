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
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
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
    <div className="group os-card os-card-hover relative min-w-0 p-5 sm:p-6" title={tooltip}>
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-slate-400">{label}</p>
            {tooltip && <Info size={13} className="text-slate-300" />}
          </div>
          <p className="mt-5 min-w-0 overflow-hidden">
            <MetricValueText value={value} numericValue={profitValue} />
          </p>
          <p className="mt-3 text-[13px] leading-5 text-slate-400">
            {hint}
          </p>
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl sm:h-11 sm:w-11 ${toneStyles[tone]}`}>
          <Icon size={19} />
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
