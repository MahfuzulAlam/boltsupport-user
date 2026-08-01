import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

/** Empty states invite an action rather than just reporting absence. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div
        className="mb-4 flex size-14 items-center justify-center rounded-lg"
        style={{ background: 'var(--muted)' }}
        aria-hidden="true"
      >
        <Icon className="size-6" style={{ color: 'var(--muted-foreground)' }} />
      </div>
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="mt-1.5 max-w-[46ch] text-[15px] text-[color:var(--muted-foreground)]">
        {description}
      </p>
      {action !== undefined ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
