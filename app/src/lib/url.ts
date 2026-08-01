/**
 * URL safety. NFR-2.4 allowlists http, https, and mailto everywhere a URL becomes a link or a
 * window.open target.
 *
 * This is an allowlist rather than a blocklist on purpose. `javascript:`, `data:`, and
 * `vbscript:` are the obvious attacks, but the set of dangerous schemes is open ended and
 * browser specific, so anything not explicitly permitted is refused.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

export function isSafeUrl(raw: string): boolean {
  const trimmed = raw.trim()
  if (trimmed === '') return false
  try {
    // A base makes relative URLs resolvable so they are judged on their resolved protocol.
    const parsed = new URL(trimmed, window.location.origin)
    return ALLOWED_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * The href to render, or undefined when the URL is not safe. Returning undefined rather than
 * '#' means the caller renders plain text instead of a dead link that looks clickable.
 */
export function safeHref(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined
  return isSafeUrl(raw) ? raw.trim() : undefined
}

/** Attributes every external link needs so the opened page cannot reach back via window.opener. */
export const EXTERNAL_LINK_ATTRS = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const
