import { useEffect, useState, type ReactNode } from 'react'

interface CountUpNumberProps {
  value: number
  format: (value: number) => string
  render?: (formatted: string, value: number) => ReactNode
  className?: string
  duration?: number
}

export function CountUpNumber({
  value,
  format,
  render,
  className,
  duration = 650,
}: CountUpNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReducedMotion) {
      setDisplayValue(value)
      return
    }

    const startValue = displayValue
    const delta = value - startValue
    const startTime = performance.now()
    let frame = 0

    const tick = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(startValue + delta * eased)
      if (progress < 1) frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return (
    <span className={className}>
      {render ? render(format(displayValue), displayValue) : format(displayValue)}
    </span>
  )
}
