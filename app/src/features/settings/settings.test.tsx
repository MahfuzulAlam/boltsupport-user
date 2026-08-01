import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { getDb } from '@/mocks/db'
import { EditInboxPage } from './components/EditInboxPage'
import { PermissionsPage } from './components/PermissionsPage'
import { OutgoingEmailPage } from './components/OutgoingEmailPage'
import { InboxHoursPage } from './components/InboxHoursPage'
import { SatisfactionRatingsPage } from './components/SatisfactionRatingsPage'
import { NotificationsPage } from './components/ManagePages'
import { OnboardingStepper } from './components/OnboardingStepper'

/** The pages that own a save bar. Read-only lists deliberately have none. */
const SAVING_PAGES = [
  { name: 'Edit inbox', Component: EditInboxPage, settle: 'Basics' },
  { name: 'Permissions', Component: PermissionsPage, settle: 'Permissions' },
  { name: 'Outgoing email', Component: OutgoingEmailPage, settle: 'Sending' },
  { name: 'Inbox hours', Component: InboxHoursPage, settle: 'Time zone' },
  { name: 'Satisfaction ratings', Component: SatisfactionRatingsPage, settle: 'Asking' },
] as const

function renderInboxPage(Component: () => React.JSX.Element) {
  return renderWithProviders(
    <Routes>
      <Route path="/inbox/:inboxId/settings/x" element={<Component />} />
    </Routes>,
    { route: '/inbox/in1/settings/x' },
  )
}

describe.each(SAVING_PAGES)('the $name page', ({ Component, settle }) => {
  it('keeps Save disabled until something actually changed', async () => {
    renderInboxPage(Component)
    await screen.findByText(settle)

    // An always-enabled Save teaches people to press it out of habit, and then they cannot tell
    // whether a change took.
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /discard/i })).toBeDisabled()
  })
})

describe('editing an inbox', () => {
  it('enables Save on the first edit and persists it', async () => {
    const user = userEvent.setup()
    renderInboxPage(EditInboxPage)

    const field = await screen.findByLabelText('Name')
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()

    await user.type(field, ' desk')
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => {
      expect(getDb().inboxSettings.find((item) => item.inboxId === 'in1')?.name).toBe(
        'Support desk',
      )
    })
    // Saving clears the dirty flag, so the bar goes back to disabled.
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('puts a destructive delete behind a second, named confirmation', async () => {
    const user = userEvent.setup()
    renderInboxPage(EditInboxPage)

    await user.click(await screen.findByRole('button', { name: /^delete inbox$/i }))
    expect(screen.getByRole('button', { name: /yes, delete support/i })).toBeInTheDocument()
  })
})

describe('permissions', () => {
  it('warns when the change would lock everyone out', async () => {
    const user = userEvent.setup()
    renderInboxPage(PermissionsPage)

    const cards = await screen.findAllByRole('checkbox')
    for (const card of cards) {
      if (card.getAttribute('aria-checked') === 'true') await user.click(card)
    }

    expect(screen.getByText(/nobody would be able to open this inbox/i)).toBeInTheDocument()
  })
})

describe('outgoing email', () => {
  it('never offers a field to type an SMTP password into', async () => {
    const user = userEvent.setup()
    renderInboxPage(OutgoingEmailPage)

    await user.click(await screen.findByRole('radio', { name: /use custom smtp/i }))

    // NFR-2.5: a secret typed into a settings form is a secret in the client.
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
    expect(document.querySelector('input[type="password"]')).toBeNull()
    expect(screen.getByText(/never entered or shown here/i)).toBeInTheDocument()
  })

  it('says what a missing DMARC record actually costs', async () => {
    renderInboxPage(OutgoingEmailPage)

    // The seed ships DKIM active and DMARC missing, so the half-configured case renders.
    expect(await screen.findByText(/not set up/i)).toBeInTheDocument()
    expect(
      screen.getByText(/no instruction for what to do when a message fails/i),
    ).toBeInTheDocument()
  })
})

describe('inbox hours', () => {
  it('flags a day whose closing time is not after its opening time', async () => {
    const user = userEvent.setup()
    renderInboxPage(InboxHoursPage)

    await user.selectOptions(await screen.findByLabelText('Monday opens'), '1080')
    expect(screen.getByText(/closing time is not after opening time/i)).toBeInTheDocument()
  })

  it('warns when no day is open, because a business hours SLA could never tick', async () => {
    const user = userEvent.setup()
    renderInboxPage(InboxHoursPage)

    await screen.findByText('Time zone')
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      await user.click(screen.getByRole('switch', { name: day }))
    }

    expect(screen.getByText(/a business hours sla can never tick/i)).toBeInTheDocument()
  })
})

describe('notification preferences', () => {
  it('saves a per-event channel change', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NotificationsPage />)

    const toggle = await screen.findByRole('switch', { name: /assigned to me by email/i })
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(getDb().notificationPrefs.events['Assigned to me']?.email).toBe(false)
    })
  })
})

describe('first run onboarding', () => {
  it('is skippable at every step', async () => {
    const user = userEvent.setup()
    let done = false
    renderWithProviders(
      <OnboardingStepper
        onDone={() => {
          done = true
        }}
      />,
    )

    // A helpdesk with one inbox and no AI is a working helpdesk.
    await user.click(screen.getByRole('button', { name: /skip setup/i }))
    expect(done).toBe(true)
  })

  it('says on the AI step that nothing sends itself', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingStepper onDone={() => undefined} />)

    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    const heading = await screen.findByRole('heading', { name: /turn on ai/i })
    expect(heading).toBeInTheDocument()
    expect(
      screen.getByText(/none of them\s+send anything to a customer on their own/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /finish/i })).toBeInTheDocument()
  })

  it('will not let the inbox be nameless', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingStepper onDone={() => undefined} />)

    await user.clear(screen.getByLabelText(/inbox name/i))
    expect(screen.getByRole('button', { name: /^next$/i })).toBeDisabled()
  })
})

describe('the settings rail', () => {
  it('links AI configuration out to the workspace level rather than duplicating it', async () => {
    const { SettingsLayout } = await import('./components/SettingsLayout')
    renderWithProviders(
      <Routes>
        <Route path="/inbox/:inboxId/settings" element={<SettingsLayout />} />
      </Routes>,
      { route: '/inbox/in1/settings' },
    )

    const nav = await screen.findByRole('navigation', { name: /inbox settings/i })
    // Two copies of one threshold is how a workspace ends up not knowing which is running.
    expect(within(nav).getByRole('link', { name: /ai settings/i })).toHaveAttribute('href', '/ai')
    expect(within(nav).queryByRole('link', { name: /auto tag/i })).not.toBeInTheDocument()
  })
})
