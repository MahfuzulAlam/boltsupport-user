import { describe, expect, it } from 'vitest'
import { matchPath } from 'react-router-dom'
import { router } from '@/app/router'
import { aiFeatureSchema, aiSettingsSchema, INSTRUCTIONS_MAX } from '@/types'
import { createSeedData } from '@/mocks/seed'
import { AI_NAV_GROUPS } from './nav'
import { FEATURE_LABEL, KIND_META } from './knowledge-meta'

/**
 * The AI area is now six features plus a knowledge layer, all under one rail. These pin the
 * properties that are easy to break by adding a seventh of anything: a feature with nowhere to
 * configure it, a rail item pointing at a route that no longer exists, or a feature nobody
 * remembered to give its own instructions field.
 */

interface RouteNode {
  path?: string
  children?: readonly RouteNode[]
}

function collectPaths(routes: readonly RouteNode[], base = ''): string[] {
  const found: string[] = []
  for (const route of routes) {
    const raw = route.path
    const full =
      raw === undefined ? base : raw.startsWith('/') ? raw : `${base === '/' ? '' : base}/${raw}`
    if (raw !== undefined) found.push(full)
    if (route.children !== undefined) found.push(...collectPaths(route.children, full))
  }
  return found
}

const ROUTES = collectPaths(router.routes)

describe('every AI feature is configurable', () => {
  const settings = createSeedData().aiSettings

  it('gives each feature its own instructions rather than one shared prompt', () => {
    /*
     * Separate fields on purpose. The sentence that makes tagging correct ("a chargeback is never
     * billing") is noise to the summariser, and sharing one field would make every feature pay
     * for every other feature's guidance.
     */
    for (const feature of aiFeatureSchema.options) {
      if (feature === 'agent') continue // The agent has its own identity screen instead.
      const block = settings[feature as keyof typeof settings] as { instructions?: string }
      expect(typeof block.instructions, feature).toBe('string')
    }
  })

  it('keeps workspace guidance separate from per feature guidance', () => {
    // Both exist, so describing the business once cannot be confused with steering one feature.
    expect(typeof settings.workspaceInstructions).toBe('string')
    expect(settings.autoTag.instructions).not.toBe(settings.workspaceInstructions)
  })

  it('caps instructions so they cannot crowd out the conversation', () => {
    const tooLong = 'x'.repeat(INSTRUCTIONS_MAX + 1)
    const result = aiSettingsSchema.safeParse({
      ...settings,
      autoTag: { ...settings.autoTag, instructions: tooLong },
    })
    expect(result.success).toBe(false)
  })

  it('has a settings page for every feature in the rail', () => {
    const targets = AI_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.to))
    const unreachable = targets.filter(
      (to) => !ROUTES.some((pattern) => matchPath(pattern, to) !== null),
    )
    expect(unreachable).toEqual([])
  })

  it('reaches a distinct page per feature, not the same one twice', () => {
    /*
     * Summary used to link to the evaluation dashboard, which was plausible enough that nobody
     * noticed it for a while. Two features sharing a destination is the shape of that bug.
     */
    const targets = AI_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.to))
    expect(new Set(targets).size).toBe(targets.length)
  })

  it('names every feature in the knowledge scope list', () => {
    // A feature missing from here would be one nobody could grant a source to.
    for (const feature of aiFeatureSchema.options) {
      expect(FEATURE_LABEL[feature], feature).toBeTruthy()
    }
  })

  it('describes every kind of source', () => {
    for (const kind of ['documentation', 'qa', 'proven', 'website'] as const) {
      expect(KIND_META[kind].label, kind).toBeTruthy()
      expect(KIND_META[kind].blurb, kind).toBeTruthy()
    }
  })
})

describe('the defaults a workspace starts on', () => {
  const settings = createSeedData().aiSettings

  it('leaves both auto apply modes on suggest (AI-7)', () => {
    expect(settings.autoTag.mode).toBe('suggest')
    expect(settings.autoAssign.mode).toBe('suggest')
  })

  it('does not summarise a thread before anyone asks', () => {
    // A summary that appears by itself gets read instead of the thread. Opt in, not out.
    expect(settings.summary.autoGenerate).toBe(false)
  })

  it('keeps a prediction about a person off their permanent record', () => {
    expect(settings.satisfaction.showOnContactProfile).toBe(false)
  })

  it('ships every evaluation criterion on, since all off is a silent no-op', () => {
    expect(Object.values(settings.evaluation.criteria).every(Boolean)).toBe(true)
  })
})
