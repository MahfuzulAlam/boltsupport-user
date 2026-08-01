import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CodeXml,
  Eye,
  EyeOff,
  Languages,
  Link2,
  MessageSquarePlus,
  MoreVertical,
  Pencil,
  Sparkles,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { READING_LANGUAGE } from '@/lib/language'
import type { AuthoredMessage } from '@/types'

interface MessageActionsProps {
  message: AuthoredMessage
  aiEnabled: boolean
  translating: boolean
  translated: boolean
  onEdit: () => void
  onToggleHidden: () => void
  onShowOriginal: () => void
  onTranslate: (targetLanguage: string) => void
  onClearTranslation: () => void
}

/**
 * Per message actions.
 *
 * These are the things an agent does to one message rather than to the conversation: redact a
 * password out of it, fold it away, split it into its own thread, read the headers, link a
 * colleague straight to it, or read it in a language they speak.
 *
 * Translate sits below a separator in violet with the sparkle, because it is the only item here
 * that produces AI output and the one item whose result must never be mistaken for what the
 * customer actually wrote (AI-5).
 */
export function MessageActions({
  message,
  aiEnabled,
  translating,
  translated,
  onEdit,
  onToggleHidden,
  onShowOriginal,
  onTranslate,
  onClearTranslation,
}: MessageActionsProps) {
  const navigate = useNavigate()
  const params = useParams()
  const inboxId = params['inboxId'] ?? 'in1'

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#message-${message.id}`
    void navigator.clipboard
      .writeText(url)
      .then(() => {
        toast('Link copied', { description: 'It opens this conversation at this message.' })
      })
      .catch(() => {
        toast.error('We could not copy that link', { description: 'Copy it from the address bar.' })
      })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for the message from ${message.author.name}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-[color:var(--hover)]"
        >
          <MoreVertical className="size-4" style={{ color: 'var(--muted-foreground)' }} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[212px]">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="size-3.5" />
          Edit
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onToggleHidden}>
          {message.hidden === true ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {message.hidden === true ? 'Show' : 'Hide'}
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => {
            void navigate(`/inbox/${inboxId}/new`)
          }}
        >
          <MessageSquarePlus className="size-3.5" />
          New conversation
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onShowOriginal}>
          <CodeXml className="size-3.5" />
          Show original
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={copyLink}>
          <Link2 className="size-3.5" />
          Copy link to thread
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {!aiEnabled ? (
          <p className="px-2 py-1.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            AI features are turned off for this workspace.
          </p>
        ) : translated ? (
          <DropdownMenuItem onSelect={onClearTranslation}>
            <Languages className="size-3.5" style={{ color: 'var(--ai)' }} />
            <span style={{ color: 'var(--ai)' }}>Show the original wording</span>
          </DropdownMenuItem>
        ) : (
          /*
           * One click, not a language submenu.
           *
           * The common case by a wide margin is "put this in the language I am reading the app
           * in", so that is what the menu does. Choosing a different language belongs on the
           * translation itself, where an agent can see what they got before changing it.
           */
          <DropdownMenuItem
            disabled={translating}
            onSelect={() => {
              onTranslate(READING_LANGUAGE)
            }}
          >
            <Sparkles className="size-3.5" style={{ color: 'var(--ai)' }} aria-hidden="true" />
            <span style={{ color: 'var(--ai)' }}>
              {translating ? 'Translating' : 'AI translate'}
            </span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
