import { useCallback, useEffect, useRef, useState } from 'react'
import type { AiSource, AiTone, AiLength } from '@/types'

export interface DraftOptions {
  tone: AiTone
  length: AiLength
  language: string
  useKnowledgeBase: boolean
  includeNextSteps: boolean
}

export const DEFAULT_DRAFT_OPTIONS: DraftOptions = {
  tone: 'friendly',
  length: 'standard',
  language: 'English',
  useKnowledgeBase: true,
  includeNextSteps: true,
}

export type DraftState = 'idle' | 'generating' | 'review'

export interface DraftResult {
  text: string
  sources: AiSource[]
  confidence: number
  injectionDetected: boolean
}

interface UseAutoDraftOptions {
  conversationId: string
  lowConfidenceThreshold: number
  /** Called with each partial body so the editor can show it arriving. */
  onStream: (text: string) => void
  /** Restores whatever the agent had written before the draft replaced it. */
  onDiscard: (previous: string) => void
}

/**
 * Auto Draft.
 *
 * The one rule this hook exists to enforce: **it never sends**. It produces text, a confidence,
 * and a set of citations, and hands them to the composer in a review state. Sending stays a
 * separate, deliberate human action (AI-1, FR-4.11). There is deliberately no code path from
 * here to the send endpoint.
 *
 * `edited` tracks whether the agent has touched the draft, which drives the unedited notice
 * (FR-4.17) rather than blocking anything.
 */
export function useAutoDraft({
  conversationId,
  lowConfidenceThreshold,
  onStream,
  onDiscard,
}: UseAutoDraftOptions) {
  const [state, setState] = useState<DraftState>('idle')
  const [result, setResult] = useState<DraftResult | null>(null)
  const [edited, setEdited] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const snapshotRef = useRef<string>('')

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  useEffect(() => cancel, [cancel])

  const generate = useCallback(
    async (options: DraftOptions, currentBody: string) => {
      // A second generate replaces the first rather than racing it.
      cancel()
      const controller = new AbortController()
      abortRef.current = controller

      // Snapshot whatever was there so Discard can put it back.
      if (state !== 'review') snapshotRef.current = currentBody
      setState('generating')
      setResult(null)
      setEdited(false)
      onStream('')

      try {
        const response = await fetch(`/api/ai/drafts/${conversationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tone: options.tone,
            length: options.length,
            useKnowledgeBase: options.useKnowledgeBase,
            includeNextSteps: options.includeNextSteps,
          }),
          signal: controller.signal,
        })
        if (!response.ok || response.body === null) throw new Error('draft stream failed')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let text = ''
        let meta: Omit<DraftResult, 'text'> | null = null

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.trim() === '') continue
            const chunk = JSON.parse(line) as
              { type: 'text'; value: string } | { type: 'meta'; meta: Omit<DraftResult, 'text'> }

            if (chunk.type === 'text') {
              text = text === '' ? chunk.value : `${text} ${chunk.value}`
              onStream(text)
            } else {
              meta = chunk.meta
            }
          }
        }

        if (controller.signal.aborted) return

        setResult({
          text,
          sources: meta?.sources ?? [],
          confidence: meta?.confidence ?? 0,
          injectionDetected: meta?.injectionDetected ?? false,
        })
        setState('review')
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          return
        }
        setState('idle')
      } finally {
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [cancel, conversationId, onStream, state],
  )

  /** Converts the draft to ordinary editable content. It still has to be sent by hand. */
  const accept = useCallback(() => {
    setState('idle')
    setEdited(true)
  }, [])

  const discard = useCallback(() => {
    cancel()
    setState('idle')
    setResult(null)
    onDiscard(snapshotRef.current)
  }, [cancel, onDiscard])

  const markEdited = useCallback(() => {
    setEdited(true)
  }, [])

  const isLowConfidence = result !== null && result.confidence < lowConfidenceThreshold

  return {
    state,
    result,
    /** Below the threshold, one click Accept is withheld so the agent must engage (FR-4.16). */
    isLowConfidence,
    canAcceptInOneClick: result !== null && !isLowConfidence,
    /** Drives the non blocking "Unedited AI draft" notice next to Send. */
    isUnedited: state === 'review' && !edited,
    generate,
    accept,
    discard,
    markEdited,
    cancel,
  }
}
