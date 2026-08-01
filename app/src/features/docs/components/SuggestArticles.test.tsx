import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { apiRequest } from '@/lib/api-client'
import { articleSchema } from '@/types'
import { getDb } from '@/mocks/db'
import { SuggestArticles } from './SuggestArticles'

describe('suggested articles', () => {
  it('creates a draft, never a published article', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SuggestArticles collectionId="col1" onDismiss={() => undefined} />)

    const create = await screen.findAllByRole('button', { name: /create draft/i })
    const before = getDb().articles.length

    await user.click(create[0] as HTMLElement)

    await waitFor(() => {
      expect(getDb().articles.length).toBe(before + 1)
    })
    const created = getDb().articles.at(-1)
    // AI-1: an unreviewed AI article on a public help site is customer facing output, so a human
    // has to press Publish.
    expect(created?.status).toBe('draft')
  })

  it('refuses to publish even when the request asks it to', async () => {
    const created = await apiRequest('/articles', articleSchema, {
      method: 'POST',
      body: { title: 'Sneaky', collectionId: 'col1', status: 'published' },
    })

    expect(created.status).toBe('draft')
  })

  it('labels its output as AI generated and internal', async () => {
    const { container } = renderWithProviders(
      <SuggestArticles collectionId="col1" onDismiss={() => undefined} />,
    )

    await screen.findAllByRole('button', { name: /create draft/i })

    expect(container.querySelector('[data-ai-generated="true"]')).toBeInTheDocument()
  })
})
