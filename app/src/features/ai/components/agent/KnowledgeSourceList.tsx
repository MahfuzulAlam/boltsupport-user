import { AlertTriangle, FileText, Globe, ShieldAlert, Trash2 } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { Button } from '@/components/ui/button'
import type { KnowledgeSource } from '@/types'

const STATUS_STYLE: Record<KnowledgeSource['status'], { bg: string; fg: string; label: string }> = {
  queued: { bg: 'var(--muted)', fg: 'var(--muted-foreground)', label: 'Queued' },
  crawling: { bg: 'var(--brand-soft)', fg: 'var(--brand)', label: 'Crawling' },
  indexed: { bg: 'var(--success-soft)', fg: 'var(--success-strong)', label: 'Indexed' },
  failed: { bg: 'var(--danger-soft)', fg: 'var(--danger-strong)', label: 'Failed' },
}

const TYPE_ICON = { website: Globe, docs: FileText, snippet: FileText }

interface KnowledgeSourceListProps {
  sources: KnowledgeSource[]
  onRemove?: (id: string) => void
  onResync?: (id: string) => void
  /** The console shows sync controls; the wizard only needs the list. */
  showActions?: boolean
}

/**
 * The indexed sources, with what went wrong on each.
 *
 * Two things get their own row treatment rather than a status chip. A failed crawl is silent
 * otherwise: the agent simply knows less than the operator thinks it does. And a source where
 * instructions were found in the crawled content is not an error at all, it is the sanitizer
 * working, which is exactly what AI-3 requires the UI to say out loud.
 */
export function KnowledgeSourceList({
  sources,
  onRemove,
  onResync,
  showActions = true,
}: KnowledgeSourceListProps) {
  if (sources.length === 0) {
    return (
      <p className="py-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
        No sources yet. The agent can only answer from content you add here.
      </p>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      {sources.map((source) => {
        const style = STATUS_STYLE[source.status]
        const Icon = TYPE_ICON[source.type]
        return (
          <div
            key={source.id}
            className="border-b last:border-b-0"
            style={{ borderColor: 'var(--border)' }}
          >
            {/* The name keeps the width it needs; the metadata drops to its own line on a
                narrow screen rather than squeezing "docs.boltsupport.io" down to "d." */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-[13px]">
              <Icon
                className="size-4 shrink-0"
                style={{ color: 'var(--muted-foreground)' }}
                aria-hidden="true"
              />
              <span className="min-w-[140px] flex-1 truncate font-medium">{source.label}</span>

              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[12px] font-medium"
                style={{ background: style.bg, color: style.fg }}
              >
                {style.label}
              </span>

              <span className="shrink-0 font-mono" style={{ color: 'var(--muted-foreground)' }}>
                {source.pages} {source.pages === 1 ? 'page' : 'pages'}
              </span>

              <span className="shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                {source.lastSyncAt === undefined
                  ? '—'
                  : `${formatDistanceToNowStrict(new Date(source.lastSyncAt))} ago`}
              </span>

              {showActions ? (
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  {onResync !== undefined ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onResync(source.id)
                      }}
                    >
                      Resync
                    </Button>
                  ) : null}
                  {onRemove !== undefined ? (
                    <button
                      type="button"
                      onClick={() => {
                        onRemove(source.id)
                      }}
                      aria-label={`Remove ${source.label}`}
                      className="flex size-8 items-center justify-center rounded-md"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </span>
              ) : null}
            </div>

            {source.status === 'failed' ? (
              <p
                className="flex items-start gap-2 px-3 pb-2.5 text-[12px]"
                style={{ color: 'var(--danger-strong)' }}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  This source did not index. The agent cannot answer from it, and will escalate
                  questions it would have covered.
                </span>
              </p>
            ) : null}

            {source.injectionDetected ? (
              <p
                className="flex items-start gap-2 px-3 pb-2.5 text-[12px]"
                style={{ color: 'var(--warning-strong)' }}
              >
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Instructions found in crawled content were ignored. The page is indexed as
                  information, never as direction for the agent.
                </span>
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
