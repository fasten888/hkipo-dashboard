import { Info, type LucideIcon } from 'lucide-react'
import { getProfitColor } from '../../utils/profit'

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
  const profitClass =
    profitValue === undefined ? undefined : getProfitColor(profitValue)

  return (
    <div
      className="group relative min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5"
      title={tooltip}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            {tooltip && <Info size={13} className="text-slate-300" />}
          </div>
          <p
            className={`mt-2 break-words text-[clamp(1.25rem,5.8vw,1.75rem)] font-semibold leading-tight tracking-tight tabular-nums ${
              profitClass ?? 'text-slate-900'
            }`}
          >
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            {hint}
          </p>
        </div>
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl ${toneStyles[tone]}`}>
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
