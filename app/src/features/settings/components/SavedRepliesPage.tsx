import { useQuery } from '@tanstack/react-query'
import { Zap } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { shortcutDisplay } from '@/lib/shortcuts'
import { fetchSavedReplies } from '../api/settings'
import { SettingsPage } from './SettingsPage'

/** Strips the stored HTML to a single line of text for the list preview. */
function preview(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function SavedRepliesPage() {
  const replies = useQuery({
    queryKey: ['saved-replies'],
    queryFn: ({ signal }) => fetchSavedReplies(signal),
  })

  const rows = replies.data ?? []

  return (
    <SettingsPage
      title="Saved replies"
      description={`Reusable answers your team inserts from the composer with ${shortcutDisplay('savedReplies')}.`}
    >
      {replies.isPending ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No saved replies yet"
          description="The answer you type more than twice belongs here."
          action={<Button>New saved reply</Button>}
        />
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <Button size="sm">New saved reply</Button>
          </div>

          <div
            className="overflow-hidden rounded-lg border"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <div
              className="flex h-9 items-center gap-3 border-b px-3 text-[13px]"
              style={{
                background: 'var(--muted)',
                borderColor: 'var(--border)',
                color: 'var(--muted-foreground)',
              }}
            >
              <span className="w-[180px] shrink-0">Name</span>
              <span className="min-w-0 flex-1">Starts with</span>
              <span className="w-[70px] shrink-0 text-right">Used</span>
            </div>

            {rows.map((reply) => (
              <div
                key={reply.id}
                className="flex items-center gap-3 border-b px-3 py-2.5 text-[13px] last:border-b-0"
                style={{ borderColor: 'var(--border)' }}
              >
                <span className="w-[180px] shrink-0 truncate font-medium">{reply.name}</span>
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {preview(reply.bodyHtml)}
                </span>
                <span className="w-[70px] shrink-0 text-right font-mono">{reply.usageCount}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </SettingsPage>
  )
}
