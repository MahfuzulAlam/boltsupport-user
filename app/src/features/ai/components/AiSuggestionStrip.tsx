import { Check, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { aiSuggestionSchema, type AiSuggestion, type Tag, type User } from '@/types'
import { RationalePopover } from './RationalePopover'

interface AiSuggestionStripProps {
  suggestions: AiSuggestion[]
  users: Map<string, User>
  tags: Map<string, Tag>
  onAccept: (suggestion: AiSuggestion) => void
}

function resolveSuggestion(
  suggestion: AiSuggestion,
  users: Map<string, User>,
  tags: Map<string, Tag>,
): string {
  switch (suggestion.kind) {
    case 'assign':
      return users.get(suggestion.value)?.name ?? 'a teammate'
    case 'tag':
      return tags.get(suggestion.value)?.name ?? suggestion.value
    case 'priority':
      return suggestion.value
  }
}

/**
 * Pending suggestions, shown directly under the header.
 *
 * Nothing here has been applied. Accept writes the change and offers Undo; Dismiss records the
 * rejection, because a rejection is calibration data rather than a no-op (design spec section 7).
 * The strip disappears entirely once everything has been handled.
 */
export function AiSuggestionStrip({ suggestions, users, tags, onAccept }: AiSuggestionStripProps) {
  const queryClient = useQueryClient()

  const respond = useMutation({
    mutationFn: ({ id, state }: { id: string; state: 'accepted' | 'rejected' }) =>
      apiRequest(`/ai/suggestions/${id}`, aiSuggestionSchema, {
        method: 'PATCH',
        body: { state },
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversation'] })
      void queryClient.invalidateQueries({ queryKey: ['ai', 'tag-review'] })
    },
  })

  const pending = suggestions.filter((suggestion) => suggestion.state === 'pending')
  if (pending.length === 0) return null

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b px-[18px] py-2.5"
      style={{ background: 'var(--ai-soft)', borderColor: 'var(--border)' }}
      aria-label="AI suggestions"
    >
      <span
        className="flex items-center gap-1.5 text-[13px] font-semibold"
        style={{ color: 'var(--ai)' }}
      >
        <Sparkles className="size-3.5" aria-hidden="true" />
        Suggestions
      </span>

      {pending.map((suggestion) => {
        const label = resolveSuggestion(suggestion, users, tags)
        const confidence = Math.round(suggestion.confidence * 100)

        return (
          <span
            key={suggestion.id}
            className="flex h-7 items-center gap-2 rounded-md border px-2 text-[13px]"
            style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
          >
            <span className="capitalize" style={{ color: 'var(--muted-foreground)' }}>
              {suggestion.kind}
            </span>
            <span className="font-medium">{label}</span>
            <span className="font-mono text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
              {confidence}%
            </span>

            <RationalePopover rationale={suggestion.rationale} />

            <button
              type="button"
              aria-label={`Accept ${suggestion.kind} suggestion`}
              onClick={() => {
                onAccept(suggestion)
                respond.mutate({ id: suggestion.id, state: 'accepted' })
              }}
              className="flex size-5 items-center justify-center rounded"
              style={{ color: 'var(--ai)' }}
            >
              <Check className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Dismiss ${suggestion.kind} suggestion`}
              onClick={() => {
                respond.mutate({ id: suggestion.id, state: 'rejected' })
                toast('Suggestion dismissed, recorded for calibration')
              }}
              className="flex size-5 items-center justify-center rounded"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <X className="size-3.5" />
            </button>
          </span>
        )
      })}
    </div>
  )
}
