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

/**
 * Account settings that are in the rail but have no content yet.
 *
 * Listed here rather than left out, so the rail is complete and nothing dead ends. Each says what
 * it is for, so the page is empty rather than broken.
 */
const ACCOUNT_PLACEHOLDERS = [
  {
    path: '/account/security',
    title: 'Security and access',
    description: 'Two factor authentication, active sessions, and connected devices.',
  },
  {
    path: '/account/inboxes',
    title: 'Inboxes',
    description: 'Create an inbox, rename one, or decide who can see it.',
  },
  {
    path: '/account/properties',
    title: 'Properties',
    description: 'Custom fields kept against a customer rather than a conversation.',
  },
  {
    path: '/account/docs-sites',
    title: 'Docs sites',
    description: 'Your public knowledge base: domain, theme, and visibility.',
  },
  {
    path: '/account/company',
    title: 'Company',
    description: 'Company name, billing details, and plan.',
  },
  {
    path: '/account/authentication',
    title: 'Authentication',
    description: 'Single sign on and how your team proves who they are.',
  },
  {
    path: '/account/role-permissions',
    title: 'Role permissions',
    description: 'What each role can do, for everyone in the company.',
  },
  {
    path: '/account/import',
    title: 'Import data',
    description: 'Bring conversations and customers over from another helpdesk.',
  },
] as const

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
        path: '/manage/teams',
        lazy: async () => ({
          Component: (await import('@/features/settings/components/ManagePages')).TeamsPage,
        }),
      },

      /*
       * The account area.
       *
       * A pathless layout route, so the four `/manage/*` screens that were built before this rail
       * existed keep the URLs already linked from the nav and from anything anyone bookmarked,
       * and pick up the sidebar by being nested rather than by being moved.
       */
      {
        lazy: async () => ({
          Component: (await import('@/features/settings/components/AccountLayout')).AccountLayout,
        }),
        children: [
          {
            path: '/account/profile',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/ProfilePage')).ProfilePage,
            }),
          },
          {
            path: '/manage/users',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/ManagePages')).UsersPage,
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
              Component: (await import('@/features/settings/components/ManagePages'))
                .IntegrationsPage,
            }),
          },
          {
            path: '/account/auto-bcc',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/AutoBccPage')).AutoBccPage,
            }),
          },
          {
            path: '/account/permissions',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/AccountPermissionsPage'))
                .AccountPermissionsPage,
            }),
          },
          {
            path: '/account/my-apps',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/MyAppsPage')).MyAppsPage,
            }),
          },
          {
            path: '/account/my-apps/:appId',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/EditAppPage')).EditAppPage,
            }),
          },
          {
            path: '/account/preferences',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/PreferencesPage'))
                .PreferencesPage,
            }),
          },
          {
            path: '/manage/notifications',
            lazy: async () => ({
              Component: (await import('@/features/settings/components/NotificationsPage'))
                .NotificationsPage,
            }),
          },
          ...ACCOUNT_PLACEHOLDERS.map(({ path, title, description }) => ({
            path,
            lazy: async () => {
              const { AccountPlaceholder } =
                await import('@/features/settings/components/AccountPlaceholder')
              return {
                Component: () => <AccountPlaceholder title={title} description={description} />,
              }
            },
          })),
        ],
      },
      {
        path: '/messages',
        lazy: async () => ({
          Component: (await import('@/features/settings/components/MessagesPage')).MessagesPage,
        }),
      },
      /*
       * Everything under /ai, inside one rail.
       *
       * A pathless layout route with absolute path children: the pages keep the URLs they always
       * had, and the rail is mounted once rather than by each page remembering to include it.
       * The agent setup wizard is deliberately outside it, since a wizard with a settings rail
       * beside it is a wizard you can wander out of halfway through.
       */
      {
        lazy: async () => ({
          Component: (await import('@/features/ai/components/AiSettingsLayout')).AiSettingsLayout,
        }),
        children: [
          {
            path: '/ai',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/AiHubPage')).AiHubPage,
            }),
          },
          {
            path: '/ai/knowledge',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/AiKnowledgePage')).AiKnowledgePage,
            }),
          },
          {
            path: '/ai/summary',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/SummarySettingsPage'))
                .SummarySettingsPage,
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
            path: '/ai/auto-tag',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/AutoTagSettingsPage'))
                .AutoTagSettingsPage,
            }),
          },
          {
            path: '/ai/auto-tag/review',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/TagReviewPage')).TagReviewPage,
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
            path: '/ai/evaluation',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/EvaluationSettingsPage'))
                .EvaluationSettingsPage,
            }),
          },
          {
            path: '/ai/evaluation/results',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/EvaluationPage')).EvaluationPage,
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
            path: '/ai/health-score',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/risk/RiskSettingsPages'))
                .HealthScoreSettingsPage,
            }),
          },
          {
            path: '/ai/sentiment-drift',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/risk/RiskSettingsPages'))
                .SentimentDriftSettingsPage,
            }),
          },
          {
            path: '/ai/silent-churn',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/risk/ChurnAndRefundSettings'))
                .SilentChurnSettingsPage,
            }),
          },
          {
            path: '/ai/refund-threat',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/risk/ChurnAndRefundSettings'))
                .RefundThreatSettingsPage,
            }),
          },
          {
            path: '/ai/agent',
            lazy: async () => ({
              Component: (await import('@/features/ai/components/agent/AgentPage')).AgentPage,
            }),
          },
        ],
      },
      {
        path: '/ai/agent/setup',
        lazy: async () => ({
          Component: (await import('@/features/ai/components/agent/AgentSetupWizard'))
            .AgentSetupWizard,
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
