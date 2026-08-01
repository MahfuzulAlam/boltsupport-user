import { Outlet } from 'react-router-dom'
import {
  Blocks,
  Building2,
  Download,
  Fingerprint,
  Inbox as InboxIcon,
  KeyRound,
  LayoutGrid,
  Lock,
  Mail,
  Bell,
  BookOpen,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  UserRound,
  Users,
} from 'lucide-react'
import { SettingsNav, type SettingsNavGroup } from './SettingsNav'

/**
 * Everything that belongs to the person or to the whole company, rather than to one inbox.
 *
 * Four groups, in the order somebody actually needs them: yourself first, then the things you
 * work with, then what customers see, then what only an administrator touches. Inbox settings
 * are deliberately not here, since those change per inbox and have their own rail.
 */
const GROUPS: SettingsNavGroup[] = [
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

export function AccountLayout() {
  return (
    <div className="flex h-full w-full">
      <SettingsNav label="Account settings" groups={GROUPS} />

      <div className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
