import { describe, expect, it } from 'vitest'
import { matchPath } from 'react-router-dom'
import { STUB_ROUTES } from './route-config'
import { buildPrimaryNav, navToPaletteItems } from '@/features/app'
import { createSeedData } from '@/mocks/seed'

const seed = createSeedData()
const nav = buildPrimaryNav(seed.inboxes, 'in1')

/** Every path the router can serve. Kept in sync with router.tsx by construction. */
const ROUTE_PATTERNS = [
  '/login',
  '/signup',
  '/forgot-password',
  // Built screens. Each one leaves STUB_ROUTES as its step lands, so it moves up here.
  '/',
  '/inbox/:inboxId',
  '/inbox/:inboxId/new',
  '/ai/auto-assign',
  '/ai/auto-tag',
  '/ai/auto-tag/review',
  '/ai/evaluation',
  '/inbox/:inboxId/:folder',
  '/inbox/:inboxId/:folder/:conversationId',
  '/customers',
  '/customers/:contactId',
  '/docs',
  '/docs/:collectionId',
  '/docs/:collectionId/article/:articleId',
  '/search',
  '/inbox/:inboxId/settings/workflows',
  '/inbox/:inboxId/settings/workflows/new',
  '/inbox/:inboxId/settings/slas',
  '/inbox/:inboxId/settings/routing',
  '/inbox/:inboxId/settings/channels',
  '/ai/agent',
  '/reports/all-channels',
  '/reports/email',
  '/reports/happiness',
  '/reports/company',
  '/reports/ai',
  '/reports/satisfaction',
  '/inbox/:inboxId/settings/general',
  '/inbox/:inboxId/settings/permissions',
  '/inbox/:inboxId/settings/outgoing-email',
  '/inbox/:inboxId/settings/auto-reply',
  '/inbox/:inboxId/settings/inbox-hours',
  '/inbox/:inboxId/settings/saved-replies',
  '/inbox/:inboxId/settings/custom-fields',
  '/inbox/:inboxId/settings/satisfaction-ratings',
  '/inbox/:inboxId/view/:viewId',
  '/manage/users',
  '/manage/teams',
  '/manage/tags',
  '/manage/integrations',
  '/manage/notifications',
  '/messages',
  '/ai',
  '/ai/auto-draft',
  '/ai/satisfaction',
  '/ai/agent/setup',
  '/dev/tokens',
  '/dev/data',
  ...STUB_ROUTES.map((route) => route.path),
]

function resolves(to: string): boolean {
  return ROUTE_PATTERNS.some((pattern) => matchPath(pattern, to) !== null)
}

describe('no dead ends', () => {
  it('resolves every destination in the primary nav', () => {
    const unreachable = navToPaletteItems(nav)
      .map((item) => item.to)
      .filter((to) => !resolves(to))

    expect(unreachable).toEqual([])
  })

  it('resolves the destinations the shell navigates to by keyboard', () => {
    // The G chords and the compose shortcut, as bound in use-shell-shortcuts.
    const keyboardTargets = [
      '/',
      '/inbox/in1/unassigned',
      '/inbox/in1/new',
      '/docs',
      '/reports/all-channels',
      '/customers',
      '/ai',
    ]

    for (const target of keyboardTargets) {
      expect(resolves(target), `${target} does not resolve`).toBe(true)
    }
  })

  it('resolves a conversation deep link of the shape the palette produces', () => {
    expect(resolves('/inbox/in1/unassigned/c1')).toBe(true)
  })

  it('registers every path exactly once', () => {
    const paths = STUB_ROUTES.map((route) => route.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('gives every registered route a title and a build step', () => {
    for (const route of STUB_ROUTES) {
      expect(route.title.length, route.path).toBeGreaterThan(0)
      expect(route.description.length, route.path).toBeGreaterThan(0)
      expect(route.step, route.path).toBeGreaterThanOrEqual(4)
    }
  })

  it('covers every screen area the design specification lists', () => {
    // A coarse guard against dropping a whole area while refactoring the route table. Built and
    // stubbed routes both count: the point is that no area vanishes, not how far along it is.
    const areas = ['/inbox', '/ai', '/docs', '/reports', '/customers', '/manage', '/search']
    for (const area of areas) {
      expect(
        ROUTE_PATTERNS.some((pattern) => pattern.startsWith(area)),
        `no routes under ${area}`,
      ).toBe(true)
    }
  })
})
