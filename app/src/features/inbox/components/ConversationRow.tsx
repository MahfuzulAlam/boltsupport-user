import { memo } from 'react'
import { Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SlaBadge } from '@/features/automation'
import { SatisfactionDot } from '@/features/ai'
import { formatAge } from '@/lib/duration'
import { cn } from '@/lib/utils'
import type { Conversation, User } from '@/types'

export interface ConversationRowProps {
  conversation: Conversation
  height: number
  selected: boolean
  /** The keyboard cursor, which is distinct from selection. */
  focused: boolean
  now: number
  presenceUsers: Map<string, User>
  onToggleSelect: (id: string) => void
  onOpen: (conversation: Conversation) => void
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
 * One row of the queue.
 *
 * Memoised because the shared clock ticks every second: without this, one tick re-renders every
 * visible row and its children rather than only the countdowns that changed.
 *
 * Unread is signalled three ways at once (rail, avatar fill, font weight) because at this density
 * a single cue is too easy to miss while scanning.
 */
export const ConversationRow = memo(function ConversationRow({
  conversation,
  height,
  selected,
  focused,
  now,
  presenceUsers,
  onToggleSelect,
  onOpen,
}: ConversationRowProps) {
  const { unread, contact, subject, preview, tags, number, sla, ai } = conversation
  const presence = conversation.presence ?? []

  return (
    <div
      role="option"
      aria-selected={selected}
      data-focused={focused ? 'true' : undefined}
      tabIndex={-1}
      onClick={() => {
        onOpen(conversation)
      }}
      // The listbox container owns the keyboard map, so Enter on the cursor row already works.
      // This is here so a row that receives focus directly still behaves, and so pointer and
      // keyboard reach the same action from the same element.
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(conversation)
        }
      }}
      className={cn(
        'flex cursor-pointer items-center gap-3 border-b pr-[18px] pl-[15px]',
        'hover:bg-[color:var(--hover)]',
      )}
      style={{
        height,
        borderColor: 'var(--border)',
        background: selected ? 'var(--brand-soft)' : 'transparent',
        boxShadow: focused ? 'inset 0 0 0 2px var(--ring)' : 'none',
      }}
    >
      {/* Unread rail. Read rows keep the spacer so the columns stay aligned. */}
      <div
        aria-hidden="true"
        className="h-[42px] w-[3px] shrink-0 rounded-[2px]"
        style={{ background: unread ? 'var(--brand)' : 'transparent' }}
      />

      <input
        type="checkbox"
        checked={selected}
        aria-label={`Select ${subject}`}
        onClick={(event) => {
          event.stopPropagation()
        }}
        onChange={() => {
          onToggleSelect(conversation.id)
        }}
        className="size-4 shrink-0 accent-[color:var(--brand)]"
      />

      <div className="flex w-[172px] shrink-0 items-center gap-2.5">
        <div className="relative shrink-0">
          <Avatar className="size-7">
            <AvatarFallback
              className="text-[11px] font-medium"
              style={{
                background: unread ? 'var(--brand)' : 'var(--muted)',
                color: unread ? 'hsl(0 0% 100%)' : 'var(--muted-foreground)',
              }}
            >
              {initials(contact.name)}
            </AvatarFallback>
          </Avatar>
          {presence.map((entry) => {
            const user = presenceUsers.get(entry.userId)
            const replying = entry.state === 'replying'
            return (
              <span
                key={entry.userId}
                className="absolute -right-1.5 -bottom-1 flex size-4 items-center justify-center rounded-full text-[8px] font-semibold"
                style={{
                  background: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  boxShadow: `0 0 0 2px ${replying ? 'var(--danger)' : 'var(--warning)'}`,
                }}
                role="img"
                aria-label={`${user?.name ?? 'A teammate'} is ${replying ? 'replying now' : 'viewing'}`}
                title={`${user?.name ?? 'A teammate'} is ${replying ? 'replying now' : 'viewing'}`}
              >
                {user === undefined ? '' : initials(user.name)}
              </span>
            )
          })}
        </div>
        <span className={cn('truncate text-[14px]', unread ? 'font-semibold' : 'font-normal')}>
          {contact.name}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="shrink-0 rounded px-1.5 text-[12px]"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {tag.name}
            </span>
          ))}
          {(ai?.suggestions ?? [])
            .filter((suggestion) => suggestion.kind === 'tag' && suggestion.state === 'pending')
            .map((suggestion) => (
              <span
                key={suggestion.id}
                className="flex shrink-0 items-center gap-1 rounded border border-dashed px-1.5 text-[12px] font-medium"
                style={{ borderColor: 'var(--ai)', color: 'var(--ai)' }}
                title={`Suggested by AI, not applied yet. ${String(Math.round(suggestion.confidence * 100))}% confidence`}
              >
                <Sparkles className="size-2.5" aria-hidden="true" />
                suggested
              </span>
            ))}
          <span className={cn('truncate text-[15px]', unread ? 'font-semibold' : 'font-medium')}>
            {subject}
          </span>
        </div>
        <div className="truncate text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          {preview}
        </div>
      </div>

      <div className="flex w-[92px] shrink-0 justify-end">
        <SlaBadge sla={sla} />
      </div>

      <div className="flex w-5 shrink-0 justify-center">
        <SatisfactionDot prediction={ai?.predictedSatisfaction} />
      </div>

      <span
        className="w-[70px] shrink-0 text-right font-mono text-[13px]"
        style={{ color: 'var(--muted-foreground)' }}
      >
        {number}
      </span>

      <span
        className="w-[74px] shrink-0 text-right font-mono text-[13px]"
        style={{ color: 'var(--muted-foreground)' }}
        title={new Date(conversation.waitingSince).toLocaleString()}
      >
        {formatAge(conversation.waitingSince, now)}
      </span>
    </div>
  )
})
