import { Inbox as InboxIcon, Plus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { useAiAgent, useAiInboxStats, useAiSettings } from '@/features/ai'
import { useArticles, useCollections } from '@/features/docs'
import { ApiError } from '@/lib/api-client'
import { useInboxes } from '../hooks/use-inboxes'
import { InboxCard } from './InboxCard'
import { KnowledgeBaseCard } from './KnowledgeBaseCard'
import { AiAgentCard } from './AiAgentCard'
import { DashboardSkeleton } from './DashboardSkeleton'

/** Entrance stagger. Kept short so it reads as one movement rather than a queue. */
const STAGGER_MS = 40

function comingSoon() {
  toast('Inbox creation arrives with workspace settings', {
    description: 'Step 14 builds the management screens.',
  })
}

export function WorkspacePage() {
  const inboxes = useInboxes()
  const collections = useCollections()
  const articles = useArticles()
  const aiSettings = useAiSettings()
  const aiAgent = useAiAgent()
  const aiStats = useAiInboxStats()

  const newInboxButton = (
    <Button onClick={comingSoon}>
      <Plus className="size-4" />
      New inbox
    </Button>
  )

  if (inboxes.isPending) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-6 pt-6 pb-10">
        <PageHeader title="Workspace" actions={newInboxButton} />
        <DashboardSkeleton />
      </div>
    )
  }

  if (inboxes.isError) {
    const message =
      inboxes.error instanceof ApiError
        ? inboxes.error.userMessage
        : 'Something went wrong loading your inboxes.'
    return (
      <div className="mx-auto w-full max-w-[1240px] px-6 pt-6 pb-10">
        <PageHeader title="Workspace" actions={newInboxButton} />
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
          style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)' }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium">We could not load your inboxes</p>
            <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              {message}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void inboxes.refetch()
            }}
          >
            <RotateCcw className="size-4" />
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (inboxes.data.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-6 pt-6 pb-10">
        <PageHeader title="Workspace" />
        <EmptyState
          icon={InboxIcon}
          title="No inboxes yet"
          description="An inbox is where your customer conversations arrive. Connect an address and your team can start replying in minutes."
          action={<Button onClick={comingSoon}>Create your first inbox</Button>}
        />
      </div>
    )
  }

  // AI is workspace level and can be switched off entirely (AI-11). When it is, the strips and
  // the agent card simply do not render; nothing errors and nothing is greyed out.
  const aiEnabled = aiSettings.data?.enabled === true
  const agent = aiAgent.data
  const kbCollections = collections.data
  const showKnowledgeBase = kbCollections !== undefined && kbCollections.length > 0

  // The trailing cards continue the stagger where the inboxes left off.
  const kbDelay = inboxes.data.length * STAGGER_MS
  const agentDelay = kbDelay + (showKnowledgeBase ? STAGGER_MS : 0)

  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 pt-6 pb-10">
      <PageHeader title="Workspace" actions={newInboxButton} />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(316px,1fr))] gap-4">
        {inboxes.data.map((inbox, index) => {
          const stats = aiEnabled ? aiStats.data?.[inbox.id] : undefined
          return (
            <InboxCard
              key={inbox.id}
              inbox={inbox}
              {...(stats ? { aiStats: stats } : {})}
              delayMs={index * STAGGER_MS}
            />
          )
        })}

        {showKnowledgeBase ? (
          <KnowledgeBaseCard
            collections={kbCollections}
            articleCount={articles.data?.length ?? 0}
            delayMs={kbDelay}
          />
        ) : null}

        {aiEnabled && agent !== undefined ? (
          <AiAgentCard agent={agent} delayMs={agentDelay} />
        ) : null}
      </div>
    </div>
  )
}
