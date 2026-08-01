import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Article } from '@/types'
import { fetchArticle, patchArticle, type ArticlePatch } from '../api/articles'

const AUTOSAVE_DELAY_MS = 1200

export type SaveState = 'idle' | 'unsaved' | 'saving' | 'saved'

/**
 * The article editor's state.
 *
 * Autosave is debounced rather than on every keystroke, so a paragraph in progress does not
 * generate a request per character. The unsaved-changes guard is a real beforeunload handler:
 * the incumbent's editor losing work is the complaint that drove people away from it, and an
 * autosave that has not fired yet is exactly when a close would cost something.
 */
export function useArticleEditor(articleId: string) {
  const queryClient = useQueryClient()
  const [edits, setEdits] = useState<ArticlePatch | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const timerRef = useRef<number | undefined>(undefined)

  const query = useQuery({
    queryKey: ['article', articleId],
    queryFn: ({ signal }) => fetchArticle(articleId, signal),
  })

  const save = useMutation({
    mutationFn: (patch: ArticlePatch) => patchArticle(articleId, patch),
    onSuccess: (saved: Article) => {
      queryClient.setQueryData(['article', articleId], saved)
      void queryClient.invalidateQueries({ queryKey: ['articles'] })
      setEdits(null)
      setSaveState('saved')
    },
    onError: () => {
      // Keep the edits: a failed save must never silently discard what was typed.
      setSaveState('unsaved')
    },
  })

  const article: Article | undefined =
    query.data === undefined ? undefined : { ...query.data, ...edits }

  const update = useCallback((patch: ArticlePatch) => {
    setEdits((current) => ({ ...current, ...patch }))
    setSaveState('unsaved')
  }, [])

  const flush = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    if (edits === null) return
    setSaveState('saving')
    save.mutate(edits)
  }, [edits, save])

  // Debounced autosave.
  useEffect(() => {
    if (edits === null) return
    timerRef.current = window.setTimeout(() => {
      setSaveState('saving')
      save.mutate(edits)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    }
    // `save` is stable enough for this; re-running on every mutation identity change would
    // restart the timer forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edits])

  // The guard, for the window between the last keystroke and the autosave landing.
  const hasUnsaved = edits !== null
  useEffect(() => {
    if (!hasUnsaved) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [hasUnsaved])

  return {
    article,
    isLoading: query.isPending,
    isError: query.isError,
    saveState,
    hasUnsaved,
    update,
    flush,
  }
}
