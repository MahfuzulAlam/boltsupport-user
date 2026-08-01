import { Lock } from 'lucide-react'
import { format } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ProvenanceRail, type Provenance } from '@/components/ProvenanceRail'
import type { AuthoredMessage } from '@/types'

interface CollapsedMessageRowProps {
  message: AuthoredMessage
  provenance: Provenance
  avatarBackground: string
  avatarColor: string
  onExpand: () => void
}

/** A one line preview. Tags are stripped, not rendered. */
function snippet(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Just the first name and an initial, so a folded row reads as a conversation, not a directory. */
function shortName(name: string): string {
  const [first, last] = name.split(' ')
  return last === undefined ? (first ?? name) : `${first ?? ''} ${last.charAt(0)}.`
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * A message folded to one line: who, a snippet, and when.
 *
 * The whole row is the control rather than a chevron on the end of it, because an agent skimming a
 * long thread should be able to hit it without aiming.
 */
export function CollapsedMessageRow({
  message,
  provenance,
  avatarBackground,
  avatarColor,
  onExpand,
}: CollapsedMessageRowProps) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-expanded={false}
      aria-label={`Expand the message from ${message.author.name}`}
      // The rule between messages belongs to the thread now, so a folded row draws none of its own.
      className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-[color:var(--hover)]"
    >
      <ProvenanceRail provenance={provenance} />

      <Avatar className="size-6 shrink-0">
        <AvatarFallback
          className="text-[10px] font-medium"
          style={{ background: avatarBackground, color: avatarColor }}
        >
          {initials(message.author.name)}
        </AvatarFallback>
      </Avatar>

      <span className="shrink-0 text-[14px] font-semibold">
        {message.type === 'reply' ? 'You' : shortName(message.author.name)}
      </span>

      {message.type === 'note' ? (
        <Lock
          className="size-3 shrink-0"
          style={{ color: 'var(--warning-strong)' }}
          aria-label="Internal note"
        />
      ) : null}

      <span
        className="min-w-0 flex-1 truncate text-[14px]"
        style={{ color: 'var(--muted-foreground)' }}
      >
        {snippet(message.bodyHtml)}
      </span>

      <time
        className="shrink-0 text-[13px]"
        style={{ color: 'var(--muted-foreground)' }}
        dateTime={message.createdAt}
      >
        {format(new Date(message.createdAt), 'MMM d, h:mm a')}
      </time>
    </button>
  )
}
