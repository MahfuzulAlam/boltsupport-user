import { useCallback, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  ChevronDown,
  CircleCheck,
  Clock,
  Maximize2,
  Minimize2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { sendLaterPresets, snoozePresets } from '@/lib/when'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { cn } from '@/lib/utils'
import { useAiSettings } from '@/features/ai'
import {
  restoreStoredDraft,
  useComposerDraft,
  type ComposerMode,
} from '../hooks/use-composer-draft'
import { useSendMessage } from '../hooks/use-send-message'
import { MERGE_FIELDS } from '../merge-field'
import { RecipientFields } from './RecipientFields'
import { WhenDialog, type WhenChoice } from '@/components/WhenDialog'
import { TiptapEditor } from './TiptapEditor'
import { SlashCommandMenu, type SlashAction } from './SlashCommandMenu'
import { InsertPicker, type InsertSource } from './InsertPicker'
import { SplitSendButton, type SendVariant } from './SplitSendButton'
import { AttachmentList, type PendingAttachment } from './AttachmentList'
import { AutoDraftOptions } from './AutoDraftOptions'
import { AutoDraftBanner } from './AutoDraftBanner'
import { CheckReplyPanel, type CheckResult } from './CheckReplyPanel'
import { DEFAULT_DRAFT_OPTIONS, useAutoDraft, type DraftOptions } from '../hooks/use-auto-draft'
import { apiRequest } from '@/lib/api-client'
import { z } from 'zod'

/** Good enough to stop an obvious mistake, loose enough not to argue about valid addresses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The three a reply can sensibly leave a conversation in. Spam is a header decision. */
const SEND_STATUSES = ['active', 'pending', 'closed'] as const
type SendStatus = (typeof SEND_STATUSES)[number]

const STATUS_LABEL: Record<SendStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  closed: 'Closed',
}

/**
 * One control in the pill riding the composer's top edge.
 *
 * A real tooltip rather than a `title`, because these are icons with no label and the native one
 * takes a second to appear and cannot be styled to match. The hover fill is a full circle so the
 * target reads as the size it actually is.
 */
function PillButton({
  label,
  ariaLabel,
  pressed,
  onClick,
  children,
}: {
  label: string
  ariaLabel?: string
  pressed?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel ?? label}
          {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
          className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--hover)]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

function initials(name: string | undefined): string {
  if (name === undefined) return '?'
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export interface ComposerAssignment {
  /** Who owns the conversation now. Undefined means nobody does. */
  assignee: { id: string; name: string } | undefined
  options: { id: string; name: string }[]
  onAssign: (userId: string | null) => void
}

interface ComposerProps {
  conversationId: string
  recipient: string
  /** Where the conversation is now, so the status pill opens on the truth. */
  status?: SendStatus
  /** Applies the status the pill is showing once the message is away. */
  onStatusOnSend?: (status: SendStatus) => void
  /** Reassignment from the send row. Omitted on screens with no conversation to assign. */
  assignment?: ComposerAssignment
  /** Defers the conversation. Omitted where there is nothing to snooze. */
  onSnooze?: (choice: WhenChoice) => void
  /** Which mode the agent asked for when they opened it. */
  initialMode?: ComposerMode
  /** Present when the composer can be dismissed back to the Reply and Note buttons. */
  onClose?: () => void
  /** Present when the composer can fill the conversation pane. */
  expanded?: boolean
  onToggleExpand?: () => void
  /** The thread, already quoted, for a forward that starts empty. */
  forwardQuote?: string
}

/**
 * The reply surface, docked to the bottom of the conversation.
 *
 * Note mode changes the rail, the fill, the placeholder, and the send label together, because
 * one cue is not enough to stop a note reaching a customer.
 */
export function Composer({
  conversationId,
  recipient,
  status = 'active',
  onStatusOnSend,
  assignment,
  onSnooze,
  initialMode,
  onClose,
  expanded = false,
  onToggleExpand,
  forwardQuote,
}: ComposerProps) {
  const { draft, update, clear, isDirty } = useComposerDraft(
    conversationId,
    initialMode,
    initialMode === 'forward' ? forwardQuote : undefined,
  )
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [slashOpen, setSlashOpen] = useState(false)
  const [insertSource, setInsertSource] = useState<InsertSource | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const openPicker = useRef<() => void>(() => undefined)
  const aiSettings = useAiSettings()
  const aiEnabled = aiSettings.data?.enabled === true && aiSettings.data.autoDraft.enabled

  const isNote = draft.mode === 'note'
  const isForward = draft.mode === 'forward'
  const [sendStatus, setSendStatus] = useState<SendStatus>(status)
  const [snoozing, setSnoozing] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  /*
   * One clock reading for the whole dialog.
   *
   * Taken when the dialog opens rather than on every render, so the presets do not shuffle
   * under the pointer and the parser agrees with the row the agent is looking at.
   */
  const [openedAt, setOpenedAt] = useState(() => new Date())
  const [draftPanelOpen, setDraftPanelOpen] = useState(false)
  const [draftOptions, setDraftOptions] = useState<DraftOptions>(DEFAULT_DRAFT_OPTIONS)
  const [check, setCheck] = useState<CheckResult | null>(null)

  const autoDraft = useAutoDraft({
    conversationId,
    lowConfidenceThreshold: aiSettings.data?.autoDraft.lowConfidenceThreshold ?? 0.6,
    onStream: (text) => {
      update({ html: `<p>${text}</p>` })
    },
    onDiscard: (previous) => {
      update({ html: previous })
    },
  })

  const isAiDraft = autoDraft.state === 'generating' || autoDraft.state === 'review'

  const restoreDraft = useCallback(
    (payload: { bodyHtml: string; mode: ComposerMode }) => {
      update({ html: payload.bodyHtml, mode: payload.mode })
    },
    [update],
  )

  const { send, undoLast } = useSendMessage({
    onRestoreDraft: restoreDraft,
    onSent: () => {
      clear()
      setAttachments([])
      editorRef.current?.commands.clearContent()
      // A sent reply is the end of the interaction, so the thread gets its space back.
      onClose?.()
    },
  })

  const submit = (variant: SendVariant = 'send') => {
    if (!isDirty) return
    // A forward with nowhere to go is the one send that cannot be undone into something useful,
    // so it is refused before the undo window rather than after it.
    if (isForward && !EMAIL.test(draft.to.trim())) {
      toast.error('Add an address to forward to', {
        description: 'A forward goes to somebody outside this conversation.',
      })
      return
    }
    if (variant === 'send-later') {
      setOpenedAt(new Date())
      setScheduling(true)
      return
    }
    if (variant === 'send-snooze') {
      setOpenedAt(new Date())
      setSnoozing(true)
      return
    }
    send({
      conversationId,
      mode: draft.mode,
      bodyHtml: draft.html,
      attachments,
      ...(isForward ? { forwardedTo: draft.to.trim() } : {}),
    })
    // The pill is the decision; the split menu is a shortcut to the same one.
    const landing = variant === 'send-close' ? 'closed' : sendStatus
    if (!isNote && landing !== status) onStatusOnSend?.(landing)
  }

  const onSlashSelect = (action: SlashAction) => {
    setSlashOpen(false)
    const editor = editorRef.current

    switch (action) {
      case 'variable': {
        const field = MERGE_FIELDS[0]
        editor
          ?.chain()
          .focus()
          .insertContent({
            type: 'mergeField',
            attrs: { token: field.token, fallback: field.fallback },
          })
          .run()
        break
      }
      case 'code':
        editor?.chain().focus().toggleCodeBlock().run()
        break
      case 'blockquote':
        editor?.chain().focus().toggleBlockquote().run()
        break
      case 'attachment':
      case 'image':
        openPicker.current()
        break
      case 'insert-doc':
        setInsertSource('doc')
        break
      case 'saved-reply':
        setInsertSource('saved-reply')
        break
      case 'draft-with-ai':
        void autoDraft.generate(draftOptions, draft.html)
        break
      default:
        toast(`${action.replace('-', ' ')} arrives with its screen`)
    }
  }

  /**
   * Throw the draft away.
   *
   * Destructive and one click from the edge of the card, so it pairs with a real Undo rather than
   * a confirmation dialog: the snapshot goes back to the same storage key the composer reads on
   * open, which is what makes undoing survive the composer closing behind it.
   */
  const discard = () => {
    const snapshot = { ...draft }
    const hadContent = isDirty
    clear()
    editorRef.current?.commands.clearContent()
    onClose?.()

    if (hadContent) {
      toast('Draft discarded', {
        action: {
          label: 'Undo',
          onClick: () => {
            restoreStoredDraft(conversationId, snapshot)
            toast('Draft restored', { description: 'Open the reply again to carry on.' })
          },
        },
      })
    }
  }

  const runCheck = async () => {
    const text = draft.html.replace(/<[^>]*>/g, ' ').trim()
    if (text === '') return
    const result = await apiRequest(
      '/ai/evaluations/check',
      z.object({
        score: z.number(),
        criteria: z.array(
          z.object({
            key: z.enum(['accuracy', 'completeness', 'tone', 'clarity', 'policy']),
            verdict: z.enum(['pass', 'warn', 'fail']),
            note: z.string(),
          }),
        ),
        unansweredQuestion: z.string().optional(),
        rationale: z.string(),
      }),
      { method: 'POST', body: { text } },
    )
    setCheck(result)
  }

  useHotkeys({
    reply: () => {
      update({ mode: 'reply' })
      editorRef.current?.commands.focus()
    },
    note: () => {
      update({ mode: 'note' })
      editorRef.current?.commands.focus()
    },
    send: () => {
      submit()
    },
    undoSend: () => {
      if (!undoLast()) toast('Nothing to undo')
    },
    draftWithAi: () => {
      if (aiEnabled && !isNote) void autoDraft.generate(draftOptions, draft.html)
    },
    checkReply: () => {
      void runCheck()
    },
    savedReplies: () => {
      setInsertSource('saved-reply')
    },
    docsSearch: () => {
      setInsertSource('doc')
    },
    showCc: () => {
      update({ showCc: true })
    },
    showBcc: () => {
      update({ showBcc: true })
    },
  })

  return (
    <div
      className={cn('flex flex-col px-5 pt-5 pb-4', expanded ? 'min-h-0 flex-1' : 'flex-none')}
      style={{ background: 'var(--background)' }}
    >
      {/*
       * One card, not a toolbar above a box.
       *
       * The tabs are gone because the mode is already chosen before this opens: Reply and Note
       * at the end of the thread decide it, and inside here the rail, the fill, the placeholder
       * and the send label all still carry it. The window controls ride the top edge rather than
       * sitting in a row of their own, which buys the reply surface back the vertical space a
       * chrome row was taking.
       */}
      {/*
       * One even border on all four sides.
       *
       * The rail is gone from the composer, but what it encoded is not: the border itself takes
       * the accent, so a note is still amber and an AI draft still violet all the way round.
       * Provenance survives; only the thick left edge does.
       */}
      <div
        className={cn(
          'relative flex w-full rounded-xl border px-4 py-3.5 transition-shadow',
          /* Lifts while it has focus.
             A composer is the one surface on this screen you are working *in* rather than
             reading, so it earns a little elevation to say so, and drops back the moment you
             click away. Focus within rather than a state flag: the editor, the fields and every
             control in the row all count as being in it. */
          'focus-within:shadow-[0_10px_28px_-12px_hsl(222_24%_11%/0.28)]',
          'focus-within:ring-[3px] focus-within:ring-[color:var(--ring)]/35',
          expanded && 'min-h-0 flex-1',
        )}
        data-composer-mode={draft.mode}
        style={{
          borderColor: isAiDraft ? 'var(--ai)' : isNote ? 'var(--warning)' : 'var(--border)',
          background: isAiDraft ? 'var(--ai-soft)' : isNote ? 'var(--note)' : 'var(--card)',
        }}
      >
        {onClose !== undefined || onToggleExpand !== undefined ? (
          <div
            className="absolute -top-4 right-5 flex items-center gap-0.5 rounded-full border px-1 py-1 shadow-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            {/* Save and close first.

                The draft is already written on every keystroke, so this button does not create
                the safety, it makes it visible. Someone who has typed half a reply and needs to
                move on wants to be told it is kept, not to infer it from an X. */}
            {onClose !== undefined ? (
              <PillButton
                label="Save & close"
                onClick={() => {
                  if (isDirty) {
                    toast('Saved as a draft', {
                      description: 'It is waiting here when you come back.',
                    })
                  }
                  onClose()
                }}
              >
                <CircleCheck className="size-4" />
              </PillButton>
            ) : null}

            {onToggleExpand !== undefined ? (
              <PillButton
                label={expanded ? 'Back to the thread' : 'Fill the pane'}
                ariaLabel={expanded ? 'Shrink the composer' : 'Expand the composer'}
                pressed={expanded}
                onClick={onToggleExpand}
              >
                {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </PillButton>
            ) : null}

            {onClose !== undefined ? (
              <PillButton label="Discard this draft" onClick={discard}>
                <Trash2 className="size-4" />
              </PillButton>
            ) : null}
          </div>
        ) : null}

        <div className={cn('flex min-w-0 flex-1 flex-col', expanded && 'min-h-0')}>
          {/* Right padding keeps Cc and Bcc clear of the window controls riding the top edge. */}
          <div className="pr-[76px]">
            <RecipientFields draft={draft} recipient={recipient} onUpdate={update} />
          </div>

          <div className={cn('mt-1.5', expanded && 'min-h-0 flex-1 overflow-y-auto')}>
            <TiptapEditor
              mode={draft.mode}
              html={draft.html}
              onChange={(html) => {
                update({ html })
                if (autoDraft.state === 'review') autoDraft.markEdited()
              }}
              onSlashTrigger={() => {
                setSlashOpen(true)
              }}
              onReady={(editor) => {
                editorRef.current = editor
              }}
            />
          </div>

          {autoDraft.state === 'review' && autoDraft.result !== null ? (
            <AutoDraftBanner
              lowConfidence={autoDraft.isLowConfidence}
              injectionDetected={autoDraft.result.injectionDetected}
              sources={autoDraft.result.sources}
              canAcceptInOneClick={autoDraft.canAcceptInOneClick}
              onAccept={autoDraft.accept}
              onRegenerate={() => void autoDraft.generate(draftOptions, draft.html)}
              onDiscard={autoDraft.discard}
            />
          ) : null}

          {check !== null ? (
            <CheckReplyPanel
              result={check}
              onDismiss={() => {
                setCheck(null)
              }}
            />
          ) : null}

          <AttachmentList
            attachments={attachments}
            onAdd={(files) => {
              setAttachments((current) => [...current, ...files])
            }}
            onRemove={(id) => {
              setAttachments((current) => current.filter((file) => file.id !== id))
            }}
            registerPicker={(open) => {
              openPicker.current = open
            }}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSlashOpen((open) => !open)
              }}
              className="flex h-[34px] items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            >
              <Plus className="size-4" />
              Insert
            </button>

            <button
              type="button"
              aria-label="Formatting"
              title="Formatting"
              onClick={() => {
                editorRef.current?.chain().focus().toggleBold().run()
              }}
              className="flex size-[34px] items-center justify-center rounded-full text-[14px] font-medium"
              style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
            >
              Aa
            </button>

            {/* One AI control, not two labels competing with Insert for the row. The panel that
                asks for tone and length hangs off this same button, so choosing Draft with AI
                lands where the eye already is. */}
            {isNote ? null : (
              <AutoDraftOptions
                options={draftOptions}
                onChange={setDraftOptions}
                onGenerate={() => void autoDraft.generate(draftOptions, draft.html)}
                open={draftPanelOpen}
                onOpenChange={setDraftPanelOpen}
              >
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="AI actions"
                        title="AI actions"
                        className="flex size-[34px] items-center justify-center rounded-full"
                        style={{ background: 'var(--ai-soft)', color: 'var(--ai)' }}
                      >
                        <Sparkles className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-[190px]">
                      {aiEnabled ? (
                        <>
                          <DropdownMenuItem
                            onSelect={() => {
                              setDraftPanelOpen(true)
                            }}
                          >
                            <Sparkles className="size-3.5" style={{ color: 'var(--ai)' }} />
                            <span style={{ color: 'var(--ai)' }}>Draft with AI</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!isDirty}
                            onSelect={() => {
                              void runCheck()
                            }}
                          >
                            <ShieldCheck className="size-3.5" style={{ color: 'var(--ai)' }} />
                            <span style={{ color: 'var(--ai)' }}>Check reply</span>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <p
                          className="px-2 py-1.5 text-[13px]"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          AI features are turned off for this workspace.
                        </p>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </AutoDraftOptions>
            )}

            {autoDraft.isUnedited ? (
              <span
                title="You have not edited the AI draft"
                className="flex h-[26px] items-center gap-1.5 rounded-[13px] border border-dashed px-2.5 text-[12px] font-medium"
                style={{ borderColor: 'var(--ai)', color: 'var(--ai)' }}
              >
                <Sparkles className="size-3" aria-hidden="true" />
                Unedited AI draft
              </span>
            ) : null}

            <div className="ml-auto flex items-center gap-2">
              {/* Where the conversation lands once this is sent. A pill rather than a menu item,
                  because deciding it before writing is what stops a thread sitting Active after
                  it has actually been answered. */}
              {isNote ? null : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Status after sending: ${STATUS_LABEL[sendStatus]}`}
                      className="flex h-[34px] items-center gap-1 rounded-full px-3.5 text-[14px] font-medium"
                      style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
                    >
                      {STATUS_LABEL[sendStatus]}
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[170px]">
                    {SEND_STATUSES.map((value) => (
                      <DropdownMenuItem
                        key={value}
                        onSelect={() => {
                          setSendStatus(value)
                        }}
                      >
                        {STATUS_LABEL[value]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Who owns it once this is sent. Right next to Send because handing a thread on
                  is part of answering it, not a separate errand. */}
              {assignment !== undefined && !isNote ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Assigned to ${assignment.assignee?.name ?? 'nobody'}`}
                      className="flex h-[34px] items-center gap-1.5 rounded-full pr-3 pl-1 text-[14px] font-medium"
                      style={{ background: 'var(--muted)' }}
                    >
                      <Avatar className="size-[26px]">
                        <AvatarFallback
                          className="text-[11px] font-medium"
                          style={{ background: 'var(--brand)', color: 'hsl(0 0% 100%)' }}
                        >
                          {initials(assignment.assignee?.name)}
                        </AvatarFallback>
                      </Avatar>
                      {assignment.assignee === undefined ? 'Unassigned' : 'Me'}
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-[280px] w-[200px] overflow-y-auto"
                  >
                    <DropdownMenuItem
                      onSelect={() => {
                        assignment.onAssign(null)
                      }}
                    >
                      Unassigned
                    </DropdownMenuItem>
                    {assignment.options.map((user) => (
                      <DropdownMenuItem
                        key={user.id}
                        onSelect={() => {
                          assignment.onAssign(user.id)
                        }}
                      >
                        {user.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              {onSnooze !== undefined && !isNote ? (
                <button
                  type="button"
                  aria-label="Snooze this conversation"
                  title="Snooze"
                  onClick={() => {
                    setOpenedAt(new Date())
                    setSnoozing(true)
                  }}
                  className="flex size-[34px] items-center justify-center rounded-full"
                  style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                >
                  <Clock className="size-4" />
                </button>
              ) : null}

              {/* No Send later icon here: it already lives in the Send menu, and one action
                  reachable two ways from the same row is a row that reads as longer than it is. */}
              <SplitSendButton
                label={isNote ? 'Add note' : isForward ? 'Forward' : 'Send'}
                action={isNote ? 'Add note' : isForward ? 'Forward' : 'Send reply'}
                disabled={!isDirty}
                onSend={submit}
              />
            </div>
          </div>

          <WhenDialog
            title="Snooze until"
            description="The conversation leaves the queue and comes back at the time you pick."
            presets={snoozePresets(openedAt)}
            open={snoozing}
            onOpenChange={setSnoozing}
            now={openedAt}
            onChoose={(choice) => {
              onSnooze?.(choice)
            }}
          />

          <WhenDialog
            title="Send later"
            description="The reply is held and goes out at the time you pick."
            presets={sendLaterPresets(openedAt)}
            open={scheduling}
            onOpenChange={setScheduling}
            now={openedAt}
            onChoose={(choice) => {
              toast(`Scheduled for ${format(choice.at, 'EEE d MMM, h:mm a')}`, {
                description:
                  choice.condition === 'if-no-reply'
                    ? 'It will not go out if the customer replies first.'
                    : 'It goes out whether or not the customer replies.',
              })
            }}
          />

          <SlashCommandMenu
            open={slashOpen}
            aiEnabled={aiEnabled}
            onSelect={onSlashSelect}
            onClose={() => {
              setSlashOpen(false)
            }}
          />

          {insertSource !== null ? (
            <InsertPicker
              source={insertSource}
              onInsert={(html) => {
                editorRef.current?.chain().focus().insertContent(html).run()
              }}
              onClose={() => {
                setInsertSource(null)
                editorRef.current?.commands.focus()
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
