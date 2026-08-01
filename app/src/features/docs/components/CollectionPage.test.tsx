import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { CollectionPage } from './CollectionPage'

/** The page reads :collectionId, so it needs a matched route rather than a bare render. */
function renderCollection() {
  return renderWithProviders(
    <Routes>
      <Route path="/docs/:collectionId" element={<CollectionPage />} />
    </Routes>,
    { route: '/docs/col1' },
  )
}

describe('a docs collection', () => {
  it('narrows to a category and back', async () => {
    const user = userEvent.setup()
    renderCollection()

    await screen.findByRole('link', { name: /connect your first inbox/i })
    const all = screen.getAllByRole('link', { name: /published|draft/i }).length

    await user.click(screen.getByRole('button', { name: /^setup/i }))
    expect(screen.getAllByRole('link', { name: /published|draft/i }).length).toBeLessThan(all)

    await user.click(screen.getByRole('button', { name: /^all articles/i }))
    expect(screen.getAllByRole('link', { name: /published|draft/i })).toHaveLength(all)
  })

  it('gives the suggestion panel the full width of the page, not the header', async () => {
    const user = userEvent.setup()
    const { container } = renderCollection()

    await user.click(screen.getByRole('button', { name: /suggest articles/i }))
    const panel = await screen.findByLabelText(/suggested from resolved conversations/i)

    // Sharing the header's action row would squeeze a list of suggestions into a button-sized
    // box, which is what happened the first time this shipped.
    const header = container.querySelector('h1')?.parentElement?.parentElement
    expect(header?.contains(panel)).toBe(false)
  })

  it('finds an article by keyword, not just by title', async () => {
    const user = userEvent.setup()
    renderCollection()

    await screen.findByRole('link', { name: /connect your first inbox/i })
    await user.type(screen.getByLabelText(/search articles/i), 'saml')

    const list = await screen.findByRole('link', { name: /saml/i })
    expect(within(list).getByText(/saml setup/i)).toBeInTheDocument()
  })
})
