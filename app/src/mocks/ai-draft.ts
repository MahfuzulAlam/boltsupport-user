import type { AiSource } from '@/types'

/**
 * Auto Draft, streamed.
 *
 * Confidence is derived from whether the knowledge base was consulted rather than being a
 * random number: turning "Use knowledge base" off genuinely produces a draft with no sources
 * and low confidence, which makes both the no-sources warning (FR-4.15) and the low-confidence
 * lockout (FR-4.16) reachable states rather than ones nobody ever sees.
 */

const DRAFT_TEXT =
  'Hi Maya, thanks for the detail. Both upgrade attempts came back as a 402 with issuer code 05, which means your bank declined the single annual charge rather than our system failing it. Ask them to authorise one charge of 1,920 EUR, then retry from Billing and it will go through. If they cannot lift it today I can switch you to quarterly billing at the annual rate for this term, so you keep the discount either way.'

const SHORT_TEXT =
  'Hi Maya, the card was declined by your bank rather than by us. Ask them to authorise a single charge of 1,920 EUR, then retry from Billing.'

const APOLOGETIC_PREFIX =
  'Hi Maya, I am sorry this has taken two attempts and is still not resolved. '

export interface DraftOptions {
  tone: string
  length: string
  useKnowledgeBase: boolean
  includeNextSteps: boolean
}

export interface DraftMeta {
  sources: AiSource[]
  confidence: number
  injectionDetected: boolean
}

const KNOWLEDGE_SOURCES: AiSource[] = [
  { id: 'a5', type: 'doc', title: 'Refund policy' },
  { id: 'sr1', type: 'saved_reply', title: 'Saved reply: Shipping delay' },
]

export function draftBody(options: DraftOptions): string {
  const base = options.length === 'short' ? SHORT_TEXT : DRAFT_TEXT
  const withTone = options.tone === 'apologetic' ? APOLOGETIC_PREFIX + base.slice(9) : base
  return options.includeNextSteps
    ? `${withTone} I will keep this open until you confirm it went through.`
    : withTone
}

export function draftMeta(options: DraftOptions, injectionDetected: boolean): DraftMeta {
  return {
    sources: options.useKnowledgeBase ? KNOWLEDGE_SOURCES : [],
    // Without the knowledge base the model is working from the thread alone, which is exactly
    // when a human needs to check the claims.
    confidence: options.useKnowledgeBase ? 0.88 : 0.42,
    injectionDetected,
  }
}

const WORDS_PER_CHUNK = 3
const CHUNK_DELAY_MS = 45

/** Streams the body word by word, then a final line carrying the metadata. */
export function draftStream(
  body: string,
  meta: DraftMeta,
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const words = body.split(' ')
  let index = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  return new ReadableStream({
    start(controller) {
      const finish = () => {
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'meta', meta })}\n`))
        controller.close()
      }

      const push = () => {
        if (signal.aborted) {
          controller.close()
          return
        }
        if (index >= words.length) {
          finish()
          return
        }
        const slice = words.slice(index, index + WORDS_PER_CHUNK).join(' ')
        index += WORDS_PER_CHUNK
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'text', value: slice })}\n`))
        timer = setTimeout(push, CHUNK_DELAY_MS)
      }

      signal.addEventListener('abort', () => {
        if (timer !== undefined) clearTimeout(timer)
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

/**
 * A pre-send evaluation.
 *
 * Completeness fails when the draft never mentions what the processor returned, which is the
 * question the seeded customer actually asked. That makes the unanswered-question callout
 * (FR-4.35) fire on real content rather than on a coin flip.
 */
export function evaluateDraft(bodyText: string) {
  const mentionsProcessor = /processor|402|issuer code/i.test(bodyText)
  const mentionsAmount = /1,920|1920/.test(bodyText)
  const isShort = bodyText.split(' ').length < 25

  const criteria = [
    {
      key: 'accuracy' as const,
      verdict: mentionsAmount ? ('pass' as const) : ('warn' as const),
      note: mentionsAmount ? 'Claims match Refund policy' : 'No amount stated, so nothing to check',
    },
    {
      key: 'completeness' as const,
      verdict: mentionsProcessor ? ('pass' as const) : ('warn' as const),
      note: mentionsProcessor ? 'Every question addressed' : 'One question not answered',
    },
    {
      key: 'tone' as const,
      verdict: 'pass' as const,
      note: 'Suits a frustrated customer',
    },
    {
      key: 'clarity' as const,
      verdict: isShort ? ('warn' as const) : ('pass' as const),
      note: isShort ? 'Very short for a two part question' : 'Short sentences, one ask',
    },
    { key: 'policy' as const, verdict: 'pass' as const, note: 'No unapproved commitments' },
  ]

  const passes = criteria.filter((c) => c.verdict === 'pass').length
  const score = Math.round((passes / criteria.length) * 100)

  return {
    score,
    criteria,
    ...(mentionsProcessor
      ? {}
      : {
          unansweredQuestion:
            'Can you check what the processor returned before I ask our finance team to raise the ceiling?',
        }),
    rationale: mentionsProcessor
      ? 'The reply answers both parts of the question and matches the customer tone.'
      : 'The reply offers a workaround and matches the customer tone, but never reports the processor response the customer explicitly asked for, so Completeness is marked warn.',
  }
}
