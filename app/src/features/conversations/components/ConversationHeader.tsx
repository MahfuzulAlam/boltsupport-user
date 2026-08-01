import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  Clock,
  Flag,
  Plus,
  Tag as TagIcon,
  UserRound,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SlaBadge } from '@/features/automation'
import { shortcutDisplay } from '@/lib/shortcuts'
import type { Conversation, ConvStatus, Priority, Tag } from '@/types'

interface ConversationHeaderProps {
  conversation: Conversation
  backTo: string
  /** The workspace tag set, for the add menu. */
  allTags: Tag[]
  /** The conversation level actions menu, rendered at the end of the control row. */
  actions?: React.ReactNode
  onEdit: (edit: {
    subject?: string
    status?: ConvStatus
    priority?: Priority
    tagIds?: string[]
  }) => void
}

const STATUS_STYLE: Record<ConvStatus, { label: string; bg: string; fg: string }> = {
  active: { label: 'Active', bg: 'var(--success-soft)', fg: 'var(--success-strong)' },
  pending: { label: 'Pending', bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
  closed: { label: 'Closed', bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
  spam: { label: 'Spam', bg: 'var(--danger-soft)', fg: 'var(--danger-strong)' },
}

const PRIORITY_COLOR: Record<Priority, string> = {
  urgent: 'var(--danger)',
  high: 'var(--warning-strong)',
  normal: 'var(--muted-foreground)',
  low: 'var(--muted-foreground)',
}

const PRIORITIES: Priority[] = ['urgent', 'high', 'normal', 'low']
const STATUSES: ConvStatus[] = ['active', 'pending', 'closed', 'spam']

/** The S-then-key chords, so the menu teaches them rather than competing with them. */
const STATUS_SHORTCUT = {
  active: 'statusActive',
  pending: 'statusPending',
  closed: 'statusClosed',
  spam: 'statusSpam',
} as const

export function ConversationHeader({
  conversation,
  backTo,
  allTags,
  actions,
  onEdit,
}: ConversationHeaderProps) {
  const [subject, setSubject] = useState(conversation.subject)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the field in step when the conversation changes underneath, but never while the agent
  // is mid edit.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setSubject(conversation.subject)
  }, [conversation.subject])

  const commitSubject = () => {
    const trimmed = subject.trim()
    if (trimmed === '' || trimmed === conversation.subject) {
      setSubject(conversation.subject)
      return
    }
    onEdit({ subject: trimmed })
  }

  const status = STATUS_STYLE[conversation.status]

  const tagIds = conversation.tags.map((tag) => tag.id)
  const unapplied = allTags.filter((tag) => !tagIds.includes(tag.id))

  const setTags = (next: string[]) => {
    onEdit({ tagIds: next })
  }

  return (
    <header
      className="flex flex-none flex-col gap-1.5 border-b px-[18px] py-2.5"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <Link
          to={backTo}
          aria-label="Back to the list"
          className="-ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-[color:var(--hover)]"
        >
          <ArrowLeft className="size-4" />
        </Link>

        <input
          ref={inputRef}
          value={subject}
          onChange={(event) => {
            setSubject(event.target.value)
          }}
          onBlur={commitSubject}
          onKeyDown={(event) => {
            if (event.key === 'Enter') inputRef.current?.blur()
            if (event.key === 'Escape') setSubject(conversation.subject)
          }}
          aria-label="Conversation subject"
          title="Click to rename"
          className="min-w-0 flex-1 truncate bg-transparent text-[18px] font-semibold tracking-[-0.01em] outline-none"
        />

        <span
          className="shrink-0 font-mono text-[13px]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          #{conversation.number}
        </span>

        <SlaBadge sla={conversation.sla} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-[13px] font-medium"
              style={{ background: status.bg, color: status.fg }}
            >
              {status.label}
              <ChevronDown className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            {STATUSES.map((value) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => {
                  onEdit({ status: value })
                }}
              >
                {STATUS_STYLE[value].label}
                <kbd className="kbd ml-auto">{shortcutDisplay(STATUS_SHORTCUT[value])}</kbd>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px]"
              style={{ color: PRIORITY_COLOR[conversation.priority] }}
              title="Priority. SLA targets and AI suggestions both key off this."
            >
              <Flag className="size-3.5" />
              <span className="capitalize">{conversation.priority}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[140px]">
            {PRIORITIES.map((value) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => {
                  onEdit({ priority: value })
                }}
              >
                <Flag className="size-3.5" style={{ color: PRIORITY_COLOR[value] }} />
                <span className="capitalize">{value}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex shrink-0 items-center gap-0.5">
          {[
            { icon: UserRound, label: 'Assign', shortcut: 'assign' as const },
            { icon: Clock, label: 'Snooze', shortcut: 'snooze' as const },
          ].map(({ icon: Icon, label, shortcut }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={`${label} (${shortcutDisplay(shortcut)})`}
              className="flex size-8 items-center justify-center rounded-md hover:bg-[color:var(--hover)]"
            >
              <Icon className="size-4" style={{ color: 'var(--muted-foreground)' }} />
            </button>
          ))}

          {/* Last in the row, past the single purpose icons: everything in here changes the
              conversation as a whole rather than one property of it. */}
          {actions}
        </div>
      </div>

      {/* Tags sit under the subject rather than in the control row: they belong to what the
          conversation is about, not to what you can do to it, and there is no fixed number of
          them so they would push the actions around. */}
      <div className="flex flex-wrap items-center gap-1.5 pl-[26px]">
        {conversation.tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex h-[22px] items-center gap-1 rounded-[4px] pr-1 pl-2 text-[12px] font-medium"
            style={{ background: `color-mix(in srgb, ${tag.color} 16%, transparent)` }}
          >
            {tag.name}
            <button
              type="button"
              aria-label={`Remove the ${tag.name} tag`}
              onClick={() => {
                setTags(tagIds.filter((id) => id !== tag.id))
              }}
              className="flex size-4 items-center justify-center rounded-sm hover:bg-[color:var(--hover)]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Add a tag"
              title={`Add a tag (${shortcutDisplay('tag')})`}
              className="flex h-[22px] items-center gap-1 rounded-[4px] border border-dashed px-1.5 text-[12px]"
              style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
            >
              {conversation.tags.length === 0 ? (
                <>
                  <TagIcon className="size-3" aria-hidden="true" />
                  Add a tag
                </>
              ) : (
                <Plus className="size-3" aria-hidden="true" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[280px] w-[200px] overflow-y-auto">
            {unapplied.length === 0 ? (
              <p className="px-2 py-1.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                Every tag is already on this conversation.
              </p>
            ) : (
              unapplied.map((tag) => (
                <DropdownMenuItem
                  key={tag.id}
                  onSelect={() => {
                    setTags([...tagIds, tag.id])
                  }}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: tag.color }}
                    aria-hidden="true"
                  />
                  {tag.name}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
