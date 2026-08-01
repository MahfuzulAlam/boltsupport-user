import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { server } from '@/mocks/server'
import { getDb } from '@/mocks/db'
import { SlaPoliciesPage } from './SlaPoliciesPage'

function withNoPolicies() {
  server.use(http.get('/api/automation/slas', () => HttpResponse.json([])))
}

describe('SLA policies', () => {
  it('sells the feature when there is nothing to list', async () => {
    withNoPolicies()
    renderWithProviders(<SlaPoliciesPage />)

    const heading = await screen.findByRole('heading', { name: /respond on time, every time/i })
    // One of exactly two places in the product allowed the serif display face, because this
    // screen is persuading rather than working.
    expect(heading).toHaveStyle({ fontFamily: 'var(--font-serif)' })
    expect(screen.getByRole('button', { name: /create sla policy/i })).toBeInTheDocument()

    // The preview is decoration, and every part of it sits inside the hidden subtree. A screen
    // reader announcing "Enterprise SLA, respond in 12m 24s" would read it as real data.
    expect(screen.getByText('12m 24s').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getByText('Enterprise SLA').closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('opens the editor from the zero state with usable defaults', async () => {
    withNoPolicies()
    const user = userEvent.setup()
    renderWithProviders(<SlaPoliciesPage />)

    await user.click(await screen.findByRole('button', { name: /create sla policy/i }))

    // Four priorities, pre-filled, so a lead can accept them and be done.
    expect(await screen.findByLabelText('Urgent first response')).toHaveValue(15)
    expect(screen.getByLabelText('Low resolution')).toHaveValue(3)
    expect(screen.getByLabelText('Low resolution unit')).toHaveValue('1440')
  })

  it('explains the clock choice rather than just naming it', async () => {
    withNoPolicies()
    const user = userEvent.setup()
    renderWithProviders(<SlaPoliciesPage />)

    await user.click(await screen.findByRole('button', { name: /create sla policy/i }))

    // The setting people get wrong, so the difference is spelled out in hours and days.
    expect(await screen.findByText(/due tomorrow morning, not at midnight/i)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /business hours/i })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('will not save a policy without a name', async () => {
    withNoPolicies()
    const user = userEvent.setup()
    renderWithProviders(<SlaPoliciesPage />)

    await user.click(await screen.findByRole('button', { name: /create sla policy/i }))
    expect(await screen.findByRole('button', { name: /save changes/i })).toBeDisabled()

    await user.type(screen.getByLabelText('Name'), 'Weekend cover')
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()
  })

  it('creates the policy and returns to the list', async () => {
    withNoPolicies()
    const user = userEvent.setup()
    renderWithProviders(<SlaPoliciesPage />)
    const before = getDb().slaPolicies.length

    await user.click(await screen.findByRole('button', { name: /create sla policy/i }))
    await user.type(await screen.findByLabelText('Name'), 'Weekend cover')
    await user.type(screen.getByLabelText('Condition value'), 'urgent')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(getDb().slaPolicies.length).toBe(before + 1)
    })
    expect(getDb().slaPolicies.at(-1)?.name).toBe('Weekend cover')
  })
})
