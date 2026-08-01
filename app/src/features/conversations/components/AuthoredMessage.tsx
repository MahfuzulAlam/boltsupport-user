import { useState } from 'react'
import { CornerUpRight, Eye, EyeOff, Lock, Sparkles } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ProvenanceRail, type Provenance } from '@/components/ProvenanceRail'
import type { AuthoredMessage as AuthoredMessageType } from '@/types'
import { useEditMessage, useTranslateMessage } from '../hooks/use-message-actions'
import type { Translation } from '../api/messages'
import { CollapsedMessageRow } from './CollapsedMessageRow'
import { EmailIframeRenderer } from './EmailIframeRenderer'
import { MessageActions } from './MessageActions'
import { MessageEditor } from './MessageEditor'
import { ShowOriginalDialog } from './ShowOriginalDialog'
import { TranslatedBody } from './TranslatedBody'

interface AuthoredMessageProps {
  message: AuthoredMessageType
  aiEnabled: boolean
  /**
   * Open and folded are owned by the thread, not by the message.
   *
   * Collapse all and Expand all have to be able to reach every message at once, and a component
   * that keeps its own copy of this would drift out of step with them the moment one is used.
   */
  open: boolean
  onToggleOpen: () => void
  /** Folds the sender and visibility lines away, for reading a long thread quickly. */
  hideDetails?: boolean
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface Treatment {
  provenance: Provenance
  label: string | null
  labelColor?: string
  background: string
  avatarBackground: string
  avatarColor: string
  visibility: string | null
}

/**
 * The three authored message types share a layout and differ only in their treatment, which is
 * what makes the difference between them read as a property of the message rather than as three
 * unrelated designs.
 */
const TREATMENTS: Record<AuthoredMessageType['type'], Treatment> = {
  customer: {
    provenance: 'customer',
    label: null,
    background: 'transparent',
    avatarBackground: 'var(--brand)',
    avatarColor: 'hsl(0 0% 100%)',
    visibility: null,
  },
  reply: {
    provenance: 'agent',
    label: 'Agent reply',
    labelColor: 'var(--brand)',
    background: 'transparent',
    avatarBackground: 'var(--muted)',
    avatarColor: 'var(--muted-foreground)',
    visibility: null,
  },
  note: {
    provenance: 'note',
    label: 'Note',
    background: 'var(--note)',
    avatarBackground: 'hsl(38 92% 50% / 0.28)',
    avatarColor: 'var(--foreground)',
    visibility: 'Not visible to the customer',
  },
}

export function AuthoredMessage({
  message,
  aiEnabled,
  open,
  onToggleOpen,
  hideDetails = false,
}: AuthoredMessageProps) {
  const treatment = TREATMENTS[message.type]
  const isNote = message.type === 'note'
  const aiAssisted = message.type === 'reply' ? message.aiAssisted : undefined
  const forwardedTo = message.type === 'reply' ? message.forwardedTo : undefined
  const sentAt = new Date(message.createdAt)

  const [editing, setEditing] = useState(false)
  const [showingOriginal, setShowingOriginal] = useState(false)
  // Held here rather than in the query cache: a translation is a reading aid, not what the
  // customer wrote, and caching it as message data is how it ends up quoted back at them.
  const [translation, setTranslation] = useState<Translation | null>(null)

  const edit = useEditMessage(message.conversationId)
  const translate = useTranslateMessage()

  const setHidden = (hidden: boolean) => {
    edit.mutate({ messageId: message.id, patch: { hidden } })
    if (hidden) {
      toast('Message hidden', {
        description: 'Only someone who unhides it can read it.',
        action: {
          label: 'Undo',
          onClick: () => {
            edit.mutate({ messageId: message.id, patch: { hidden: false } })
          },
        },
      })
    }
  }

  const runTranslation = (targetLanguage: string) => {
    translate.mutate({ messageId: message.id, targetLanguage }, { onSuccess: setTranslation })
  }

  const actions = (
    <MessageActions
      message={message}
      aiEnabled={aiEnabled}
      translating={translate.isPending}
      translated={translation !== null}
      onEdit={() => {
        if (!open) onToggleOpen()
        setEditing(true)
      }}
      onToggleHidden={() => {
        setHidden(message.hidden !== true)
      }}
      onShowOriginal={() => {
        setShowingOriginal(true)
      }}
      onTranslate={runTranslation}
      onClearTranslation={() => {
        setTranslation(null)
      }}
    />
  )

  const dialog = (
    <ShowOriginalDialog
      message={message}
      open={showingOriginal}
      onOpenChange={setShowingOriginal}
    />
  )

  /*
   * Hidden is not collapsed.
   *
   * A folded message is still in the thread and readable in one click by anyone. A hidden one is
   * content somebody decided should not sit in the open, so it says so plainly and keeps its own
   * control rather than reading as a quiet row.
   */
  if (message.hidden === true) {
    return (
      <div
        id={`message-${message.id}`}
        className="my-1 flex items-center gap-2.5 rounded-md border border-dashed px-3 py-2 text-[13px]"
        style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
      >
        <EyeOff className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">
          Message from {message.author.name} is hidden
        </span>
        <button
          type="button"
          onClick={() => {
            setHidden(false)
          }}
          className="flex h-6 items-center gap-1 rounded px-1.5 font-medium"
          style={{ color: 'var(--brand)' }}
        >
          <Eye className="size-3.5" aria-hidden="true" />
          Show
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <div id={`message-${message.id}`}>
        <CollapsedMessageRow
          message={message}
          provenance={treatment.provenance}
          avatarBackground={treatment.avatarBackground}
          avatarColor={treatment.avatarColor}
          onExpand={onToggleOpen}
        />
        {dialog}
      </div>
    )
  }

  return (
    <article
      id={`message-${message.id}`}
      className="flex gap-3.5 py-3.5"
      style={
        isNote
          ? { background: treatment.background, borderRadius: 8, padding: '14px', marginBlock: 4 }
          : undefined
      }
      aria-label={`${treatment.label ?? 'Message'} from ${message.author.name}`}
    >
      <ProvenanceRail provenance={treatment.provenance} />

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-start gap-1">
          {/* A real button rather than a <header> with role="button": the header element cannot
              carry that role. The menu is a sibling rather than a child, because an actions menu
              nested inside the collapse control would fold the message every time it opened. */}
          <button
            type="button"
            aria-expanded
            aria-label={`Collapse the message from ${message.author.name}`}
            onClick={onToggleOpen}
            className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-md text-left"
          >
            <Avatar className="size-8">
              <AvatarFallback
                className="text-[12px] font-medium"
                style={{ background: treatment.avatarBackground, color: treatment.avatarColor }}
              >
                {initials(message.author.name)}
              </AvatarFallback>
            </Avatar>

            <span className="text-[15px] font-semibold">{message.author.name}</span>

            {treatment.label !== null ? (
              <span
                className="flex h-5 items-center gap-1 rounded px-1.5 text-[12px] font-medium"
                style={
                  isNote
                    ? { border: '1px solid var(--warning)', color: 'var(--foreground)' }
                    : { color: treatment.labelColor }
                }
              >
                {isNote ? <Lock className="size-3" aria-hidden="true" /> : null}
                {treatment.label}
              </span>
            ) : null}

            {aiAssisted !== undefined ? (
              <span
                className="flex h-5 items-center gap-1 rounded px-1.5 text-[11px] font-semibold"
                style={{ background: 'var(--ai-soft)', color: 'var(--ai)' }}
                title="Internal only, never shown to the customer"
              >
                <Sparkles className="size-3" aria-hidden="true" />
                AI assisted
              </span>
            ) : null}

            {/* A forward left the conversation. Saying where has to survive Hide details,
                because a thread that looks like the customer was told something they never saw
                is worse than a busy header. */}
            {forwardedTo !== undefined ? (
              <span
                className="flex h-5 items-center gap-1 rounded px-1.5 text-[12px] font-medium"
                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >
                <CornerUpRight className="size-3" aria-hidden="true" />
                Forwarded to {forwardedTo}
              </span>
            ) : null}

            {message.author.email !== undefined && !hideDetails ? (
              <span className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                From {message.author.email}
              </span>
            ) : null}

            <time
              className="ml-auto font-mono text-[12px]"
              style={{ color: 'var(--muted-foreground)' }}
              dateTime={message.createdAt}
              title={sentAt.toLocaleString()}
            >
              {formatDistanceToNowStrict(sentAt, { addSuffix: true })}
            </time>

            {message.editedAt !== undefined ? (
              <span
                className="text-[12px]"
                style={{ color: 'var(--muted-foreground)' }}
                title={new Date(message.editedAt).toLocaleString()}
              >
                Edited
              </span>
            ) : null}
          </button>

          {actions}
        </div>

        {treatment.visibility !== null && !hideDetails ? (
          <p className="mb-1.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            {treatment.visibility}
          </p>
        ) : null}

        {editing ? (
          <MessageEditor
            bodyHtml={message.bodyHtml}
            onCancel={() => {
              setEditing(false)
            }}
            onSave={(bodyHtml) => {
              edit.mutate({ messageId: message.id, patch: { bodyHtml } })
              setEditing(false)
              setTranslation(null)
              toast('Message edited', { description: 'Your team sees the change straight away.' })
            }}
          />
        ) : translation !== null ? (
          <TranslatedBody
            translation={translation}
            authorName={message.author.name}
            retrying={translate.isPending}
            onRetranslate={runTranslation}
            onDismiss={() => {
              setTranslation(null)
            }}
          />
        ) : (
          <EmailIframeRenderer bodyHtml={message.bodyHtml} authorName={message.author.name} />
        )}
      </div>

      {dialog}
    </article>
  )
}
