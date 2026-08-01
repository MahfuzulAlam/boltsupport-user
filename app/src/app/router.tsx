import { Navigate, createBrowserRouter, useParams } from 'react-router-dom'
import { AppShell } from '@/features/app'
import { useAuth } from '@/features/auth'
import { RouteErrorBoundary } from './error-boundary'
import { STUB_ROUTES, renderStub } from './route-config'

/**
 * Everything is behind the login gate. There is no public surface and no SEO requirement, which
 * is the whole reason this is a plain SPA rather than a meta framework.
 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isSignedIn = useAuth((s) => s.isSignedIn)
  return isSignedIn ? <>{children}</> : <Navigate to="/login" replace />
}

/** `/inbox/:inboxId` is not a screen; it resolves to the default folder. */
function InboxIndexRedirect() {
  const { inboxId } = useParams()
  return <Navigate to={`/inbox/${inboxId ?? 'in1'}/unassigned`} replace />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: async () => ({
      Component: (await import('@/features/auth/components/LoginPage')).LoginPage,
    }),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/signup',
    lazy: async () => ({
      Component: (await import('@/features/auth/components/SignupPage')).SignupPage,
    }),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/forgot-password',
    lazy: async () => ({
      Component: (await import('@/features/auth/components/ForgotPasswordPage')).ForgotPasswordPage,
    }),
    errorElement: <RouteErrorBoundary />,
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/inbox/:inboxId', element: <InboxIndexRedirect /> },
      {
        path: '/',
        lazy: async () => ({
          Component: (await import('@/features/inbox/components/WorkspacePage')).WorkspacePage,
        }),
      },
      {
        path: '/inbox/:inboxId/:folder',
        lazy: async () => ({
          Component: (await import('@/features/inbox/components/InboxPage')).InboxPage,
        }),
      },
      {
        path: '/ai/auto-assign',
        lazy: async () => ({
          Component: (await import('@/features/ai/components/AutoAssignSettingsPage'))
            .AutoAssignSettingsPage,
        }),
      },
      {
        path: '/ai/auto-tag',
        lazy: async () => ({
          Component: (await import('@/features/ai/components/AutoTagSettingsPage'))
            .AutoTagSettingsPage,
        }),
      },
      {
        path: '/ai/evaluation',
        lazy: async () => ({
          Component: (await import('@/features/ai/components/EvaluationPage')).EvaluationPage,
        }),
      },
      {
        path: '/ai/auto-tag/review',
        lazy: async () => ({
          Component: (await import('@/features/ai/components/TagReviewPage')).TagReviewPage,
        }),
      },
      {
        path: '/inbox/:inboxId/new',
        lazy: async () => ({
          Component: (await import('@/features/composer/components/NewConversationPage'))
            .NewConversationPage,
        }),
      },
      {
        path: '/inbox/:inboxId/:folder/:conversationId',
        lazy: async () => ({
          Component: (await import('@/features/conversations/components/ConversationPage'))
            .ConversationPage,
        }),
      },
      {
        path: '/customers',
        lazy: async () => ({
          Component: (await import('@/features/contacts/components/ContactsPage')).ContactsPage,
        }),
      },
      {
        path: '/customers/:contactId',
        lazy: async () => ({
          Component: (await import('@/features/contacts/components/ContactProfilePage'))
            .ContactProfilePage,
        }),
      },
      {
        path: '/docs',
        lazy: async () => ({
          Component: (await import('@/features/docs/components/DocsPage')).DocsPage,
        }),
      },
      {
        path: '/docs/:collectionId',
        lazy: async () => ({
          Component: (await import('@/features/docs/components/CollectionPage')).CollectionPage,
        }),
      },
      {
        path: '/docs/:collectionId/article/:articleId',
        lazy: async () => ({
          Component: (await import('@/features/docs/components/ArticleEditorPage'))
            .ArticleEditorPage,
        }),
      },
      {
        path: '/search',
        lazy: async () => ({
          Component: (await import('@/features/search/components/SearchPage')).SearchPage,
        }),
      },
      {
        path: '/inbox/:inboxId/settings',
        lazy: async () => ({
          Component: (await import('@/features/settings/components/SettingsLayout')).SettingsLayout,
        }),
        children: [
          {
            path: 'workflows',
            lazy: async () => ({
              Component: (await import('@/features/automation/components/WorkflowsPage'))
                .WorkflowsPage,
            }),
          },
          {
            path: 'workflows/new',
            lazy: async () => ({
              Component: (await import('@/features/automation/components/WorkflowWizard'))
                .WorkflowWizard,
            }),
          },
          {
            path: 'slas',
            lazy: async () => ({
              Component: (await import('@/features/automation/components/SlaPoliciesPage'))
                .SlaPoliciesPage,
            }),
          },
          {
            path: 'routing',
            lazy: async () => ({
              Component: (await import('@/features/automation/components/RoutingPage')).RoutingPage,
            }),
          },
          {
            path: 'channels',
            lazy: async () => ({
              Component: (await import('@/features/channels/components/ChannelsPage')).ChannelsPage,
            }),
          },
          {
            path: 'general',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/EditInboxPage'))
                .EditInboxPage,
            }),
          },
          {
            path: 'permissions',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/PermissionsPage'))
                .PermissionsPage,
            }),
          },
          {
            path: 'outgoing-email',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/OutgoingEmailPage'))
                .OutgoingEmailPage,
            }),
          },
          {
            path: 'auto-reply',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/AutoReplyPage'))
                .AutoReplyPage,
            }),
          },
          {
            path: 'inbox-hours',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/InboxHoursPage'))
                .InboxHoursPage,
            }),
          },
          {
            path: 'saved-replies',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/SavedRepliesPage'))
                .SavedRepliesPage,
            }),
          },
          {
            path: 'custom-fields',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/CustomFieldsPage'))
                .CustomFieldsPage,
            }),
          },
          {
            path: 'satisfaction-ratings',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/SatisfactionRatingsPage'))
                .SatisfactionRatingsPage,
            }),
          },
        ],
      },
      {
        path: '/manage/users',
        lazy: async () => ({
          Component: (await import('@/features/settings/components/ManagePages')).UsersPage,
        }),
      },
      {
        path: '/manage/teams',
        lazy: async () => ({
          Component: (await import('@/features/settings/components/ManagePages')).TeamsPage,
        }),
      },
      {
        path: '/manage/tags',
        lazy: async () => ({
          Component: (await import('@/features/settings/components/ManagePages')).TagsPage,
        }),
      },
      {
        path: '/manage/integrations',
        lazy: async () => ({
          Component: (await import('@/features/settings/components/ManagePages')).IntegrationsPage,
        }),
      },
      {
        path: '/manage/notifications',
        lazy: async () => ({
          Component: (await import('@/features/settings/components/ManagePages')).NotificationsPage,
        }),
      },
      {
        path: '/messages',
        lazy: async () => ({
          Component: (await import('@/features/settings/components/MessagesPage')).MessagesPage,
        }),
      },
      {
        path: '/ai',
        lazy: async () => ({
          Component: (await import('@/features/ai/components/AiHubPage')).AiHubPage,
        }),
      },
      {
        path: '/ai/auto-draft',
        lazy: async () => ({
          Component: (await import('@/features/ai/components/AutoDraftSettingsPage'))
            .AutoDraftSettingsPage,
        }),
      },
      {
        path: '/ai/satisfaction',
        lazy: async () => ({
          Component: (await import('@/features/ai/components/SatisfactionSettingsPage'))
            .SatisfactionSettingsPage,
        }),
      },
      {
        path: '/inbox/:inboxId/view/:viewId',
        lazy: async () => ({
          Component: (await import('@/features/inbox/components/SavedViewPage')).SavedViewPage,
        }),
      },
      {
        path: '/reports/all-channels',
        lazy: async () => ({
          Component: (await import('@/features/reports/components/AllChannelsReport'))
            .AllChannelsReport,
        }),
      },
      {
        path: '/reports/email',
        lazy: async () => ({
          Component: (await import('@/features/reports/components/EmailReport')).EmailReport,
        }),
      },
      {
        path: '/reports/happiness',
        lazy: async () => ({
          Component: (await import('@/features/reports/components/HappinessReport'))
            .HappinessReport,
        }),
      },
      {
        path: '/reports/company',
        lazy: async () => ({
          Component: (await import('@/features/reports/components/CompanyReport')).CompanyReport,
        }),
      },
      {
        path: '/reports/ai',
        lazy: async () => ({
          Component: (await import('@/features/reports/components/AiReport')).AiReport,
        }),
      },
      {
        path: '/reports/satisfaction',
        lazy: async () => ({
          Component: (await import('@/features/reports/components/SatisfactionReport'))
            .SatisfactionReport,
        }),
      },
      {
        path: '/ai/agent',
        lazy: async () => ({
          Component: (await import('@/features/ai/components/agent/AgentPage')).AgentPage,
        }),
      },
      {
        path: '/ai/agent/setup',
        lazy: async () => ({
          Component: (await import('@/features/ai/components/agent/AgentSetupWizard'))
            .AgentSetupWizard,
        }),
      },
      // Proof sheets from steps 1 and 2. Not in the nav, but kept reachable so a token or a
      // boundary regression stays easy to see.
      {
        path: '/dev/tokens',
        lazy: async () => ({ Component: (await import('./TokenProof')).TokenProof }),
      },
      {
        path: '/dev/data',
        lazy: async () => ({ Component: (await import('./DataProof')).DataProof }),
      },
      // Registered but not built. Each is replaced by its real component in the listed step.
      ...STUB_ROUTES.map((route) => ({
        path: route.path,
        element: renderStub(route),
      })),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
