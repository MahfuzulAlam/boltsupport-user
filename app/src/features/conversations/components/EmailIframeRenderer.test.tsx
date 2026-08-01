import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { HOSTILE_EMAIL_HTML } from '@/mocks/seed'
import { EmailIframeRenderer } from './EmailIframeRenderer'

function iframe(): HTMLIFrameElement {
  const frame = screen.getByTitle(/message from/i)
  if (!(frame instanceof HTMLIFrameElement)) throw new Error('expected an iframe')
  return frame
}

describe('the untrusted HTML boundary', () => {
  it('never grants allow-scripts or allow-same-origin', () => {
    renderWithProviders(<EmailIframeRenderer bodyHtml={HOSTILE_EMAIL_HTML} authorName="Desmond" />)

    const sandbox = iframe().getAttribute('sandbox')

    // Together these two would let the frame remove its own sandbox attribute, which is the
    // same as having none at all. An empty sandbox is the whole guarantee (NFR-2.1).
    expect(sandbox).toBe('')
    expect(sandbox).not.toContain('allow-scripts')
    expect(sandbox).not.toContain('allow-same-origin')
  })

  it('mounts through srcDoc, never into the app document', () => {
    const { container } = renderWithProviders(
      <EmailIframeRenderer bodyHtml={HOSTILE_EMAIL_HTML} authorName="Desmond" />,
    )

    // The hostile payload must appear only inside the frame's srcdoc, never as live DOM.
    expect(container.innerHTML).not.toContain('<script')
    expect(container.querySelector('script')).toBeNull()
    expect(iframe().getAttribute('srcdoc')).toBeTruthy()
  })

  it('strips the attacks out of the srcdoc itself', () => {
    renderWithProviders(<EmailIframeRenderer bodyHtml={HOSTILE_EMAIL_HTML} authorName="Desmond" />)

    const srcDoc = iframe().getAttribute('srcdoc') ?? ''

    expect(srcDoc).not.toContain('<script')
    expect(srcDoc).not.toContain('onerror')
    expect(srcDoc).not.toContain('javascript:')
    expect(srcDoc).not.toContain('document.cookie')
    expect(srcDoc).toContain('Retries stopped completely')
  })

  it('blocks remote images and says how many', async () => {
    renderWithProviders(<EmailIframeRenderer bodyHtml={HOSTILE_EMAIL_HTML} authorName="Desmond" />)

    expect(screen.getByText(/remote image/i)).toBeInTheDocument()
    expect(screen.getByText(/tracking pixel/i)).toBeInTheDocument()
    expect(iframe().getAttribute('srcdoc')).not.toContain('tracker.example')

    await userEvent.click(screen.getByRole('button', { name: /show images/i }))

    // The opt in is per message and never brings the beacons back with the pictures.
    expect(screen.getByText(/images are showing for this message/i)).toBeInTheDocument()
    expect(iframe().getAttribute('srcdoc')).not.toContain('tracker.example')
  })

  it('carries a restrictive CSP inside the frame as a second boundary', () => {
    renderWithProviders(<EmailIframeRenderer bodyHtml="<p>hi</p>" authorName="Maya" />)

    const srcDoc = iframe().getAttribute('srcdoc') ?? ''
    expect(srcDoc).toContain("default-src 'none'")
    expect(srcDoc).toContain("img-src 'none'")
  })

  it('sends no referrer, so opening a message leaks nothing', () => {
    renderWithProviders(<EmailIframeRenderer bodyHtml="<p>hi</p>" authorName="Maya" />)
    expect(iframe()).toHaveAttribute('referrerpolicy', 'no-referrer')
  })

  it('shows no blocked notice for a message that has nothing to block', () => {
    renderWithProviders(<EmailIframeRenderer bodyHtml="<p>Just text.</p>" authorName="Maya" />)
    expect(screen.queryByText(/blocked/i)).not.toBeInTheDocument()
  })
})
