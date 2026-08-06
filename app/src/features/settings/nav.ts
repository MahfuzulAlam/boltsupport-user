import {
  Blocks,
  Building2,
  Clock,
  Download,
  Fingerprint,
  Inbox as InboxIcon,
  KeyRound,
  LayoutGrid,
  Lock,
  Mail,
  MessageSquareReply,
  Bell,
  BookOpen,
  Reply,
  Route,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Tag,
  Timer,
  UserRound,
  Users,
  Workflow,
} from 'lucide-react'
import type { SettingsNavGroup } from './components/SettingsNav'

/*
 * Both settings rails, as data.
 *
 * They live outside the layout components so the router test can walk every destination without
 * rendering anything, and so editing a rail does not force a remount of the page inside it.
 */

/**
 * Everything that belongs to the person or to the whole company, rather than to one inbox.
 *
 * Four groups, in the order somebody actually needs them: yourself first, then the things you
 * work with, then what customers see, then what only an administrator touches. Inbox settings
 * are deliberately not here, since those change per inbox and have their own rail.
 */
export const ACCOUNT_NAV_GROUPS: SettingsNavGroup[] = [
  {
    title: 'Account',
    items: [
      { to: '/account/profile', label: 'Profile', icon: UserRound },
      { to: '/account/preferences', label: 'Preferences', icon: SlidersHorizontal },
      { to: '/manage/notifications', label: 'Notifications', icon: Bell },
      { to: '/account/security', label: 'Security and access', icon: ShieldCheck },
      { to: '/account/auto-bcc', label: 'Auto Bcc', icon: Mail },
      { to: '/account/permissions', label: 'Permissions', icon: Lock },
      { to: '/account/my-apps', label: 'My apps', icon: LayoutGrid },
    ],
  },
  {
    title: 'Features',
    items: [
      { to: '/manage/integrations', label: 'Apps', icon: Blocks },
      { to: '/account/inboxes', label: 'Inboxes', icon: InboxIcon },
      { to: '/manage/tags', label: 'Tags', icon: Tag },
      { to: '/account/properties', label: 'Properties', icon: KeyRound },
    ],
  },
  {
    title: 'Support hub',
    items: [{ to: '/account/docs-sites', label: 'Docs sites', icon: BookOpen }],
  },
  {
    title: 'Administration',
    items: [
      { to: '/account/company', label: 'Company', icon: Building2 },
      { to: '/account/authentication', label: 'Authentication', icon: Fingerprint },
      { to: '/account/role-permissions', label: 'Role permissions', icon: Lock },
      { to: '/manage/users', label: 'Users', icon: Users },
      { to: '/account/import', label: 'Import data', icon: Download },
    ],
  },
]

/**
 * The inbox settings rail.
 *
 * AI configuration is workspace level and lives under /ai, so it is a single link at the bottom
 * rather than a duplicated section per inbox: two copies of one setting is how a workspace ends
 * up with two different confidence thresholds and no idea which one is running.
 */
export function inboxSettingsNav(inboxId: string): SettingsNavGroup[] {
  const base = `/inbox/${inboxId}/settings`
  return [
    {
      title: 'General',
      items: [
        { to: `${base}/general`, label: 'Edit inbox', icon: InboxIcon },
        { to: `${base}/channels`, label: 'Channels', icon: Send },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { to: `${base}/saved-replies`, label: 'Saved replies', icon: MessageSquareReply },
        { to: `${base}/custom-fields`, label: 'Custom fields', icon: SlidersHorizontal },
      ],
    },
    {
      title: 'Automations',
      items: [
        { to: `${base}/workflows`, label: 'Workflows', icon: Workflow },
        { to: `${base}/slas`, label: 'SLAs', icon: Timer },
        { to: `${base}/routing`, label: 'Routing', icon: Route },
      ],
    },
    {
      title: 'Advanced',
      items: [
        { to: `${base}/inbox-hours`, label: 'Inbox hours', icon: Clock },
        { to: `${base}/permissions`, label: 'Permissions', icon: Lock },
        { to: `${base}/outgoing-email`, label: 'Outgoing email', icon: Mail },
        { to: `${base}/auto-reply`, label: 'Auto reply', icon: Reply },
        { to: `${base}/satisfaction-ratings`, label: 'Satisfaction ratings', icon: Star },
      ],
    },
  ]
}
