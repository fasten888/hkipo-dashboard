type MetricCardProps = {
  label: string
  value: string
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A8A296]">{label}</p>
      <p className="mt-1 whitespace-nowrap text-sm font-bold text-[#4A4540] tabular-nums">{value}</p>
    </div>
  )
}
