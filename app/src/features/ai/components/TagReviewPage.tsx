import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Check, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { apiRequest } from '@/lib/api-client'
import { aiSuggestionSchema, tagSchema } from '@/types'

const reviewRowSchema = z.object({
  conversationId: z.string(),
  number: z.number(),
  subject: z.string(),
  contact: z.string(),
  suggestions: z.array(aiSuggestionSchema),
  createdAt: z.string(),
})

/**
 * The tag review queue (FR-4.30).
 *
 * This exists so tagging stays clean without forcing an agent to open every thread. Bulk accept
 * is deliberately bounded by confidence rather than offering an "accept everything" button.
 */
export function TagReviewPage() {
  const queryClient = useQueryClient()

  const rows = useQuery({
    queryKey: ['ai', 'tag-review'],
    queryFn: ({ signal }) =>
      apiRequest('/ai/tag-review', z.array(reviewRowSchema), { ...(signal ? { signal } : {}) }),
  })

  const tags = useQuery({
    queryKey: ['tags'],
    queryFn: ({ signal }) => apiRequest('/tags', z.array(tagSchema), { signal }),
  })
  const tagById = new Map((tags.data ?? []).map((tag) => [tag.id, tag]))

  const respond = useMutation({
    mutationFn: ({ id, state }: { id: string; state: 'accepted' | 'rejected' }) =>
      apiRequest(`/ai/suggestions/${id}`, aiSuggestionSchema, {
        method: 'PATCH',
        body: { state },
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai', 'tag-review'] })
    },
  })

  const pending = rows.data ?? []
  const highConfidence = pending.flatMap((row) =>
    row.suggestions.filter((suggestion) => suggestion.confidence >= 0.9),
  )

  return (
    <div className="mx-auto w-full max-w-[960px] px-6 pt-6 pb-10">
      <PageHeader
        title="Tag review queue"
        description="Accept or reject suggested tags without opening each thread."
        actions={
          highConfidence.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                for (const suggestion of highConfidence) {
                  respond.mutate({ id: suggestion.id, state: 'accepted' })
                }
                toast(`Accepted ${String(highConfidence.length)} tags above 90%`, {
                  description: 'Each one is logged and can be undone from the audit log.',
                })
              }}
              className="h-8 rounded-md px-3 text-[13px] font-medium"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              Accept all above 90% ({highConfidence.length})
            </button>
          ) : undefined
        }
      />

      {rows.isPending ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : pending.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing waiting for review"
          description="Suggested tags land here when the model is not confident enough to act on its own."
        />
      ) : (
        <div
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          {pending.map((row) => (
            <div
              key={row.conversationId}
              className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/inbox/in1/unassigned/${row.conversationId}`}
                  className="block truncate text-[14px] font-medium hover:underline"
                >
                  {row.subject}
                </Link>
                <span className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                  {row.contact} · <span className="font-mono">#{row.number}</span>
                </span>
              </div>

              {row.suggestions.map((suggestion) => (
                <span
                  key={suggestion.id}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-dashed px-2 text-[13px] font-medium"
                  style={{ borderColor: 'var(--ai)', color: 'var(--ai)' }}
                >
                  <Sparkles className="size-3" aria-hidden="true" />
                  {tagById.get(suggestion.value)?.name ?? suggestion.value}
                  <span className="font-mono text-[12px] opacity-80">
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                  <button
                    type="button"
                    aria-label={`Accept ${tagById.get(suggestion.value)?.name ?? suggestion.value}`}
                    onClick={() => {
                      respond.mutate({ id: suggestion.id, state: 'accepted' })
                      toast('Tag applied')
                    }}
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Reject ${tagById.get(suggestion.value)?.name ?? suggestion.value}`}
                    onClick={() => {
                      respond.mutate({ id: suggestion.id, state: 'rejected' })
                      toast('Tag rejected, recorded for calibration')
                    }}
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
