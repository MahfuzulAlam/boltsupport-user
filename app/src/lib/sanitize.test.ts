import { describe, expect, it } from 'vitest'
import { buildEmailDocument, sanitizeEmailHtml } from './sanitize'
import { HOSTILE_EMAIL_HTML } from '@/mocks/seed'

const blocked = { allowRemoteImages: false }
const allowed = { allowRemoteImages: true }

describe('sanitizeEmailHtml', () => {
  it('renders the seeded hostile email completely inert', () => {
    const { html } = sanitizeEmailHtml(HOSTILE_EMAIL_HTML, blocked)

    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('<style')
    expect(html).not.toContain('document.cookie')
    // The legitimate content survives; only the attacks are removed.
    expect(html).toContain('Retries stopped completely after the 402 came back.')
  })

  it('strips script tags and their contents', () => {
    const { html } = sanitizeEmailHtml('<p>hi</p><script>alert(1)</script>', blocked)
    expect(html).toBe('<p>hi</p>')
  })

  it('strips inline event handlers', () => {
    const { html } = sanitizeEmailHtml('<img src="x" onerror="steal()">', blocked)
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('steal')
  })

  it('removes external stylesheets and style blocks', () => {
    const { html } = sanitizeEmailHtml(
      '<link rel="stylesheet" href="https://evil.example/x.css"><style>body{display:none}</style><p>body</p>',
      blocked,
    )
    expect(html).not.toContain('link')
    expect(html).not.toContain('display:none')
    expect(html).toContain('<p>body</p>')
  })

  it('blocks remote images by default and reports how many', () => {
    const result = sanitizeEmailHtml(
      '<img src="https://cdn.example/a.png"><img src="https://cdn.example/b.png">',
      blocked,
    )

    expect(result.blockedImages).toBe(2)
    expect(result.html).not.toContain('cdn.example')
    expect(result.html).toContain('data-blocked-image')
  })

  it('lets images through once the agent asks for them', () => {
    const result = sanitizeEmailHtml('<img src="https://cdn.example/a.png">', allowed)

    expect(result.blockedImages).toBe(0)
    expect(result.html).toContain('cdn.example/a.png')
  })

  it('removes tracking pixels outright, even when images are allowed', () => {
    // A 1x1 has no content to show. Keeping it would mean opting into the beacon along with
    // the pictures the agent actually wanted.
    const result = sanitizeEmailHtml(
      '<img src="https://tracker.example/p.gif" width="1" height="1"><p>text</p>',
      allowed,
    )

    expect(result.strippedTrackers).toBe(1)
    expect(result.html).not.toContain('tracker.example')
    expect(result.html).toContain('<p>text</p>')
  })

  it('catches pixels hidden with CSS rather than attributes', () => {
    const result = sanitizeEmailHtml(
      '<img src="https://tracker.example/p.gif" style="width:1px;height:1px">',
      allowed,
    )
    expect(result.strippedTrackers).toBe(1)
  })

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox(1)',
  ])('never makes %s clickable', (href) => {
    const result = sanitizeEmailHtml(`<a href="${href}">click</a>`, blocked)

    expect(result.html).not.toContain('href')
    expect(result.html).toContain('click')
  })

  it('keeps http, https, and mailto links and hardens them', () => {
    const { html } = sanitizeEmailHtml('<a href="https://example.com">x</a>', blocked)

    expect(html).toContain('https://example.com')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('target="_blank"')
  })

  it('drops forms, iframes, and embeds', () => {
    const { html } = sanitizeEmailHtml(
      '<form action="https://evil.example"><input name="pw"></form><iframe src="https://evil.example"></iframe><object data="x"></object>',
      blocked,
    )

    expect(html).not.toContain('form')
    expect(html).not.toContain('iframe')
    expect(html).not.toContain('object')
  })

  it('is idempotent, so re-running on its own output changes nothing', () => {
    const once = sanitizeEmailHtml(HOSTILE_EMAIL_HTML, blocked).html
    const twice = sanitizeEmailHtml(once, blocked).html
    expect(twice).toBe(once)
  })

  it('does not leak counters between runs', () => {
    sanitizeEmailHtml('<img src="https://cdn.example/a.png">', blocked)
    const second = sanitizeEmailHtml('<p>no images here</p>', blocked)

    expect(second.blockedImages).toBe(0)
    expect(second.strippedTrackers).toBe(0)
  })
})

describe('buildEmailDocument', () => {
  it('forbids everything by default and only opens images on request', () => {
    expect(buildEmailDocument('<p>x</p>', false)).toContain("img-src 'none'")
    expect(buildEmailDocument('<p>x</p>', true)).toContain('img-src https: data:')
  })

  it('denies the document any way to reach the network or submit', () => {
    const doc = buildEmailDocument('<p>x</p>', false)
    expect(doc).toContain("default-src 'none'")
    expect(doc).toContain("form-action 'none'")
    expect(doc).toContain("base-uri 'none'")
  })
})
