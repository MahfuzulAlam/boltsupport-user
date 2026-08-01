import type { AiSummary, Message } from '@/types'

/**
 * A genuinely streamed summary.
 *
 * The panel is specified to render progressively (FR-4.7) and a second regenerate must abort
 * the first (design spec section 5). Neither is meaningfully testable against a response that
 * arrives all at once, so the mock emits NDJSON patches with real delays and honours the
 * request signal.
 */
export interface SummaryChunk {
  field: keyof Pick<
    AiSummary,
    'tldr' | 'customerWants' | 'alreadyTried' | 'blockedOn' | 'suggestedNextStep' | 'sentiment'
  >
  value: string
}

const CHUNK_DELAY_MS = 90

/** Derives a plausible summary from the thread so the content tracks the seed. */
export function buildSummaryChunks(messages: Message[]): SummaryChunk[] {
  const customerCount = messages.filter((m) => m.type === 'customer').length
  const hasNote = messages.some((m) => m.type === 'note')

  return [
    { field: 'tldr', value: 'Annual upgrade declined twice, issuer code 05.' },
    { field: 'tldr', value: 'The same card still clears the monthly charge.' },
    { field: 'tldr', value: 'Billing suggests quarterly at the annual rate.' },
    { field: 'customerWants', value: 'The annual plan on the existing card, today.' },
    {
      field: 'alreadyTried',
      value:
        customerCount > 2
          ? 'Two upgrade attempts, both declined at the issuer.'
          : 'One upgrade attempt, declined at the issuer.',
    },
    { field: 'blockedOn', value: 'Issuer block list for large single charges.' },
    {
      field: 'suggestedNextStep',
      value: hasNote
        ? 'Confirm both charges in billing, then offer quarterly at the annual rate.'
        : 'Offer quarterly billing at the annual rate.',
    },
    { field: 'sentiment', value: 'frustrated' },
  ]
}

export function summaryStream(
  chunks: SummaryChunk[],
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  return new ReadableStream({
    start(controller) {
      const push = () => {
        if (signal.aborted) {
          controller.close()
          return
        }
        const chunk = chunks[index]
        if (chunk === undefined) {
          controller.close()
          return
        }
        controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`))
        index += 1
        timer = setTimeout(push, CHUNK_DELAY_MS)
      }

      signal.addEventListener('abort', () => {
        if (timer !== undefined) clearTimeout(timer)
        // An aborted stream simply stops. The half-built summary is discarded by the hook.
        try {
          controller.close()
        } catch {
          // Already closed.
        }
      })

      push()
    },
    cancel() {
      if (timer !== undefined) clearTimeout(timer)
    },
  })
}
