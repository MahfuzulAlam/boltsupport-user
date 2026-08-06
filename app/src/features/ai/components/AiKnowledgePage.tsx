import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ApiError } from '@/lib/api-client'
import { aiFeatureSchema, type AiFeature, type KnowledgeBase, type KnowledgeKind } from '@/types'
import { createKnowledge, deleteKnowledge, fetchKnowledge, patchKnowledge } from '../api/ai'
import { FEATURE_LABEL, KINDS, KIND_META } from '../knowledge-meta'
import { KnowledgeDetail } from './KnowledgeDetail'

const STATUS_STYLE: Record<KnowledgeBase['status'], { label: string; bg: string; fg: string }> = {
  ready: { label: 'Ready', bg: 'var(--success-soft)', fg: 'var(--success-strong)' },
  indexing: { label: 'Indexing', bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
  draft: { label: 'Empty', bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
  failed: { label: 'Failed', bg: 'var(--danger-soft)', fg: 'var(--danger-strong)' },
}

function SourceCard({
  source,
  onOpen,
  onDelete,
}: {
  source: KnowledgeBase
  onOpen: () => void
  onDelete: () => void
}) {
  const meta = KIND_META[source.kind]
  const status = STATUS_STYLE[source.status]
  const Icon = meta.icon

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      <div className="mb-2 flex items-start gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'var(--muted)' }}
        >
          <Icon className="size-[18px]" style={{ color: 'var(--ai)' }} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 truncate text-[15px] font-semibold">{source.label}</h3>
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium"
              style={{ background: status.bg, color: status.fg }}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            {source.description === '' ? meta.blurb : source.description}
          </p>
        </div>

        <button
          type="button"
          aria-label={`Remove ${source.label}`}
          onClick={onDelete}
          className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-[color:var(--hover)]"
        >
          <Trash2 className="size-4" style={{ color: 'var(--muted-foreground)' }} />
        </button>
      </div>

      {/*
       * Untrusted text is called out on the source, not only where it is quoted.
       *
       * A crawled page can carry instructions aimed at the model. It still indexes, as data, but
       * somebody deciding which features may read this deserves to know before they decide
       * (AI-2, AI-3).
       */}
      {source.injectionDetected ? (
        <p
          className="mb-2.5 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-[12px]"
          style={{ background: 'var(--warning-soft)', color: 'var(--warning-strong)' }}
        >
          <ShieldAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          This source contains text that tries to instruct the AI. It is indexed as data and those
          instructions are ignored.
        </p>
      ) : null}

      <div
        className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <span className="font-mono">
          {source.itemCount} {meta.unit}
        </span>
        {source.lastIndexedAt === undefined ? (
          <span>Never indexed</span>
        ) : (
          <span className="flex items-center gap-1">
            <RefreshCw className="size-3" aria-hidden="true" />
            Indexed {formatDistanceToNowStrict(new Date(source.lastIndexedAt), { addSuffix: true })}
          </span>
        )}
        {source.url === undefined ? null : <span className="truncate">{source.url}</span>}
      </div>

      <div className="mb-3">
        <p className="eyebrow mb-1.5">Read by</p>
        {source.usedBy.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            No feature yet. Stored and indexed, but nothing is reading it.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {source.usedBy.map((feature) => (
              <span
                key={feature}
                className="rounded-[10px] px-2 py-0.5 text-[12px]"
                style={{ background: 'var(--ai-soft)', color: 'var(--ai)' }}
              >
                {FEATURE_LABEL[feature]}
              </span>
            ))}
          </div>
        )}
      </div>

      <Button variant="outline" size="sm" onClick={onOpen}>
        Open
      </Button>
    </div>
  )
}

/**
 * One place that answers "what does the AI know".
 *
 * Before this, the customer facing agent had its own list of sources and Auto Draft had a single
 * `useKnowledgeBase` boolean, so the question had two different answers depending on which screen
 * you asked it from, and neither screen mentioned the other. Every feature now reads from this
 * one list, and which features may read a given source is a property of the source rather than
 * something each feature decides for itself.
 */
export function AiKnowledgePage() {
  const queryClient = useQueryClient()
  const sources = useQuery({
    queryKey: ['ai-knowledge'],
    queryFn: ({ signal }) => fetchKnowledge(signal),
  })
  const [openId, setOpenId] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ai-knowledge'] })

  const create = useMutation({
    mutationFn: (kind: KnowledgeKind) =>
      createKnowledge({ kind, label: KIND_META[kind].label, description: KIND_META[kind].blurb }),
    onSuccess: async (source) => {
      await invalidate()
      setOpenId(source.id)
    },
    onError: (error) => {
      toast('Could not add that source', {
        description: error instanceof ApiError ? error.userMessage : 'Try again in a moment.',
      })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteKnowledge(id),
    onSuccess: async () => {
      setOpenId(null)
      await invalidate()
      toast('Source removed', { description: 'No feature reads it any more.' })
    },
  })

  const scope = useMutation({
    mutationFn: ({ id, usedBy }: { id: string; usedBy: AiFeature[] }) =>
      patchKnowledge(id, { usedBy }),
    onSuccess: invalidate,
  })

  const list = sources.data ?? []
  const missing = KINDS.filter((kind) => !list.some((source) => source.kind === kind))
  const open = list.find((source) => source.id === openId)

  if (open !== undefined) {
    return (
      <KnowledgeDetail
        source={open}
        onBack={() => {
          setOpenId(null)
        }}
        onScope={(usedBy) => {
          scope.mutate({ id: open.id, usedBy })
        }}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 pt-6 pb-10">
      <PageHeader
        title="Knowledge"
        description="What every AI feature is allowed to read. Changing something here changes all of them at once."
        actions={
          missing.length === 0 ? undefined : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="size-3.5" />
                  Add a source
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[280px]">
                {missing.map((kind) => (
                  <DropdownMenuItem
                    key={kind}
                    onSelect={() => {
                      create.mutate(kind)
                    }}
                  >
                    {KIND_META[kind].addLabel}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />

      {sources.isPending ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onOpen={() => {
                setOpenId(source.id)
              }}
              onDelete={() => {
                remove.mutate(source.id)
              }}
            />
          ))}
        </div>
      )}

      {missing.length > 0 ? (
        <p className="mt-4 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          {missing.length === 1 ? 'One kind of source is' : `${String(missing.length)} kinds are`}{' '}
          not set up yet: {missing.map((kind) => KIND_META[kind].label.toLowerCase()).join(', ')}.
        </p>
      ) : null}

      {/* A reminder rather than a control. The list above is the whole surface, and the set of
          features is fixed by the product, not by this page. */}
      <p className="mt-6 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
        {aiFeatureSchema.options.length} features can read from these sources. Each source decides
        which.
      </p>
    </div>
  )
}
