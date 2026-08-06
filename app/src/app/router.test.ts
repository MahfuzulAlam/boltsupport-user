import { describe, expect, it } from 'vitest'
import { matchPath } from 'react-router-dom'
import { STUB_ROUTES } from './route-config'
import { router } from './router'
import { buildPrimaryNav, navToPaletteItems } from '@/features/app'
import { ACCOUNT_NAV_GROUPS, inboxSettingsNav } from '@/features/settings/nav'
import { createSeedData } from '@/mocks/seed'

const seed = createSeedData()
const nav = buildPrimaryNav(seed.inboxes, 'in1')

interface RouteNode {
  path?: string
  children?: readonly RouteNode[]
}

/**
 * Every path the router can serve, read out of the router itself.
 *
 * This used to be a hand written array with a comment claiming it was kept in sync. It was not:
 * fourteen account routes had been added without it, and the suite stayed green because the only
 * thing it checked was the primary nav, which does not point at any of them. Deriving the list
 * removes the possibility rather than the symptom.
 */
function collectPaths(routes: readonly RouteNode[], base = ''): string[] {
  const found: string[] = []
  for (const route of routes) {
    const raw = route.path
    const full =
      raw === undefined
        ? base
        : raw.startsWith('/')
          ? raw
          : `${base === '/' ? '' : base}/${raw}`

    if (raw !== undefined) found.push(full)
    if (route.children !== undefined) found.push(...collectPaths(route.children, full))
  }
  return found
}

const ROUTE_PATTERNS = [
  ...collectPaths(router.routes),
  ...STUB_ROUTES.map((route) => route.path),
]

function resolves(to: string): boolean {
  return ROUTE_PATTERNS.some((pattern) => matchPath(pattern, to) !== null)
}

/** Every destination in a settings style rail, flattened. */
function railTargets(groups: { items: { to: string }[] }[]): string[] {
  return groups.flatMap((group) => group.items.map((item) => item.to))
}

describe('no dead ends', () => {
  it('resolves every destination in the primary nav', () => {
    const unreachable = navToPaletteItems(nav)
      .map((item) => item.to)
      .filter((to) => !resolves(to))

    expect(unreachable).toEqual([])
  })

  it('resolves every destination in the account rail', () => {
    // The rail this test did not know about until it had fourteen entries in it.
    const unreachable = railTargets(ACCOUNT_NAV_GROUPS).filter((to) => !resolves(to))
    expect(unreachable).toEqual([])
  })

  it('resolves every destination in the inbox settings rail', () => {
    const unreachable = railTargets(inboxSettingsNav('in1')).filter((to) => !resolves(to))
    expect(unreachable).toEqual([])
  })

  it('resolves everywhere the user menu goes', () => {
    // Literal navigate() calls in UserMenu, which belong to no nav array.
    for (const target of ['/account/profile', '/manage/notifications']) {
      expect(resolves(target), `${target} does not resolve`).toBe(true)
    }
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

  it('resolves the two places a settings rail sends you out to', () => {
    // "Back to inboxes" and the AI settings link in the footer.
    expect(resolves('/')).toBe(true)
    expect(resolves('/ai')).toBe(true)
  })

  it('registers every path exactly once', () => {
    const paths = ROUTE_PATTERNS.filter((path) => path !== '' && path !== '*')
    expect(new Set(paths).size, 'a duplicate path shadows whichever came second').toBe(paths.length)
  })

  it('gives every registered route a title and a build step', () => {
    for (const route of STUB_ROUTES) {
      expect(route.title.length, route.path).toBeGreaterThan(0)
      expect(route.description.length, route.path).toBeGreaterThan(0)
      expect(route.step, route.path).toBeGreaterThanOrEqual(4)
    }
  })

  it('covers every screen area the design specification lists', () => {
    // A coarse guard against dropping a whole area while refactoring the route table.
    const areas = [
      '/inbox',
      '/ai',
      '/docs',
      '/reports',
      '/customers',
      '/manage',
      '/account',
      '/search',
    ]
    for (const area of areas) {
      expect(
        ROUTE_PATTERNS.some((pattern) => pattern.startsWith(area)),
        `no routes under ${area}`,
      ).toBe(true)
    }
  })
})
