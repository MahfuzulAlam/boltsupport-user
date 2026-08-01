import type { AiEventMessage, Message } from '@/types'
import { AuthoredMessage } from './AuthoredMessage'
import { AiEventLine, SystemEventLine } from './EventLine'

interface MessageBubbleProps {
  message: Message
  /** Gates the per message AI actions, so a workspace with AI off shows no AI affordances. */
  aiEnabled: boolean
  /** Owned by the thread so Collapse all and Expand all can reach every message at once. */
  open: boolean
  onToggleOpen: () => void
  hideDetails: boolean
  onUndoAiEvent: (message: AiEventMessage) => void
}

/**
 * Dispatches a message to its treatment.
 *
 * `Message` is a discriminated union, so this switch is exhaustive: adding a sixth message type
 * without giving it a rail treatment is a compile error rather than a message that silently
 * renders as something it is not.
 */
export function MessageBubble({
  message,
  aiEnabled,
  open,
  onToggleOpen,
  hideDetails,
  onUndoAiEvent,
}: MessageBubbleProps) {
  switch (message.type) {
    case 'customer':
    case 'reply':
    case 'note':
      return (
        <AuthoredMessage
          message={message}
          aiEnabled={aiEnabled}
          open={open}
          onToggleOpen={onToggleOpen}
          hideDetails={hideDetails}
        />
      )
    case 'system':
      return <SystemEventLine message={message} />
    case 'ai_event':
      return <AiEventLine message={message} onUndo={onUndoAiEvent} />
  }
}
