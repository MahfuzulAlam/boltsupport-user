import type { Session } from '@/types'
import { aiAgent, aiSettings, knowledgeBases } from './ai-config'
import { accountHealth, churnAlerts, refundThreats, sentimentDrift } from './risk'
import { routing, slaPolicies, workflows } from './automation'
import {
  autoReply,
  connectedApps,
  customFields,
  inboxHours,
  inboxPermissions,
  inboxSettings,
  integrations,
  notificationPrefs,
  outgoingEmail,
  satisfactionSettings,
  teams,
} from './settings'
import { generateConversations } from './conversations'
import { articles, categories, collections, savedReplies } from './knowledge'
import { inboxes, tags, users, views } from './workspace'

export type SeedData = ReturnType<typeof createSeedData>

/**
 * Builds the whole fixture set. Called once at boot and again by `resetDb()` between tests, so
 * mutations from one test never leak into the next.
 */
export function createSeedData() {
  const generated = generateConversations()

  const currentUser = users[0]
  if (currentUser === undefined) {
    throw new Error('Seed data must define at least one user')
  }
  const session: Session = { user: currentUser, workspaceName: 'BoltSupport' }

  return {
    session,
    users: [...users],
    inboxes: [...inboxes],
    tags: [...tags],
    views: [...views],
    collections: [...collections],
    categories: [...categories],
    articles: [...articles],
    savedReplies: [...savedReplies],
    slaPolicies: [...slaPolicies],
    workflows: [...workflows],
    routing: { ...routing },
    inboxSettings: structuredClone(inboxSettings),
    inboxPermissions: structuredClone(inboxPermissions),
    outgoingEmail: structuredClone(outgoingEmail),
    autoReply: structuredClone(autoReply),
    inboxHours: structuredClone(inboxHours),
    customFields: structuredClone(customFields),
    satisfactionSettings: structuredClone(satisfactionSettings),
    teams: structuredClone(teams),
    integrations: structuredClone(integrations),
    notificationPrefs: structuredClone(notificationPrefs),
    connectedApps: structuredClone(connectedApps),
    aiSettings: structuredClone(aiSettings),
    aiAgent: structuredClone(aiAgent),
    knowledgeBases: structuredClone(knowledgeBases),
    accountHealth: structuredClone(accountHealth),
    sentimentDrift: structuredClone(sentimentDrift),
    churnAlerts: structuredClone(churnAlerts),
    refundThreats: structuredClone(refundThreats),
    ...generated,
  }
}

export { CONVERSATION_COUNT, HOSTILE_EMAIL_HTML } from './conversations'
export { SEED_NOW } from './clock'
export { CURRENT_USER_ID } from './workspace'
