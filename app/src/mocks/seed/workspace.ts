import type { Inbox, Tag, User, View } from '@/types'
import { minutesBefore } from '@/lib/rand'
import { SEED_NOW } from './clock'

/** The signed in agent. Every "Mine" folder and `assigneeId === CURRENT_USER_ID` check uses this. */
export const CURRENT_USER_ID = 'u1'

export const users: User[] = [
  {
    id: 'u1',
    name: 'Sam Oyelaran',
    email: 'sam@boltsupport.io',
    role: 'admin',
    available: true,
    openCount: 12,
    skills: ['billing', 'api'],
  },
  {
    id: 'u2',
    name: 'Priya Raman',
    email: 'priya@boltsupport.io',
    role: 'agent',
    available: true,
    openCount: 9,
    skills: ['billing', 'refunds'],
  },
  {
    id: 'u3',
    name: 'Dana Whitfield',
    email: 'dana@boltsupport.io',
    role: 'agent',
    available: true,
    openCount: 8,
    skills: ['onboarding', 'sso'],
  },
  {
    id: 'u4',
    name: 'Ari Levin',
    email: 'ari@boltsupport.io',
    role: 'agent',
    // Unavailable on purpose: routing and Auto Assign both have to handle it.
    available: false,
    openCount: 12,
    skills: ['api', 'webhooks'],
  },
]

/**
 * Tag colors only appear as a swatch in tag management. In the conversation list, applied tags
 * render as neutral muted chips, which is what keeps user chosen colors from ever competing
 * with cobalt, violet, or amber.
 */
export const tags: Tag[] = [
  { id: 't1', name: 'billing', color: '#0891b2' },
  { id: 't2', name: 'refund', color: '#f59e0b' },
  { id: 't3', name: 'chargeback', color: '#ef4444' },
  { id: 't4', name: 'sso', color: '#14b8a6' },
  { id: 't5', name: 'api', color: '#10b981' },
  { id: 't6', name: 'premium', color: '#6366f1' },
  { id: 't7', name: 'upgrade', color: '#0ea5e9' },
]

export const inboxes: Inbox[] = [
  {
    id: 'in1',
    name: 'Support',
    email: 'support@boltsupport.io',
    channels: [
      {
        id: 'ch1',
        inboxId: 'in1',
        type: 'email',
        status: 'connected',
        account: 'support@boltsupport.io',
        connectedAt: '2026-02-01T10:00:00.000Z',
        scopes: ['mail.read', 'mail.send'],
        lastSyncAt: minutesBefore(SEED_NOW, 4),
      },
      {
        id: 'ch2',
        inboxId: 'in1',
        type: 'chat',
        status: 'connected',
        account: 'Website widget',
        connectedAt: '2026-03-10T08:00:00.000Z',
        scopes: ['widget'],
        lastSyncAt: minutesBefore(SEED_NOW, 2),
      },
      { id: 'ch3', inboxId: 'in1', type: 'whatsapp', status: 'disconnected', scopes: [] },
      { id: 'ch4', inboxId: 'in1', type: 'sms', status: 'disconnected', scopes: [] },
      { id: 'ch5', inboxId: 'in1', type: 'instagram', status: 'disconnected', scopes: [] },
      { id: 'ch6', inboxId: 'in1', type: 'messenger', status: 'disconnected', scopes: [] },
    ],
    counts: {
      chat: 5,
      unassigned: 12,
      mine: 7,
      assigned: 19,
      drafts: 2,
      needsAttention: 3,
      closed: 1893,
      spam: 91,
    },
  },
  {
    id: 'in2',
    name: 'Billing',
    email: 'billing@boltsupport.io',
    channels: [
      {
        id: 'ch7',
        inboxId: 'in2',
        type: 'email',
        status: 'connected',
        account: 'billing@boltsupport.io',
        connectedAt: '2026-02-01T10:00:00.000Z',
        scopes: ['mail.read', 'mail.send'],
        lastSyncAt: minutesBefore(SEED_NOW, 9),
      },
      { id: 'ch8', inboxId: 'in2', type: 'sms', status: 'disconnected', scopes: [] },
    ],
    counts: {
      chat: 0,
      unassigned: 4,
      mine: 2,
      assigned: 6,
      drafts: 1,
      needsAttention: 0,
      closed: 88,
      spam: 3,
    },
  },
  {
    id: 'in3',
    name: 'Partners',
    email: 'partners@boltsupport.io',
    channels: [
      {
        id: 'ch9',
        inboxId: 'in3',
        type: 'email',
        status: 'connected',
        account: 'partners@boltsupport.io',
        connectedAt: '2026-04-18T10:00:00.000Z',
        scopes: ['mail.read', 'mail.send'],
        lastSyncAt: minutesBefore(SEED_NOW, 31),
      },
      { id: 'ch10', inboxId: 'in3', type: 'messenger', status: 'disconnected', scopes: [] },
      { id: 'ch11', inboxId: 'in3', type: 'instagram', status: 'disconnected', scopes: [] },
    ],
    counts: {
      chat: 1,
      unassigned: 3,
      mine: 0,
      assigned: 2,
      drafts: 0,
      needsAttention: 1,
      closed: 41,
      spam: 0,
    },
  },
]

/**
 * Saved views. The two `system` ones ship by default and are the practical payoff of the AI
 * layer: At risk lets a lead rescue a conversation before the bad rating lands.
 */
export const views: View[] = [
  {
    id: 'v1',
    name: 'At risk',
    scope: 'shared',
    match: 'all',
    conditions: [
      { id: 'vc1', field: 'predicted_satisfaction', operator: 'is', value: 'notGood' },
      { id: 'vc2', field: 'status', operator: 'is_not', value: 'closed' },
    ],
    count: 4,
    system: 'at_risk',
  },
  {
    id: 'v2',
    name: 'AI suggestions pending',
    scope: 'shared',
    match: 'all',
    conditions: [{ id: 'vc3', field: 'ai_confidence', operator: 'greater_than', value: 0 }],
    count: 11,
    system: 'ai_pending',
  },
  {
    id: 'v3',
    name: 'Overdue SLA',
    scope: 'shared',
    match: 'all',
    conditions: [{ id: 'vc4', field: 'status', operator: 'is_not', value: 'closed' }],
    count: 1,
  },
  {
    id: 'v4',
    name: 'Awaiting customer',
    scope: 'private',
    match: 'all',
    conditions: [{ id: 'vc5', field: 'status', operator: 'is', value: 'pending' }],
    count: 9,
  },
  {
    id: 'v5',
    name: 'Tagged: billing',
    scope: 'shared',
    match: 'all',
    conditions: [{ id: 'vc6', field: 'tag', operator: 'is', value: 't1' }],
    count: 4,
  },
]
