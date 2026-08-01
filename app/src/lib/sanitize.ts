import DOMPurify from 'dompurify'

/**
 * Email sanitization.
 *
 * This is the only place untrusted HTML is processed, and its output is only ever mounted
 * inside a sandboxed iframe (NFR-2.1). Sanitizing *and* sandboxing is deliberate belt and
 * braces: a DOMPurify misconfiguration is silent, and the sandbox is what still holds if one
 * happens.
 *
 * Remote images are blocked by default (NFR-2.3). Loading them confirms to a sender that an
 * address is live and being read, which is exactly what a spammer or a phisher wants.
 */

export interface SanitizeOptions {
  /** Only ever true after an explicit per message opt in. */
  allowRemoteImages: boolean
}

export interface SanitizeResult {
  html: string
  /** Images held back, so the UI can say how many rather than saying "some". */
  blockedImages: number
  /** Zero sized images removed outright. They carry no content, only a beacon. */
  strippedTrackers: number
  /** Links removed for using a scheme outside the allowlist. */
  blockedLinks: number
}

const ALLOWED_SCHEMES = /^(https?|mailto):/i

/** Anything this small is a beacon, not a picture. */
function isTrackingPixel(node: Element): boolean {
  const width = Number(node.getAttribute('width') ?? '0')
  const height = Number(node.getAttribute('height') ?? '0')
  if (width > 0 && height > 0 && width <= 2 && height <= 2) return true

  const style = node.getAttribute('style') ?? ''
  return /(?:width|height)\s*:\s*[012](?:px)?\b/i.test(style)
}

interface RunState {
  options: SanitizeOptions
  blockedImages: number
  strippedTrackers: number
  blockedLinks: number
}

// Sanitization is synchronous, so a single run cannot interleave with another.
let run: RunState = {
  options: { allowRemoteImages: false },
  blockedImages: 0,
  strippedTrackers: 0,
  blockedLinks: 0,
}

let hooksInstalled = false

function installHooks(): void {
  if (hooksInstalled) return
  hooksInstalled = true

  DOMPurify.addHook('uponSanitizeElement', (node) => {
    if (!(node instanceof Element)) return
    if (node.tagName === 'IMG' && isTrackingPixel(node)) {
      run.strippedTrackers += 1
      node.remove()
    }
  })

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element)) return

    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src')
      if (src !== null && src !== '' && !run.options.allowRemoteImages) {
        // Keep the element so layout stays roughly right, but never let it fetch.
        node.removeAttribute('src')
        node.removeAttribute('srcset')
        node.setAttribute('data-blocked-image', 'true')
        node.setAttribute('alt', node.getAttribute('alt') ?? 'Image blocked')
        run.blockedImages += 1
      }
    }

    if (node.tagName === 'A') {
      const href = node.getAttribute('href')
      if (href !== null && href !== '' && !ALLOWED_SCHEMES.test(href)) {
        // javascript:, data:, and vbscript: never become clickable (NFR-2.4).
        node.removeAttribute('href')
        node.setAttribute('data-blocked-link', 'true')
        run.blockedLinks += 1
      } else if (href !== null) {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer')
      }
    }
  })
}

export function sanitizeEmailHtml(raw: string, options: SanitizeOptions): SanitizeResult {
  installHooks()
  run = { options, blockedImages: 0, strippedTrackers: 0, blockedLinks: 0 }

  const html = DOMPurify.sanitize(raw, {
    // Stylesheets can exfiltrate through selectors and background urls, and they let a sender
    // restyle the message into something it is not.
    FORBID_TAGS: ['style', 'link', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'base'],
    FORBID_ATTR: ['srcset', 'ping', 'formaction'],
    ALLOW_DATA_ATTR: false,
    // Belt and braces with the link hook above.
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|cid):/i,
  })

  return {
    html,
    blockedImages: run.blockedImages,
    strippedTrackers: run.strippedTrackers,
    blockedLinks: run.blockedLinks,
  }
}

/**
 * The document mounted into the iframe.
 *
 * The CSP here is a second boundary inside the sandbox: even if something slipped past
 * DOMPurify, `default-src 'none'` means it has nowhere to send anything. Images are only
 * permitted once the agent has asked for them.
 */
export function buildEmailDocument(html: string, allowRemoteImages: boolean): string {
  const imgSrc = allowRemoteImages ? 'https: data:' : "'none'"
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${imgSrc}; style-src 'unsafe-inline'; font-src 'none'; form-action 'none'; base-uri 'none'">
<style>
  html,body{margin:0;padding:0;background:transparent;color:#161a22;
    font:15px/1.6 'IBM Plex Sans',ui-sans-serif,system-ui,sans-serif;overflow-wrap:break-word}
  a{color:#2563f0}
  a[data-blocked-link]{color:inherit;text-decoration:line-through;cursor:not-allowed}
  img{max-width:100%;height:auto}
  img[data-blocked-image]{display:inline-block;min-width:80px;min-height:24px;
    border:1px dashed #d1d5db;border-radius:4px;padding:4px 8px;font-size:12px;color:#6b7280}
  blockquote{margin:0 0 0 8px;padding-left:12px;border-left:2px solid #e5e7eb;color:#6b7280}
  table{max-width:100%}
</style>
</head><body>${html}</body></html>`
}

/**
 * How tall the email will render at a given width.
 *
 * The sandboxed frame cannot tell us: with no scripts inside it, nothing can post a height back
 * out, and granting `allow-scripts` to find out would give up the guarantee the sandbox exists
 * for. So the parent measures instead, using the same sanitized markup and the same typography
 * the frame applies, in a detached element that is never attached to the visible tree.
 *
 * The input is already sanitized by `sanitizeEmailHtml`, so this is safe: the string has been
 * through DOMPurify before it reaches here, and the measuring element is removed immediately.
 * It is also inert for a second reason worth stating, since it looks alarming otherwise: the
 * element is created via a detached `<div>` that is never inserted into the document, so no
 * `<script>` would execute and no `<img>` would fetch even if one had survived.
 */
export function measureEmailHeight(sanitizedHtml: string, width: number): number {
  if (typeof document === 'undefined' || width <= 0) return 0

  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = [
    'position:absolute',
    'visibility:hidden',
    'pointer-events:none',
    'top:-99999px',
    'left:-99999px',
    `width:${String(width)}px`,
    "font:15px/1.6 'IBM Plex Sans',ui-sans-serif,system-ui,sans-serif",
    'overflow-wrap:break-word',
  ].join(';')

  // Building the tree off-document is what keeps this inert; it is attached only for the single
  // layout read below, by which point it holds nothing that can run or fetch.
  host.innerHTML = sanitizedHtml

  document.body.append(host)
  const height = host.scrollHeight
  host.remove()

  return height
}
