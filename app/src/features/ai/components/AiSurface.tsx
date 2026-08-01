import { Sparkles } from 'lucide-react'
import { ProvenanceRail } from '@/components/ProvenanceRail'
import { cn } from '@/lib/utils'

interface AiSurfaceProps {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
  /** Internal-only output carries this so it can never be mistaken for customer facing (AI-6). */
  internal?: boolean
  className?: string
}

/**
 * Every AI surface goes through here.
 *
 * AI-5 requires AI content to use the reserved violet accent and sparkle and never be styled ad
 * hoc. Centralising it means an agent learns one visual rule once, and a new AI feature cannot
 * accidentally look like ordinary product chrome.
 */
export function AiSurface({
  title,
  children,
  actions,
  internal = true,
  className,
}: AiSurfaceProps) {
  return (
    <section
      data-ai-generated="true"
      data-internal={internal ? 'true' : undefined}
      className={cn('mb-3 flex rounded-lg border', className)}
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      aria-label={title}
    >
      <ProvenanceRail provenance="ai" flush />
      <div className="min-w-0 flex-1 p-3.5">
        <header className="mb-2 flex items-center gap-2">
          <Sparkles className="size-4 shrink-0" style={{ color: 'var(--ai)' }} aria-hidden="true" />
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--ai)' }}>
            {title}
          </h3>
          {actions !== undefined ? (
            <div className="ml-auto flex items-center gap-1">{actions}</div>
          ) : null}
        </header>
        {children}
      </div>
    </section>
  )
}
