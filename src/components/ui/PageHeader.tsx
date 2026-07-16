import type { ReactNode } from 'react'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="os-card flex flex-col gap-5 md:p-7 xl:flex-row xl:items-end xl:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B08B7E]">{eyebrow}</p>
        )}
        <h1 className="mt-3 text-[34px] font-bold tracking-[-0.05em] text-[#342F2B] md:text-[44px]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#8C8273] md:text-base">
          {description}
        </p>
      </div>
      {action}
    </header>
  )
}
