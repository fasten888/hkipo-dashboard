import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { SortDirection } from '../../hooks/useThreeStateSort'

export function SortButton({
  label,
  direction,
  onClick,
}: {
  label: string
  direction?: SortDirection
  onClick: () => void
}) {
  const Icon =
    direction === 'asc'
      ? ArrowUp
      : direction === 'desc'
        ? ArrowDown
        : ChevronsUpDown

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[#F4F1ED]0 hover:text-[#2E2A24]"
      onClick={onClick}
    >
      {label}
      <Icon size={13} />
    </button>
  )
}
