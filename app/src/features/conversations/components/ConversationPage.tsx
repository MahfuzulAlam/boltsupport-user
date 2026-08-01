import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { useMediaQuery, BREAKPOINTS } from '@/hooks/use-media-query'
import { ApiError, apiRequest } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { FolderSidebar, fetchTags, fetchUsers, useInboxes } from '@/features/inbox'
import { hasStoredDraft, type ComposerMode } from '@/features/composer'
import { AiSuggestionStrip, useAiSettings } from '@/features/ai'
import { useSession } from '@/features/auth'
import { isAuthoredMessage, viewSchema, type AiEventMessage } from '@/types'
import {
  useContact,
  useConversation,
  useEditConversation,
  useMessages,
} from '../hooks/use-conversation'
import { useConversationActions, useConversationSiblings } from '../hooks/use-conversation-actions'
import { useThreadView } from '../hooks/use-thread-view'
import { fetchContactConversations } from '../api/conversation'
import { ConversationActions } from './ConversationActions'
import { MoveDialog } from './MoveDialog'
import { ConversationHeader } from './ConversationHeader'
import { CollisionBanner } from './CollisionBanner'
import { MessageBubble } from './MessageBubble'
import { ConversationSidebar } from './ConversationSidebar'
import { ReplyBar } from './ReplyBar'
import { ThreadSkeleton } from './ThreadSkeleton'

/**
 * Tiptap and ProseMirror are ~200KB gzipped, and an agent reads the thread before they reply.
 * Loading the composer separately keeps conversation-open-to-interactive inside the 300ms
 * budget in NFR-1.2; the reply surface arrives a moment later behind a placeholder of the same
 * height, so nothing jumps.
 */
const Composer = lazy(async () => ({
  default: (await import('@/features/composer')).Composer,
}))

function ComposerPlaceholder() {
  return (
    <div
      className="flex-none border-t px-5 pt-3 pb-3.5"
      style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
    >
      <div
        className="h-[148px] w-full animate-pulse rounded-md"
        style={{ background: 'var(--muted)' }}
      />
    </div>
  )
}

export function ConversationPage() {
  const params = useParams()
  const navigate = useNavigate()
  const conversationId = params['conversationId'] ?? ''
  const inboxId = params['inboxId'] ?? ''
  const folder = params['folder'] ?? 'unassigned'
  const backTo = `/inbox/${inboxId}/${folder}`

  const conversation = useConversation(conversationId)
  const messages = useMessages(conversationId)
  const contact = useContact(conversation.data?.contact.id)
  const users = useQuery({ queryKey: ['users'], queryFn: ({ signal }) => fetchUsers(signal) })
  const edit = useEditConversation(conversationId)
  const roomForRail = useMediaQuery(`(min-width: ${String(BREAKPOINTS.rail)}px)`)
  // The folder rail is navigation, so it survives a narrower screen than the customer panel:
  // at 1200px you keep the folders and lose the sidebar, not the other way round.
  const roomForFolders = useMediaQuery(`(min-width: ${String(BREAKPOINTS.nav)}px)`)
  const aiSettings = useAiSettings()
  const aiEnabled = aiSettings.data?.enabled === true
  const tagList = useQuery({ queryKey: ['tags'], queryFn: ({ signal }) => fetchTags(signal) })
  const tagMap = useMemo(
    () => new Map((tagList.data ?? []).map((tag) => [tag.id, tag])),
    [tagList.data],
  )

  const inboxes = useInboxes()
  const inbox = (inboxes.data ?? []).find((item) => item.id === inboxId)
  const views = useQuery({
    queryKey: ['views'],
    queryFn: ({ signal }) => apiRequest('/views', z.array(viewSchema), { signal }),
    staleTime: 60_000,
  })

  /**
   * The composer is closed until asked for.
   *
   * A thread is read before it is answered, so the reply surface starts as two buttons at the
   * end of it and only takes the space once someone means to use it. Reopening restores the
   * saved draft, so closing it is never destructive.
   */
  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [moving, setMoving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  /*
   * Which messages are folded, owned here rather than by each message.
   *
   * Only the exceptions are stored. A thread arrives fully expanded, so an empty map is the
   * common case, and Collapse all is one write rather than a signal every message has to
   * subscribe to and keep in step.
   */
  const [foldedIds, setFoldedIds] = useState<Record<string, boolean>>({})
  const view = useThreadView()
  const session = useSession()
  const currentUserId = session.data?.user.id ?? ''

  const siblings = useConversationSiblings(inboxId, folder, conversationId)
  const actions = useConversationActions({ conversationId, inboxId, folder })

  const others = useQuery({
    queryKey: ['contact-conversations', conversation.data?.contact.id],
    queryFn: ({ signal }) => fetchContactConversations(conversation.data?.contact.id ?? '', signal),
    enabled: conversation.data !== undefined,
  })

  const userMap = useMemo(
    () => new Map((users.data ?? []).map((user) => [user.id, user])),
    [users.data],
  )

  // Announce inbound messages politely rather than moving focus, so an agent mid-reply is told
  // without being interrupted (NFR-3.4).
  const [announcement, setAnnouncement] = useState('')
  const seenCount = useRef<number | null>(null)
  useEffect(() => {
    const list = messages.data
    if (list === undefined) return
    const inbound = list.filter((message) => message.type === 'customer')
    const latest = inbound[inbound.length - 1]
    if (seenCount.current !== null && inbound.length > seenCount.current && latest !== undefined) {
      setAnnouncement(
        `${latest.author.name} replied ${formatDistanceToNowStrict(new Date(latest.createdAt), { addSuffix: true })}`,
      )
    }
    seenCount.current = inbound.length
  }, [messages.data])

  const record = conversation.data
  const followerIds = record?.followerIds ?? []
  const following = followerIds.includes(currentUserId)

  const toggleFollow = () => {
    const next = following
      ? followerIds.filter((id) => id !== currentUserId)
      : [...followerIds, currentUserId]
    actions.follow.mutate(next)
    toast(following ? 'You stopped following this' : 'You are following this', {
      description: following
        ? 'You will not be notified about it any more.'
        : 'You will be told when it moves, even if it is not yours.',
    })
  }

  const setAllFolded = (folded: boolean) => {
    const ids = (messages.data ?? []).filter(isAuthoredMessage).map((message) => message.id)
    setFoldedIds(Object.fromEntries(ids.map((id) => [id, folded])))
  }

  const goTo = (id: string | undefined) => {
    if (id !== undefined) void navigate(`/inbox/${inboxId}/${folder}/${id}`)
  }

  /*
   * The thread as a quote, for a forward.
   *
   * Built here because this is where the messages already are, and built as a blockquote so the
   * forwarded history is visually separated from whatever the agent writes above it. Bodies are
   * reduced to text: a forward is a summary of what happened, not a second chance for an email's
   * markup to render somewhere new.
   */
  const forwardQuote = useMemo(() => {
    const authored = (messages.data ?? [])
      .filter(isAuthoredMessage)
      .filter((m) => m.hidden !== true)
    const lines = authored.map((message) => {
      const body = message.bodyHtml
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const when = new Date(message.createdAt).toLocaleString()
      return `<p><strong>${message.author.name}</strong> · ${when}<br>${body}</p>`
    })
    return `<p></p><blockquote><p>Forwarded conversation</p>${lines.join('')}</blockquote>`
  }, [messages.data])

  useHotkeys({
    discard: () => {
      if (expanded) setExpanded(false)
      else if (composerMode !== null) setComposerMode(null)
      else void navigate(backTo)
    },
    hideDetails: view.toggleHideDetails,
    layout: view.toggleWide,
    collapseAll: () => {
      setAllFolded(true)
    },
    expandAll: () => {
      setAllFolded(false)
    },
    follow: toggleFollow,
    move: () => {
      setMoving(true)
    },
    remove: () => {
      setConfirmingDelete(true)
    },
    statusSpam: () => {
      if (record !== undefined) {
        actions.setStatus.mutate({ status: 'spam', previous: record.status })
      }
    },
    listUp: () => {
      goTo(siblings.previous?.id)
    },
    listDown: () => {
      goTo(siblings.next?.id)
    },
    // Only while it is closed. Once mounted the composer owns these, and binding them twice
    // would fight over the mode.
    ...(composerMode === null
      ? {
          reply: () => {
            setComposerMode('reply')
          },
          note: () => {
            setComposerMode('note')
          },
          forward: () => {
            setComposerMode('forward')
          },
        }
      : {}),
  })

  if (conversation.isPending) return <ThreadSkeleton />

  if (conversation.isError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[15px] font-medium">We could not load this conversation</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            {conversation.error instanceof ApiError
              ? conversation.error.userMessage
              : 'Try again in a moment.'}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              void conversation.refetch()
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (record === undefined) return <ThreadSkeleton />

  const presence = record.presence ?? []

  const undoAiEvent = (message: AiEventMessage) => {
    toast('Auto assignment undone', { description: message.aiEvent.detail })
  }

  const menu = (
    <ConversationActions
      following={following}
      followerCount={followerIds.length}
      detailsHidden={view.hideDetails}
      wideLayout={view.wide}
      onFollow={toggleFollow}
      onForward={() => {
        setComposerMode('forward')
      }}
      onMove={() => {
        setMoving(true)
      }}
      onSpam={() => {
        actions.setStatus.mutate({ status: 'spam', previous: record.status })
      }}
      onDelete={() => {
        setConfirmingDelete(true)
      }}
      onToggleDetails={view.toggleHideDetails}
      onToggleLayout={view.toggleWide}
      onCollapseAll={() => {
        setAllFolded(true)
      }}
      onExpandAll={() => {
        setAllFolded(false)
      }}
      onPrevious={
        siblings.previous === null
          ? null
          : () => {
              goTo(siblings.previous?.id)
            }
      }
      onNext={
        siblings.next === null
          ? null
          : () => {
              goTo(siblings.next?.id)
            }
      }
    />
  )

  return (
    <div className="flex h-full">
      {/* The same folder rail as the queue, so moving between a thread and its folder never
          costs a back navigation. Collapsing it is remembered across both. */}
      {roomForFolders && inbox !== undefined ? (
        <FolderSidebar inbox={inbox} views={views.data ?? []} />
      ) : null}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <ConversationHeader
          conversation={record}
          backTo={backTo}
          allTags={tagList.data ?? []}
          actions={menu}
          onEdit={(change) => {
            edit.mutate(change)
          }}
        />

        {aiEnabled ? (
          <AiSuggestionStrip
            suggestions={record.ai?.suggestions ?? []}
            users={userMap}
            tags={tagMap}
            onAccept={(suggestion) => {
              if (suggestion.kind === 'assign') edit.mutate({ assigneeId: suggestion.value })
              if (suggestion.kind === 'priority') {
                edit.mutate({ priority: suggestion.value as 'urgent' | 'high' | 'normal' | 'low' })
              }
            }}
          />
        ) : null}

        {presence.length > 0 ? (
          <CollisionBanner presence={presence} users={userMap} since={record.updatedAt} />
        ) : null}

        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>

        {/* Hidden rather than unmounted while the composer is expanded, so scroll position and
            any open message survive coming back. */}
        {/* No horizontal padding here: each message carries its own, so the rule between two
            of them runs the full width of the pane rather than stopping short on both sides. */}
        <div className={cn('flex-1 overflow-y-auto pt-1.5 pb-2', expanded && 'hidden')}>
          <div className="w-full">
            {messages.isPending ? (
              <ThreadSkeleton inline />
            ) : messages.isError ? (
              <p className="py-6 text-center text-[13px]" style={{ color: 'var(--danger-strong)' }}>
                The messages in this conversation could not be loaded.
              </p>
            ) : messages.data.filter(isAuthoredMessage).length === 0 ? (
              <p
                className="py-6 text-center text-[13px]"
                style={{ color: 'var(--muted-foreground)' }}
              >
                No messages yet.
              </p>
            ) : (
              messages.data.map((message) => (
                <div
                  key={message.id}
                  className="border-b px-5"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <MessageBubble
                    message={message}
                    aiEnabled={aiEnabled}
                    open={foldedIds[message.id] !== true}
                    hideDetails={view.hideDetails}
                    onToggleOpen={() => {
                      setFoldedIds((current) => ({
                        ...current,
                        [message.id]: current[message.id] !== true,
                      }))
                    }}
                    onUndoAiEvent={undoAiEvent}
                  />
                </div>
              ))
            )}
          </div>

          {composerMode === null ? (
            <div className="px-5">
              <ReplyBar onOpen={setComposerMode} hasDraft={hasStoredDraft(conversationId)} />
            </div>
          ) : null}
        </div>

        {composerMode !== null ? (
          <Suspense fallback={<ComposerPlaceholder />}>
            <Composer
              key={conversationId}
              conversationId={conversationId}
              // The address, not the display name: it is what actually receives the reply, and
              // two contacts with the same name are not a rare thing in a shared inbox.
              recipient={record.contact.email}
              initialMode={composerMode}
              status={record.status === 'spam' ? 'active' : record.status}
              assignment={{
                assignee: record.assigneeId === null ? undefined : userMap.get(record.assigneeId),
                options: users.data ?? [],
                onAssign: (userId) => {
                  edit.mutate({ assigneeId: userId })
                },
              }}
              onSnooze={(choice) => {
                // A snooze is a deferral, so the conversation goes pending and leaves the queue
                // until the time the agent picked.
                edit.mutate({ status: 'pending' })
                toast(`Snoozed until ${format(choice.at, 'EEE d MMM, h:mm a')}`, {
                  description:
                    choice.condition === 'if-no-reply'
                      ? 'It comes back sooner if the customer replies.'
                      : 'It stays out of the queue until then.',
                })
              }}
              forwardQuote={forwardQuote}
              expanded={expanded}
              onToggleExpand={() => {
                setExpanded((value) => !value)
              }}
              onClose={() => {
                setComposerMode(null)
                setExpanded(false)
              }}
              onStatusOnSend={(status) => {
                edit.mutate({ status })
              }}
            />
          </Suspense>
        ) : null}
      </div>

      {/* Wide gives the thread the whole pane. The rail is context, and context is worth less
          than width when someone is reading a long forwarded chain. */}
      {roomForRail && !view.wide ? (
        <ConversationSidebar
          conversation={record}
          contact={contact.data}
          otherConversations={(others.data?.items ?? []).filter((item) => item.id !== record.id)}
          aiEnabled={aiEnabled}
          messageCount={messages.data?.length ?? 0}
        />
      ) : null}

      <MoveDialog
        inboxes={inboxes.data ?? []}
        currentInboxId={record.inboxId}
        open={moving}
        onOpenChange={setMoving}
        onMove={(target) => {
          setMoving(false)
          actions.move.mutate({
            toInboxId: target.id,
            toName: target.name,
            fromInboxId: record.inboxId,
          })
        }}
      />

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete this conversation?</DialogTitle>
            <DialogDescription>
              It leaves every folder and every count. You can undo this from the toast that follows.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmingDelete(false)
              }}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmingDelete(false)
                actions.remove.mutate()
              }}
            >
              Delete conversation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
