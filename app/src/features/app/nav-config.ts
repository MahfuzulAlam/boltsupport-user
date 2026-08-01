import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Inbox as InboxIcon,
  Megaphone,
  Settings2,
  Sparkles,
  Users,
} from 'lucide-react'
import type { Inbox } from '@/types'

export interface NavItem {
  id: string
  label: string
  to: string
  /** Shown right aligned in the dropdown, in mono. */
  count?: number
  /** Renders the sparkle and the violet accent. AI items are marked, never colored ad hoc. */
  ai?: boolean
}

export interface NavGroup {
  id: string
  label: string
  icon: LucideIcon
  /** A plain link when set, a dropdown when `items` is present. */
  to?: string
  items?: NavItem[]
  /** Route prefix used to decide the active underline. */
  match: string
}

/**
 * The primary navigation.
 *
 * This is the single source for the top bar, the mobile sheet, and the command palette's
 * "Go to" group. Three surfaces listing different things is how a nav item ends up reachable
 * from one place and invisible from another, which is exactly what the prototypes did: their
 * AI menu items were dead, and the AI screens were only reachable through the palette.
 */
export function buildPrimaryNav(inboxes: Inbox[], defaultInboxId: string): NavGroup[] {
  return [
    {
      id: 'inboxes',
      label: 'Inboxes',
      icon: InboxIcon,
      match: '/inbox',
      items: [
        ...inboxes.map((inbox) => ({
          id: `inbox-${inbox.id}`,
          label: inbox.name,
          to: `/inbox/${inbox.id}/unassigned`,
          count: inbox.counts.unassigned,
        })),
        { id: 'manage-inboxes', label: 'Manage inboxes', to: '/manage/users' },
      ],
    },
    { id: 'docs', label: 'Docs', icon: BookOpen, to: '/docs', match: '/docs' },
    { id: 'messages', label: 'Messages', icon: Megaphone, to: '/messages', match: '/messages' },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      match: '/reports',
      items: [
        { id: 'r-all', label: 'All channels', to: '/reports/all-channels' },
        { id: 'r-email', label: 'Email', to: '/reports/email' },
        { id: 'r-happiness', label: 'Happiness', to: '/reports/happiness' },
        { id: 'r-company', label: 'Company', to: '/reports/company' },
        { id: 'r-ai', label: 'AI', to: '/reports/ai', ai: true },
        { id: 'r-sat', label: 'Satisfaction', to: '/reports/satisfaction' },
      ],
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      match: '/customers',
      items: [
        { id: 'c-all', label: 'All contacts', to: '/customers' },
        { id: 'c-search', label: 'Search everything', to: '/search' },
      ],
    },
    {
      id: 'ai',
      label: 'AI',
      icon: Sparkles,
      match: '/ai',
      items: [
        { id: 'ai-overview', label: 'AI overview', to: '/ai', ai: true },
        { id: 'ai-agent', label: 'AI Agent', to: '/ai/agent', ai: true },
        { id: 'ai-draft', label: 'Auto Draft', to: '/ai/auto-draft', ai: true },
        { id: 'ai-assign', label: 'Auto Assign', to: '/ai/auto-assign', ai: true },
        { id: 'ai-tag', label: 'Auto Tag', to: '/ai/auto-tag', ai: true },
        { id: 'ai-eval', label: 'Evaluation', to: '/ai/evaluation', ai: true },
        { id: 'ai-sat', label: 'Satisfaction', to: '/ai/satisfaction', ai: true },
      ],
    },
    {
      id: 'manage',
      label: 'Manage',
      icon: Settings2,
      match: '/manage',
      items: [
        { id: 'm-users', label: 'Users', to: '/manage/users' },
        { id: 'm-teams', label: 'Teams', to: '/manage/teams' },
        { id: 'm-tags', label: 'Tags', to: '/manage/tags' },
        { id: 'm-integrations', label: 'Integrations', to: '/manage/integrations' },
        { id: 'm-notifications', label: 'Notifications', to: '/manage/notifications' },
        {
          id: 'm-workflows',
          label: 'Workflows',
          to: `/inbox/${defaultInboxId}/settings/workflows`,
        },
        { id: 'm-slas', label: 'SLAs', to: `/inbox/${defaultInboxId}/settings/slas` },
        { id: 'm-routing', label: 'Routing', to: `/inbox/${defaultInboxId}/settings/routing` },
        { id: 'm-channels', label: 'Channels', to: `/inbox/${defaultInboxId}/settings/channels` },
      ],
    },
  ]
}

/** Flattens the nav into palette rows. */
export function navToPaletteItems(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((group) =>
    group.items !== undefined
      ? group.items.map((item) => ({ ...item, label: `${group.label}: ${item.label}` }))
      : [{ id: group.id, label: group.label, to: group.to ?? '/' }],
  )
}
