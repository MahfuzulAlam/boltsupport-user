import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

/** Standard page heading: 24px title with tight tracking, optional description, right actions. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-[24px] font-semibold tracking-[-0.015em]">{title}</h1>
        {description !== undefined ? (
          <p className="mt-1 text-[15px] text-[color:var(--muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {actions !== undefined ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
