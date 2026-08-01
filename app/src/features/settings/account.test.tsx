import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { getDb } from '@/mocks/db'
import { AutoBccPage } from './components/AutoBccPage'
import { AccountPermissionsPage } from './components/AccountPermissionsPage'
import { MyAppsPage } from './components/MyAppsPage'
import { EditAppPage } from './components/EditAppPage'

describe('auto Bcc', () => {
  it('will not save an address it cannot send to', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AutoBccPage />)

    await user.click(screen.getByRole('switch', { name: /enable auto bcc/i }))
    await user.type(screen.getByLabelText(/bcc address/i), 'not-an-address')

    // This setting forwards customer email to a third party, so a typo is refused up front
    // rather than saved and dropped silently by a mail server later.
    expect(screen.getByText(/this is not an address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()

    await user.clear(screen.getByLabelText(/bcc address/i))
    await user.type(screen.getByLabelText(/bcc address/i), 'archive@example.com')
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()
  })

  it('asks for an address once it is switched on', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AutoBccPage />)

    await user.click(screen.getByRole('switch', { name: /enable auto bcc/i }))

    // On with nowhere to send is a setting that looks configured and does nothing.
    expect(screen.getByText(/add an address, or turn auto bcc off/i)).toBeInTheDocument()
  })
})

describe('account permissions', () => {
  it('locks inbox access on for a role that already reaches everything', async () => {
    renderWithProviders(<AccountPermissionsPage />)

    const boxes = await screen.findAllByRole('checkbox', { name: /access to/i })
    // Ticked but disabled is more honest than hidden: the access exists, and the role is what
    // grants it, so the role is what has to change.
    expect(boxes[0]).toBeChecked()
    expect(boxes[0]).toBeDisabled()
  })

  it('hands the boxes back when the role no longer covers everything', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AccountPermissionsPage />)

    await screen.findAllByRole('checkbox', { name: /access to/i })
    await user.selectOptions(screen.getByLabelText('Role'), 'agent')

    const boxes = screen.getAllByRole('checkbox', { name: /access to/i })
    expect(boxes[0]).toBeEnabled()
    expect(boxes[0]).not.toBeChecked()
  })
})

describe('my apps', () => {
  it('lists the apps without showing a single credential', async () => {
    const { container } = renderWithProviders(<MyAppsPage />)

    expect(await screen.findByRole('link', { name: /support manager/i })).toBeInTheDocument()
    // The list is names only. A page that prints every secret at once cannot be screen shared.
    const secret = getDb().connectedApps[0]?.secret ?? ''
    expect(container.textContent).not.toContain(secret)
  })

  it('creates an app and lets the server issue its credentials', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MyAppsPage />)

    await screen.findByRole('link', { name: /support manager/i })
    await user.click(screen.getByRole('button', { name: /^create app$/i }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/app name/i), 'Reporting bridge')
    await user.click(within(dialog).getByRole('button', { name: /^create app$/i }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /reporting bridge/i })).toBeInTheDocument()
    })
    const created = getDb().connectedApps.find((app) => app.name === 'Reporting bridge')
    // The client names it; the id and the secret are the server's to hand out.
    expect(created?.appId).toBeTruthy()
    expect(created?.secret).toBeTruthy()
  })
})

describe('editing an app', () => {
  function renderApp() {
    return renderWithProviders(
      <Routes>
        <Route path="/account/my-apps/:appId" element={<EditAppPage />} />
      </Routes>,
      { route: '/account/my-apps/app1' },
    )
  }

  it('masks the secret until it is asked for', async () => {
    const user = userEvent.setup()
    renderApp()

    const secret = getDb().connectedApps.find((app) => app.id === 'app1')?.secret ?? ''
    // Exact, not a pattern: the reveal and copy buttons are also named after this field.
    const field = await screen.findByLabelText('App secret')

    // Masked on arrival: the usual reason to open this page is to check the redirect URL, and a
    // credential on screen by default is a credential in somebody's screen recording.
    expect(field).not.toHaveValue(secret)
    await user.click(screen.getByRole('button', { name: /reveal the app secret/i }))
    expect(screen.getByLabelText('App secret')).toHaveValue(secret)
  })

  it('refuses to save an app with no name', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.clear(await screen.findByLabelText(/app name/i))

    expect(screen.getByText(/an app needs a name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('saves the redirect URL', async () => {
    const user = userEvent.setup()
    renderApp()

    const field = await screen.findByLabelText(/redirection url/i)
    await user.clear(field)
    await user.type(field, 'https://example.com/oauth')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(getDb().connectedApps.find((app) => app.id === 'app1')?.redirectUrl).toBe(
        'https://example.com/oauth',
      )
    })
  })

  it('asks before deleting, because the credentials stop working', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    renderApp()

    await screen.findByLabelText(/app name/i)
    await user.click(screen.getByRole('button', { name: /app actions/i }))
    await user.click(await screen.findByRole('menuitem', { name: /delete app/i }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /delete app/i }))

    await waitFor(() => {
      expect(getDb().connectedApps.some((app) => app.id === 'app1')).toBe(false)
    })
  })
})
