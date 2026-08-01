import { useEffect, useRef } from 'react'
import { SHORTCUT_LIST, type ShortcutId } from '@/lib/shortcuts'

export type ShortcutHandlers = Partial<Record<ShortcutId, (event: KeyboardEvent) => void>>

/** How long a chord lead key stays armed. Matches the prototype. */
const CHORD_WINDOW_MS = 1200

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

/**
 * A rich text surface. Cmd+K inside one inserts a link rather than opening the palette, so the
 * editor has to be identifiable from a document level listener. Tiptap renders contenteditable;
 * the data attribute lets any other editor opt in explicitly.
 */
function isEditorTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'TEXTAREA' ||
    target.closest('[data-rich-text-editor]') !== null
  )
}

/**
 * Is a dialog or a menu currently on top?
 *
 * An overlay owns the keyboard while it is up. Without this, Escape reached both the dialog and
 * the screen behind it: closing the raw source of a message also navigated back to the queue,
 * which reads as the app losing the agent's place. Plain keys are just as wrong, since `r` while
 * a menu is open should not open a composer nobody can see.
 *
 * Modifier combinations deliberately still run. Cmd+K is how the palette is closed again, and an
 * app level shortcut that stops working depending on what is on screen is worse than one that
 * always does the same thing.
 */
function overlayIsOpen(target: EventTarget | null): boolean {
  if (
    target instanceof HTMLElement &&
    target.closest('[role="dialog"], [role="alertdialog"], [role="menu"]') !== null
  ) {
    return true
  }
  // Focus is not always inside the overlay, so fall back to asking the document.
  return (
    document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]',
    ) !== null
  )
}

/**
 * Binds the global keyboard map.
 *
 * Handlers are keyed by shortcut id rather than by literal keys, so a binding can only be
 * registered for a shortcut that exists in `src/lib/shortcuts.ts` and the cheat sheet stays
 * truthful by construction. Listening in the capture phase means the app sees the key before a
 * focused widget can swallow it.
 */
export function useHotkeys(handlers: ShortcutHandlers, enabled = true): void {
  const handlersRef = useRef<ShortcutHandlers>(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!enabled) return

    let lead: string | null = null
    let leadTimer: number | undefined

    const clearLead = (): void => {
      lead = null
      if (leadTimer !== undefined) window.clearTimeout(leadTimer)
      leadTimer = undefined
    }

    const run = (id: ShortcutId, event: KeyboardEvent, preventDefault = true): boolean => {
      const handler = handlersRef.current[id]
      if (handler === undefined) return false
      if (preventDefault) event.preventDefault()
      handler(event)
      return true
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      const typing = isTypingTarget(event.target)
      const modified = event.metaKey || event.ctrlKey
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key

      // Modifier combinations first: they are unambiguous and several must work while typing.
      for (const shortcut of SHORTCUT_LIST) {
        if (shortcut.binding.type !== 'combo') continue
        const { key: comboKey, meta = false, shift = false } = shortcut.binding
        if (meta !== modified) continue
        if (shift !== event.shiftKey) continue
        if (comboKey.toLowerCase() !== key.toLowerCase()) continue
        if (typing && shortcut.allowWhileTyping !== true) continue
        // Cmd+K belongs to the editor when focus is inside one.
        if (shortcut.editorOwnsIt === true && isEditorTarget(event.target)) return
        if (run(shortcut.id, event)) return
      }

      if (modified) return

      // Past this line the keys belong to the screen, and a screen under an overlay is not the
      // one the agent is looking at.
      if (overlayIsOpen(event.target)) return

      // Escape is the only single key that must work while typing, so it is handled before
      // the typing guard.
      //
      // It is deliberately not prevented. Escape is a dismissal signal that several layers
      // legitimately consume at once, and Radix refuses to close an overlay when the event is
      // already defaultPrevented. Swallowing it here made dialogs impossible to close with the
      // keyboard, which is a bad trade for a shortcut layer whose whole point is keyboard use.
      if (event.key === 'Escape') {
        clearLead()
        run('discard', event, false)
        return
      }

      if (typing) return

      // A pending chord lead consumes the next key, whatever it is.
      if (lead !== null) {
        const pendingLead = lead
        clearLead()
        for (const shortcut of SHORTCUT_LIST) {
          if (shortcut.binding.type !== 'chord') continue
          if (shortcut.binding.lead !== pendingLead) continue
          if (shortcut.binding.key !== key) continue
          if (run(shortcut.id, event)) return
        }
        return
      }

      // Arm a lead only if some chord starting with it has a handler, so `g` still works as a
      // plain key elsewhere if nothing is listening.
      const armsChord = SHORTCUT_LIST.some(
        (s) =>
          s.binding.type === 'chord' &&
          s.binding.lead === key &&
          handlersRef.current[s.id] !== undefined,
      )
      if (armsChord) {
        event.preventDefault()
        lead = key
        leadTimer = window.setTimeout(clearLead, CHORD_WINDOW_MS)
        return
      }

      for (const shortcut of SHORTCUT_LIST) {
        if (shortcut.binding.type !== 'single') continue
        if (shortcut.binding.key.toLowerCase() !== key.toLowerCase()) continue
        if (run(shortcut.id, event)) return
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      clearLead()
    }
  }, [enabled])
}
