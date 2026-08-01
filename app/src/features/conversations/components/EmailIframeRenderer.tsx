import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ImageOff, ShieldCheck } from 'lucide-react'
import { buildEmailDocument, measureEmailHeight, sanitizeEmailHtml } from '@/lib/sanitize'

interface EmailIframeRendererProps {
  bodyHtml: string
  /** Used for the iframe's accessible name. */
  authorName: string
}

/** Until the body has been measured, and the floor for a one-line reply. */
const MIN_HEIGHT = 44

/**
 * The only component in the codebase that renders untrusted HTML.
 *
 * Two independent boundaries, because either one alone is a single point of failure:
 *
 *  1. DOMPurify strips scripts, handlers, stylesheets, and dangerous URL schemes.
 *  2. The result is mounted with `sandbox=""` — no allow-scripts and, critically, no
 *     allow-same-origin. Those two together would let the frame remove its own sandbox
 *     attribute, which is the same as having none. Without allow-same-origin the browser
 *     treats the document as an opaque origin that cannot reach back into the app.
 *
 * The frame cannot measure itself: with no scripts inside it, nothing can post its height out.
 * Reaching for allow-scripts to fix that would trade the whole guarantee for a layout
 * convenience. Instead the parent measures the sanitized HTML it already holds, in a detached
 * element at the same width, and sizes the frame to the answer. Same markup, same styles, no
 * script anywhere near the untrusted content.
 */
export function EmailIframeRenderer({ bodyHtml, authorName }: EmailIframeRendererProps) {
  const [showImages, setShowImages] = useState(false)
  const [height, setHeight] = useState(MIN_HEIGHT)
  const frameRef = useRef<HTMLIFrameElement>(null)

  const { html, blockedImages, strippedTrackers, blockedLinks } = useMemo(
    () => sanitizeEmailHtml(bodyHtml, { allowRemoteImages: showImages }),
    [bodyHtml, showImages],
  )

  const srcDoc = useMemo(() => buildEmailDocument(html, showImages), [html, showImages])
  const hasNotice = blockedImages > 0 || strippedTrackers > 0 || blockedLinks > 0

  /*
   * Size to the content, before paint so the thread never jumps.
   *
   * Re-measured when the sanitized HTML changes and when the pane resizes, since a narrower
   * column wraps to more lines. `measureEmailHeight` renders into a detached element, so this
   * costs a layout pass rather than a network trip.
   */
  useLayoutEffect(() => {
    const frame = frameRef.current
    if (frame === null) return

    const measure = () => {
      setHeight(Math.max(MIN_HEIGHT, measureEmailHeight(html, frame.clientWidth)))
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => {
      observer.disconnect()
    }
  }, [html])

  return (
    <div>
      {hasNotice ? (
        <div
          className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-2.5 py-1.5 text-[13px]"
          style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
        >
          <ImageOff className="size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {blockedImages > 0 ? (
              <>
                <span className="font-mono">{blockedImages}</span> remote image
                {blockedImages === 1 ? '' : 's'} blocked.{' '}
              </>
            ) : null}
            {strippedTrackers > 0 ? (
              <>
                <span className="font-mono">{strippedTrackers}</span> tracking pixel
                {strippedTrackers === 1 ? '' : 's'} stripped.{' '}
              </>
            ) : null}
            {blockedLinks > 0 ? (
              <>
                <span className="font-mono">{blockedLinks}</span> unsafe link
                {blockedLinks === 1 ? '' : 's'} disabled.
              </>
            ) : null}
          </span>
          {blockedImages > 0 ? (
            <button
              type="button"
              onClick={() => {
                setShowImages(true)
              }}
              className="ml-auto font-medium"
              style={{ color: 'var(--brand)' }}
            >
              Show images
            </button>
          ) : null}
        </div>
      ) : null}

      {showImages ? (
        <div
          className="mb-2 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]"
          style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
        >
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Images are showing for this message. Tracking pixels are still removed.</span>
          <button
            type="button"
            onClick={() => {
              setShowImages(false)
            }}
            className="ml-auto font-medium"
            style={{ color: 'var(--brand)' }}
          >
            Hide images
          </button>
        </div>
      ) : null}

      <iframe
        ref={frameRef}
        // No allow-scripts and no allow-same-origin. Do not add either.
        sandbox=""
        referrerPolicy="no-referrer"
        title={`Message from ${authorName}`}
        srcDoc={srcDoc}
        // Scrolling is off: the frame is exactly as tall as its content, so a scrollbar here
        // would only ever be a rounding artefact.
        scrolling="no"
        className="w-full border-0"
        style={{ height }}
      />
    </div>
  )
}
