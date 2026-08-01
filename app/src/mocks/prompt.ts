/**
 * How customer authored content is handed to a model.
 *
 * AI-2. The real enforcement is server side, since the browser never holds a model key and never
 * calls a model directly (NFR-2.6). What lives here is the contract the server implements, made
 * explicit so it is visible in the codebase and testable rather than described in a comment:
 * every piece of customer text is wrapped in a labelled block and never concatenated into the
 * instruction stream.
 *
 * The delimiters are deliberately unlikely to occur in an email. A customer who writes
 * "</untrusted>" gets it escaped rather than closing the block early, which is the whole attack.
 */

const OPEN = '<untrusted-customer-content'
const CLOSE = '</untrusted-customer-content>'

/**
 * Neutralises a delimiter a customer typed, so it cannot close the block it sits inside.
 *
 * Both forms have to be escaped. Escaping only the opening tag leaves `</untrusted-...>` intact,
 * which is precisely the string an attacker sends to break out of the block and have the rest of
 * their message read as instructions.
 */
function escapeDelimiters(text: string): string {
  return text
    .replaceAll('</untrusted-customer-content', '&lt;/untrusted-customer-content')
    .replaceAll('<untrusted-customer-content', '&lt;untrusted-customer-content')
}

export interface UntrustedBlock {
  /** What the content is, so the model is told how to treat it. */
  label: string
  text: string
}

/**
 * Wraps untrusted content for a prompt.
 *
 * Never returns bare text: an empty message still produces an empty labelled block, so the
 * caller cannot accidentally interpolate raw customer input by taking a shortcut on the empty
 * case.
 */
export function wrapUntrusted({ label, text }: UntrustedBlock): string {
  return `${OPEN} source="${label}">\n${escapeDelimiters(text)}\n${CLOSE}`
}

/** Builds the data section of a prompt. Instructions live outside it, always. */
export function buildPromptData(blocks: UntrustedBlock[]): string {
  return blocks.map((block) => wrapUntrusted(block)).join('\n')
}

/**
 * Phrases that look like an instruction rather than a question.
 *
 * Detection is not the defence, the delimiting is. This exists so the UI can say an attempt was
 * seen and ignored (AI-3), which is a different job: hiding the event would leave an operator
 * wondering why an answer looks odd.
 */
const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /you are now in .{0,20}mode/i,
  /disregard (your|the) (rules|instructions|guidelines)/i,
  /system prompt/i,
  /act as (an? )?(admin|administrator|developer)/i,
]

export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text))
}
