import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AiSurface } from '@/features/ai'
import { Button } from '@/components/ui/button'
import { createArticle, fetchArticleSuggestions } from '../api/articles'

interface SuggestArticlesProps {
  collectionId: string
  onDismiss: () => void
}

/**
 * Repeated questions from resolved conversations, offered as articles.
 *
 * Everything created here lands as a Draft, which is not a nicety: an unreviewed AI article on a
 * public help site is a customer-facing AI output, and AI-1 puts a human between the suggestion
 * and anything a customer can read.
 */
export function SuggestArticles({ collectionId, onDismiss }: SuggestArticlesProps) {
  const queryClient = useQueryClient()

  const suggestions = useQuery({
    queryKey: ['article-suggestions'],
    queryFn: ({ signal }) => fetchArticleSuggestions(signal),
  })

  const create = useMutation({
    mutationFn: (title: string) => createArticle(title, collectionId),
    onSuccess: (article) => {
      void queryClient.invalidateQueries({ queryKey: ['articles'] })
      void queryClient.invalidateQueries({ queryKey: ['article-suggestions'] })
      toast('Draft created', { description: `“${article.title}” is waiting for you to write it.` })
    },
  })

  const items = suggestions.data ?? []

  return (
    <AiSurface
      title="Suggested from resolved conversations"
      actions={
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      }
    >
      {suggestions.isPending ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Looking for questions you have answered more than once
        </p>
      ) : items.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Nothing repeated often enough yet. Come back once more conversations have closed.
        </p>
      ) : (
        <>
          <p className="mb-2.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Each one becomes a draft for you to write and publish.
          </p>
          <ul>
            {items.map((item) => (
              <li key={item.subject} className="flex items-center gap-3 py-1.5 text-[13px]">
                <span className="min-w-0 flex-1 truncate">{item.subject}</span>
                <span className="shrink-0 font-mono" style={{ color: 'var(--muted-foreground)' }}>
                  asked {item.askedCount}×
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={create.isPending}
                  onClick={() => {
                    create.mutate(item.subject)
                  }}
                >
                  Create draft
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </AiSurface>
  )
}
