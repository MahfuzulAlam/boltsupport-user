import { useCallback, useState } from 'react'

/**
 * Forward is a third mode rather than a reply with a different address.
 *
 * The recipient is somebody who is not the customer, which changes who the message is safe to
 * say things about. Modelling it as a mode means the To field, the send label, and the record
 * kept on the sent message all move together, the same way Note moves as one piece.
 */
export type ComposerMode = 'reply' | 'note' | 'forward'

export interface ComposerDraft {
  mode: ComposerMode
  html: string
  cc: string
  bcc: string
  showCc: boolean
  showBcc: boolean
  /** Only used in forward mode, where the recipient is typed rather than derived. */
  to: string
}

const EMPTY: ComposerDraft = {
  mode: 'reply',
  html: '',
  cc: '',
  bcc: '',
  showCc: false,
  showBcc: false,
  to: '',
}

function storageKey(conversationId: string): string {
  return `boltsupport.draft.${conversationId}`
}

function read(conversationId: string): ComposerDraft {
  try {
    const raw = localStorage.getItem(storageKey(conversationId))
    if (raw === null) return EMPTY
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return EMPTY
    return { ...EMPTY, ...(parsed as Partial<ComposerDraft>) }
  } catch {
    // A corrupted draft should not stop the agent from replying.
    return EMPTY
  }
}

/**
 * Draft persistence (FR-3.7).
 *
 * Kept per conversation and written on every change, because the thing an agent will never
 * forgive is losing a long reply to a reload or a misclick. It is body text, not a credential,
 * so localStorage is the right place for it; it is cleared the moment the message is sent.
 */
/**
 * Whether a conversation has a saved draft, without mounting the composer.
 *
 * The thread shows Reply and Note buttons until one is pressed, so something has to be able to
 * say "you left a draft here" while the composer is still closed. Reading the same key the
 * composer writes keeps the two from disagreeing.
 */
export function hasStoredDraft(conversationId: string): boolean {
  return (
    read(conversationId)
      .html.replace(/<[^>]*>/g, '')
      .trim() !== ''
  )
}

/**
 * Puts a discarded draft back.
 *
 * Undo has to survive the composer closing, and by then the hook's state is gone with it. Writing
 * straight to the same key means the draft is there again the moment the composer is reopened,
 * which is what "undo" has to mean for an action whose whole point was to leave.
 */
export function restoreStoredDraft(conversationId: string, draft: ComposerDraft): void {
  try {
    localStorage.setItem(storageKey(conversationId), JSON.stringify(draft))
  } catch {
    // A blocked write costs the restore, not the app.
  }
}

export function useComposerDraft(
  conversationId: string,
  initialMode?: ComposerMode,
  /** Seeds an empty forward with the quoted thread. Ignored once there is a draft to keep. */
  initialHtml?: string,
) {
  // Switching conversations is handled by remounting the composer with a key, not by an effect
  // that swaps state after the fact. That avoids a cascading render and resets the editor along
  // with the draft, which is what "a different conversation" should mean.
  const [draft, setDraft] = useState<ComposerDraft>(() => {
    const stored = read(conversationId)
    const withMode = initialMode === undefined ? stored : { ...stored, mode: initialMode }
    // Seeding happens here rather than in an effect, so the editor mounts with the quote
    // already in it and never flashes empty. A draft in progress always wins.
    const empty = withMode.html.replace(/<[^>]*>/g, '').trim() === ''
    return empty && initialHtml !== undefined ? { ...withMode, html: initialHtml } : withMode
  })

  const update = useCallback(
    (patch: Partial<ComposerDraft>) => {
      setDraft((current) => {
        const next = { ...current, ...patch }
        try {
          localStorage.setItem(storageKey(conversationId), JSON.stringify(next))
        } catch {
          // A blocked write only costs persistence, not the draft in front of them.
        }
        return next
      })
    },
    [conversationId],
  )

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(conversationId))
    } catch {
      // Nothing to do; the in-memory reset below is what the agent sees.
    }
    setDraft(EMPTY)
  }, [conversationId])

  /** True when there is something worth warning about before discarding. */
  const isDirty = draft.html.replace(/<[^>]*>/g, '').trim() !== ''

  return { draft, update, clear, isDirty }
}
