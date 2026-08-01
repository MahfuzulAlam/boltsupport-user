import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { SearchPage } from './SearchPage'

function LocationProbe() {
  return <span data-testid="location">{useLocation().search}</span>
}

describe('global search', () => {
  it('separates the three kinds of result and counts each', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SearchPage />)

    await user.type(screen.getByLabelText('Search'), 'billing')

    const conversations = await screen.findByRole('tab', { name: /conversations/i })
    await waitFor(() => {
      expect(conversations).toHaveTextContent(/\d/)
    })

    // Docs and contacts live behind their own tabs rather than mixed into one list, so a
    // subject match never buries the article that answers it.
    await user.click(screen.getByRole('tab', { name: /docs/i }))
    const results = await screen.findByRole('listbox', { name: /search results/i })
    expect(within(results).getAllByRole('option').length).toBeGreaterThan(0)
  })

  it('marks the matched span in a result', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<SearchPage />)

    await user.type(screen.getByLabelText('Search'), 'billing')
    await screen.findByRole('listbox', { name: /search results/i })

    const marks = container.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThan(0)
    expect(marks[0]?.textContent?.toLowerCase()).toBe('billing')
  })

  it('moves focus into the results with the arrow keys and back out again', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SearchPage />)

    const field = screen.getByLabelText('Search')
    await user.type(field, 'billing')
    await screen.findByRole('listbox', { name: /search results/i })

    await user.keyboard('{ArrowDown}')
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(options[1]).toHaveFocus()

    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(field).toHaveFocus()
  })

  it('narrows the results with a filter chip', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SearchPage />)

    await user.type(screen.getByLabelText('Search'), 'billing')
    await screen.findByRole('listbox', { name: /search results/i })
    const before = screen.getAllByRole('option').length

    await user.click(screen.getByRole('button', { name: /^status/i }))
    await user.click(await screen.findByRole('menuitem', { name: /closed/i }))

    await waitFor(() => {
      expect(screen.queryAllByRole('option').length).toBeLessThan(before)
    })
    // The chip reads back what it is doing rather than only shrinking the list.
    expect(screen.getByRole('button', { name: /status: closed/i })).toBeInTheDocument()
  })

  it('puts the query in the address bar so a result set can be shared', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <SearchPage />
        <LocationProbe />
      </>,
      { route: '/search' },
    )

    await user.type(screen.getByLabelText('Search'), 'refund')

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('q=refund')
    })
  })
})
