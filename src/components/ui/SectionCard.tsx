import type { ElementType, ReactNode } from 'react'

type SectionCardProps = {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  as?: ElementType
}

export function SectionCard({
  title,
  subtitle,
  children,
  className = '',
  as: Component = 'section',
}: SectionCardProps) {
  return (
    <Component className={`os-card ${className}`}>
      {(title || subtitle) && (
        <div className="mb-5">
          {title && <h2 className="text-xl font-bold tracking-[-0.03em] text-[#342F2B]">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm font-medium text-[#8C8273]">{subtitle}</p>}
        </div>
      )}
      {children}
    </Component>
  )
}
