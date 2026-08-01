/**
 * Language codes to names an agent can read.
 *
 * `Intl.DisplayNames` already knows every code and every locale's name for it, so a hand kept
 * table would only be a smaller, staler copy of what the platform ships. The fallback matters
 * anyway: a malformed code from a mail header must render as itself rather than throwing inside a
 * message header.
 */

const display =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'language' })
    : undefined

export function languageName(code: string): string {
  try {
    return display?.of(code) ?? code
  } catch {
    return code
  }
}

/**
 * What AI translate reaches for by default: the language the agent is reading the product in.
 *
 * A constant rather than `navigator.language` on purpose. The product ships in English only, so
 * reading the browser locale would put a German agent's translation back into German, which is
 * the one answer that is never useful.
 */
export const READING_LANGUAGE = 'en'

/** The languages offered on a translation. Short on purpose: a long list is a form. */
export const TRANSLATION_LANGUAGES = ['en', 'de', 'fr', 'es', 'pt', 'ja'] as const
