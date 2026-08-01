import { useCallback, useState } from 'react'

export interface SettingsForm<T> {
  /** The saved value with any pending edits laid over it. */
  value: T | undefined
  /** True once something has changed and not yet been saved. */
  dirty: boolean
  update: (patch: Partial<T>) => void
  discard: () => void
  /** The pending edits alone, for handing to a PATCH. Null when nothing changed. */
  edits: Partial<T> | null
  saved: () => void
}

/**
 * Draft state for a settings page.
 *
 * Every settings screen works the same way: a saved value from the server, edits held locally,
 * and a save bar that stays disabled until the two differ. Doing this once means "disabled until
 * dirty" is a property of the scaffold rather than a thing each page remembers to implement.
 */
export function useSettingsForm<T extends object>(saved: T | undefined): SettingsForm<T> {
  const [edits, setEdits] = useState<Partial<T> | null>(null)

  const update = useCallback((patch: Partial<T>) => {
    setEdits((current) => ({ ...current, ...patch }))
  }, [])

  const discard = useCallback(() => {
    setEdits(null)
  }, [])

  return {
    value: saved === undefined ? undefined : { ...saved, ...edits },
    dirty: edits !== null,
    update,
    discard,
    edits,
    saved: discard,
  }
}
