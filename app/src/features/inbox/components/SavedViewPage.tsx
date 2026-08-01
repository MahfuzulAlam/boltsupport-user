import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { Sparkles } from 'lucide-react'
import { viewSchema } from '@/types'
import { apiRequest } from '@/lib/api-client'
import { InboxPage } from './InboxPage'

/**
 * A saved view renders the same three column layout as a folder.
 *
 * The two AI views that ship by default get a line explaining what they select, because "At
 * risk" means nothing until you know a model decided it and roughly how.
 */
export function SavedViewPage() {
  const viewId = useParams()['viewId'] ?? ''

  const views = useQuery({
    queryKey: ['views'],
    queryFn: ({ signal }) => apiRequest('/views', z.array(viewSchema), { signal }),
    staleTime: 60_000,
  })

  const view = (views.data ?? []).find((item) => item.id === viewId)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {view?.system !== undefined ? (
        <p
          className="flex flex-none items-center gap-2 border-b px-4 py-2 text-[13px]"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--ai-soft)',
            color: 'var(--ai)',
          }}
        >
          <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
          {view.system === 'at_risk'
            ? 'Open conversations the model predicts will be rated Not good. A prediction, not a rating.'
            : 'Conversations with an AI suggestion nobody has accepted or rejected yet.'}
        </p>
      ) : null}

      <div className="min-h-0 flex-1">
        <InboxPage />
      </div>
    </div>
  )
}
