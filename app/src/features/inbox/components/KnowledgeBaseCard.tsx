import { Link } from 'react-router-dom'
import { BookOpen, ExternalLink, Lock } from 'lucide-react'
import type { Collection } from '@/types'

interface KnowledgeBaseCardProps {
  collections: Collection[]
  articleCount: number
  delayMs: number
}

/**
 * Sits on the muted surface rather than the card surface, which is what separates it from the
 * inboxes without needing a heading or a divider.
 */
export function KnowledgeBaseCard({ collections, articleCount, delayMs }: KnowledgeBaseCardProps) {
  const domain = collections[0]?.domain ?? 'docs.boltsupport.io'
  const hasPrivate = collections.some((collection) => collection.private)

  return (
    <section
      className="flex flex-col overflow-hidden rounded-lg border motion-safe:animate-[fadeup_160ms_ease-out_both]"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--muted)',
        animationDelay: `${String(delayMs)}ms`,
      }}
      aria-labelledby="kb-card-name"
    >
      <header className="flex items-start gap-2 px-4 pt-4 pb-3">
        <BookOpen
          className="mt-0.5 size-4 shrink-0"
          style={{ color: 'var(--muted-foreground)' }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2 id="kb-card-name" className="text-[16px] font-semibold tracking-[-0.01em]">
            Knowledge base
          </h2>
          <p className="truncate text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            {domain}
          </p>
        </div>
        {hasPrivate ? (
          <Lock
            className="size-4 shrink-0"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label="Contains a private collection"
            role="img"
          />
        ) : null}
      </header>

      <p className="px-4 pb-3 text-[13px]">
        <span className="font-mono font-medium">{articleCount}</span> articles,{' '}
        <span className="font-mono font-medium">{collections.length}</span> collections
      </p>

      <footer
        className="mt-auto flex items-center gap-2 border-t px-4 py-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <Link
          to="/docs"
          className="flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium hover:bg-[color:var(--hover)]"
          style={{ color: 'var(--brand)' }}
        >
          Open editor
        </Link>
        <Link
          to="/docs"
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] hover:bg-[color:var(--hover)]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Preview site
          <ExternalLink className="size-3.5" />
        </Link>
      </footer>
    </section>
  )
}
