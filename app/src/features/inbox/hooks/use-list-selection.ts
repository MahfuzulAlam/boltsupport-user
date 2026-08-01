import { useCallback, useMemo, useState } from 'react'

/**
 * Multi select for the queue (FR-1.8).
 *
 * Selection is keyed by conversation id rather than by row index, so it survives the list
 * re-sorting, a page loading in, or an optimistic update reordering rows underneath it.
 */
export function useListSelection(visibleIds: string[]) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(visibleIds))
  }, [visibleIds])

  const clear = useCallback(() => {
    setSelected(new Set())
  }, [])

  const selectedIds = useMemo(() => [...selected], [selected])

  return {
    selected,
    selectedIds,
    count: selected.size,
    hasSelection: selected.size > 0,
    allSelected: visibleIds.length > 0 && visibleIds.every((id) => selected.has(id)),
    toggle,
    selectAll,
    clear,
  }
}
