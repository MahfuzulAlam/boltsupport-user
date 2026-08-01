import {
  ArrowRightLeft,
  CircleCheck,
  Clock,
  Sparkles,
  Tag as TagIcon,
  UserRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import type { AiEventMessage, SystemMessage } from '@/types'

const SYSTEM_ICON: Record<SystemMessage['systemEvent']['kind'], LucideIcon> = {
  assigned: UserRound,
  status: CircleCheck,
  workflow: Workflow,
  snoozed: Clock,
  tag: TagIcon,
  priority: ArrowRightLeft,
  merged: ArrowRightLeft,
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * A system event carries no rail. It is not authored content, and giving it one would imply an
 * origin it does not have.
 */
export function SystemEventLine({ message }: { message: SystemMessage }) {
  const Icon = SYSTEM_ICON[message.systemEvent.kind]

  return (
    <div
      className="flex items-center justify-center gap-2 py-2 text-[13px]"
      style={{ color: 'var(--muted-foreground)' }}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{message.systemEvent.detail}</span>
      <span className="font-mono text-[12px]" title={new Date(message.createdAt).toLocaleString()}>
        {timeOf(message.createdAt)}
      </span>
    </div>
  )
}

interface AiEventLineProps {
  message: AiEventMessage
  onUndo: (message: AiEventMessage) => void
}

/**
 * An AI event is also railless, but violet with a sparkle: it is a record of something the model
 * did, not something it wrote.
 *
 * The Undo button is live rather than decorative. AI-4 requires every state-changing AI action to
 * be undoable, and the window closing is what makes that promise honest instead of permanent.
 */
export function AiEventLine({ message, onUndo }: AiEventLineProps) {
  const now = useNow()
  const undoableUntil = message.aiEvent.undoableUntil
  const canUndo = undoableUntil !== undefined && Date.parse(undoableUntil) > now

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 py-2 text-[13px]"
      style={{ color: 'var(--ai)' }}
    >
      <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{message.aiEvent.detail}</span>
      {canUndo ? (
        <button
          type="button"
          onClick={() => {
            onUndo(message)
          }}
          className="font-medium underline underline-offset-2"
        >
          Undo
        </button>
      ) : null}
      <span
        className="font-mono text-[12px]"
        style={{ color: 'var(--muted-foreground)' }}
        title={new Date(message.createdAt).toLocaleString()}
      >
        {timeOf(message.createdAt)}
      </span>
    </div>
  )
}
