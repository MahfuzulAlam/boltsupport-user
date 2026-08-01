import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aiSettingsSchema, type AiSettings } from '@/types'
import { apiRequest } from '@/lib/api-client'
import { useAiSettings } from './use-ai'

/**
 * Local edits to the AI settings, saved explicitly.
 *
 * These pages change what the product does on its own, so nothing here autosaves. The draft
 * only comes into existence once something is edited: until then the stored settings are shown
 * directly. That avoids copying server state into local state in an effect, which is both a
 * cascading render and the usual source of a form that quietly shows stale values.
 */
export function useAiSettingsForm() {
  const query = useAiSettings()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<AiSettings | null>(null)

  const settings = draft ?? query.data ?? null

  const save = useMutation({
    mutationFn: (next: AiSettings) =>
      apiRequest('/ai/settings', aiSettingsSchema, { method: 'PATCH', body: next }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['ai', 'settings'], saved)
      setDraft(null)
      toast('Settings saved')
    },
    onError: () => {
      toast.error('Those settings did not save', { description: 'Nothing was changed.' })
    },
  })

  const dirty =
    draft !== null &&
    query.data !== undefined &&
    JSON.stringify(draft) !== JSON.stringify(query.data)

  return {
    settings,
    stored: query.data,
    isLoading: query.isPending,
    dirty,
    update: (patch: Partial<AiSettings>) => {
      setDraft((current) => {
        const base = current ?? query.data
        return base === undefined ? current : { ...base, ...patch }
      })
    },
    discard: () => {
      setDraft(null)
    },
    save: () => {
      if (draft !== null) save.mutate(draft)
    },
    /**
     * Applies and saves in one go, without waiting for a re-render.
     *
     * The kill switch needs this. Calling `update` then `save` looks right but cannot work: the
     * save closes over the draft from before the update, sees null, and does nothing at all,
     * which is the worst possible failure for a control whose whole job is to stop the AI now.
     */
    saveNow: (patch: Partial<AiSettings>) => {
      const base = draft ?? query.data
      if (base === undefined) return
      const next = { ...base, ...patch }
      setDraft(next)
      save.mutate(next)
    },
  }
}
