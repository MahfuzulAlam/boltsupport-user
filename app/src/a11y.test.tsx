import { describe, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { expectNoAxeViolations } from '@/test/axe'
import { WorkspacePage } from '@/features/inbox/components/WorkspacePage'
import { InboxPage } from '@/features/inbox/components/InboxPage'
import { ConversationPage } from '@/features/conversations/components/ConversationPage'
import { Composer } from '@/features/composer'
import { ContactsPage } from '@/features/contacts/components/ContactsPage'
import { CollectionPage } from '@/features/docs/components/CollectionPage'
import { SearchPage } from '@/features/search/components/SearchPage'
import { WorkflowWizard } from '@/features/automation/components/WorkflowWizard'
import { ChannelsPage } from '@/features/channels/components/ChannelsPage'
import { AgentPage } from '@/features/ai/components/agent/AgentPage'
import { AllChannelsReport } from '@/features/reports/components/AllChannelsReport'
import { EditInboxPage } from '@/features/settings/components/EditInboxPage'
import { OnboardingStepper } from '@/features/settings'
import { LoginPage } from '@/features/auth/components/LoginPage'

/**
 * The core flows, checked against axe.
 *
 * NFR-3.1 to 3.7. These run per screen rather than once over the whole app because a violation
 * reported against a route is much harder to place than one reported against the component that
 * owns the markup.
 */
const SCREENS = [
  {
    name: 'login',
    route: '/login',
    path: '/login',
    element: <LoginPage />,
    settle: () => screen.findByRole('heading', { name: /sign in|log in|welcome/i }),
  },
  {
    name: 'workspace dashboard',
    route: '/',
    path: '/',
    element: <WorkspacePage />,
    settle: () => screen.findByRole('heading', { level: 1 }),
  },
  {
    name: 'conversation list',
    route: '/inbox/in1/unassigned',
    path: '/inbox/:inboxId/:folder',
    element: <InboxPage />,
    settle: () => screen.findByRole('listbox'),
  },
  {
    name: 'conversation detail',
    route: '/inbox/in1/assigned/c2',
    path: '/inbox/:inboxId/:folder/:conversationId',
    element: <ConversationPage />,
    // The composer starts closed, so the thread settles on the Reply button rather than Send.
    settle: () => screen.findByRole('button', { name: /^reply/i }),
  },
  {
    name: 'contacts',
    route: '/customers',
    path: '/customers',
    element: <ContactsPage />,
    settle: () => screen.findByRole('heading', { name: 'Customers' }),
  },
  {
    name: 'docs collection',
    route: '/docs/col1',
    path: '/docs/:collectionId',
    element: <CollectionPage />,
    settle: () => screen.findByRole('link', { name: /connect your first inbox/i }),
  },
  {
    name: 'search',
    route: '/search?q=billing',
    path: '/search',
    element: <SearchPage />,
    settle: () => screen.findByRole('tab', { name: /conversations/i }),
  },
  {
    name: 'workflow wizard',
    route: '/inbox/in1/settings/workflows/new',
    path: '/inbox/:inboxId/settings/workflows/new',
    element: <WorkflowWizard />,
    settle: () => screen.findByLabelText('Name'),
  },
  {
    name: 'channels',
    route: '/inbox/in1/settings/channels',
    path: '/inbox/:inboxId/settings/channels',
    element: <ChannelsPage />,
    settle: () => screen.findByRole('region', { name: 'Email' }),
  },
  {
    name: 'AI agent console',
    route: '/ai/agent',
    path: '/ai/agent',
    element: <AgentPage />,
    settle: () => screen.findByRole('tab', { name: 'Overview' }),
  },
  {
    name: 'all channels report',
    route: '/reports/all-channels',
    path: '/reports/all-channels',
    element: <AllChannelsReport />,
    settle: () => screen.findByText('Total conversations'),
  },
  {
    name: 'inbox settings',
    route: '/inbox/in1/settings/general',
    path: '/inbox/:inboxId/settings/general',
    element: <EditInboxPage />,
    settle: () => screen.findByLabelText('Name'),
  },
  {
    name: 'onboarding',
    route: '/',
    path: '/',
    element: <OnboardingStepper onDone={() => undefined} />,
    settle: () => screen.findByLabelText(/inbox name/i),
  },
] as const

describe.each(SCREENS)('$name', ({ route, path, element, settle }) => {
  it('has no axe violations', async () => {
    const { container } = renderWithProviders(
      <Routes>
        <Route path={path} element={element} />
      </Routes>,
      { route },
    )
    await settle()
    await expectNoAxeViolations(container)
  })
})

describe('the open composer', () => {
  it('has no axe violations in either mode', async () => {
    const { container } = renderWithProviders(
      <Composer conversationId="c1" recipient="Maya Chen" />,
    )
    await screen.findByRole('button', { name: /send reply/i })
    await expectNoAxeViolations(container)
  })
})
