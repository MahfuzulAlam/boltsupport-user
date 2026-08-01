import { minutesBefore } from '@/lib/rand'
import { SEED_NOW } from './clock'
import type {
  AutoReply,
  ConnectedApp,
  CustomField,
  InboxHours,
  InboxPermissions,
  InboxSettings,
  Integration,
  NotificationPrefs,
  OfficeDay,
  OutgoingEmail,
  SatisfactionSettings,
  Team,
} from '@/types'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const

/** 09:00 to 17:30, weekdays. The default most support teams start from. */
function standardWeek(): OfficeDay[] {
  return [
    ...WEEKDAYS.map((day) => ({ day, open: true, from: 9 * 60, to: 17 * 60 + 30 })),
    { day: 'sat' as const, open: false, from: 10 * 60, to: 14 * 60 },
    { day: 'sun' as const, open: false, from: 10 * 60, to: 14 * 60 },
  ]
}

export const inboxSettings: InboxSettings[] = [
  {
    inboxId: 'in1',
    name: 'Support',
    fromName: 'BoltSupport',
    defaultStatus: 'active',
    defaultAssigneeId: null,
  },
  {
    inboxId: 'in2',
    name: 'Billing',
    fromName: 'BoltSupport Billing',
    defaultStatus: 'active',
    defaultAssigneeId: 'u2',
  },
  {
    inboxId: 'in3',
    name: 'Sales',
    fromName: 'BoltSupport',
    defaultStatus: 'active',
    defaultAssigneeId: null,
  },
]

export const inboxPermissions: InboxPermissions[] = [
  { inboxId: 'in1', userIds: ['u1', 'u2', 'u3', 'u4'] },
  { inboxId: 'in2', userIds: ['u1', 'u2'] },
  { inboxId: 'in3', userIds: ['u1', 'u4'] },
]

/**
 * DKIM active, DMARC not.
 *
 * A deliberately mixed state: the screen has to show both an Active row and a row that still
 * needs a DNS record, because the half-configured case is the one people actually land on.
 */
export const outgoingEmail: OutgoingEmail[] = ['in1', 'in2', 'in3'].map((inboxId) => ({
  inboxId,
  mode: 'boltsupport' as const,
  smtpHost: 'smtp.boltsupport.io',
  smtpPort: 587,
  smtpUser: 'support@boltsupport.io',
  dkim: {
    active: true,
    current: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQ…',
    recommended: {
      host: 'bolt._domainkey.boltsupport.io',
      type: 'TXT' as const,
      value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQ…',
    },
  },
  dmarc: {
    active: false,
    current: '',
    recommended: {
      host: '_dmarc.boltsupport.io',
      type: 'TXT' as const,
      value: 'v=DMARC1; p=none; rua=mailto:dmarc@boltsupport.io; pct=100',
    },
  },
}))

export const autoReply: AutoReply[] = ['in1', 'in2', 'in3'].map((inboxId) => ({
  inboxId,
  enabled: inboxId === 'in1',
  outsideHoursOnly: true,
  subject: 'We have your message, {%conversation.number%}',
  bodyHtml:
    '<p>Hi {%customer.firstName,fallback=there%},</p><p>Thanks for writing in. We are outside our office hours right now, so someone will pick this up when we are back. If it is urgent, reply with URGENT in the subject and we will see it sooner.</p>',
}))

export const inboxHours: InboxHours[] = ['in1', 'in2', 'in3'].map((inboxId) => ({
  inboxId,
  timezone: 'Europe/Berlin',
  days: standardWeek(),
}))

export const customFields: CustomField[] = [
  {
    id: 'cf1',
    label: 'Order number',
    type: 'text',
    appliesTo: 'conversation',
    options: [],
    required: false,
  },
  {
    id: 'cf2',
    label: 'Severity',
    type: 'dropdown',
    appliesTo: 'conversation',
    options: ['Blocker', 'Major', 'Minor'],
    required: true,
  },
  {
    id: 'cf3',
    label: 'Renewal date',
    type: 'date',
    appliesTo: 'contact',
    options: [],
    required: false,
  },
  {
    id: 'cf4',
    label: 'Seats',
    type: 'number',
    appliesTo: 'contact',
    options: [],
    required: false,
  },
]

export const satisfactionSettings: SatisfactionSettings[] = ['in1', 'in2', 'in3'].map(
  (inboxId) => ({
    inboxId,
    enabled: true,
    askAfter: 'first-close' as const,
    question: 'How would you rate the support you received?',
    followUpQuestion: 'Anything you would like to add?',
  }),
)

export const teams: Team[] = [
  { id: 'tm1', name: 'Billing', memberIds: ['u2', 'u3'] },
  { id: 'tm2', name: 'Technical', memberIds: ['u1', 'u4'] },
  { id: 'tm3', name: 'Onboarding', memberIds: ['u3'] },
]

export const integrations: Integration[] = [
  {
    id: 'int1',
    name: 'HubSpot',
    description: 'See deal stage and owner beside the conversation',
    connected: true,
    category: 'crm',
  },
  {
    id: 'int2',
    name: 'Linear',
    description: 'Create an issue from a conversation and track it back',
    connected: true,
    category: 'engineering',
  },
  {
    id: 'int3',
    name: 'Stripe',
    description: 'Show the customer’s plan, invoices, and failed charges',
    connected: false,
    category: 'billing',
  },
  {
    id: 'int4',
    name: 'Slack',
    description: 'Get notified in a channel when something needs attention',
    connected: false,
    category: 'chat',
  },
  {
    id: 'int5',
    name: 'Jira',
    description: 'Link conversations to tickets your engineers already use',
    connected: false,
    category: 'engineering',
  },
]

/**
 * Defaults that leave a new agent informed without being buried.
 *
 * Anything aimed at them personally is on, on mobile; anything about the queue in general is off,
 * because a notification that fires for every arriving conversation trains people to ignore all
 * of them. Email stays quiet by default so the app is not a second inbox to clear.
 */
export const notificationPrefs: NotificationPrefs = {
  method: 'default',
  events: {
    'new-conversation': { email: false, mobile: false, browser: false },
    'assigned-to-me': { email: false, mobile: true, browser: true },
    'assigned-to-other': { email: false, mobile: false, browser: false },
    'following-updated': { email: false, mobile: true, browser: false },
    mentioned: { email: true, mobile: true, browser: true },
    'team-mentioned': { email: false, mobile: true, browser: false },
    'chat-available': { email: false, mobile: false, browser: true },
    'chat-assigned': { email: false, mobile: true, browser: true },
    'chat-reply': { email: false, mobile: false, browser: true },
    'customer-unassigned': { email: false, mobile: false, browser: false },
    'customer-mine': { email: false, mobile: true, browser: true },
    'customer-other': { email: false, mobile: false, browser: false },
    'user-unassigned': { email: false, mobile: false, browser: false },
    'user-mine': { email: false, mobile: true, browser: false },
    'user-other': { email: false, mobile: false, browser: false },
    'sla-breach': { email: true, mobile: true, browser: true },
    'rated-not-good': { email: true, mobile: false, browser: true },
    'ai-escalation': { email: false, mobile: false, browser: true },
  },
  digest: 'daily',
}

/**
 * OAuth apps the signed in person has registered.
 *
 * Fake credentials that look like the real thing, so the copy controls and the reveal have
 * something of the right shape to work against.
 */
export const connectedApps: ConnectedApp[] = [
  {
    id: 'app1',
    name: 'BoltSupport Support Manager',
    appId: 'MojHr42vJPOzXqzIKrQQn8VPgepMngS7',
    secret: 'IkAYIB9YvVJPdAdamwCT5FjEPMmWn3ni',
    redirectUrl: 'https://support-manager.example.com/oauth/callback',
    createdAt: minutesBefore(SEED_NOW, 60 * 24 * 210),
  },
  {
    id: 'app2',
    name: 'AI drafts connection',
    appId: 'Qb7xLm2ZcRvT9nKdWyEs4HgUpAoJi15F',
    secret: 'Zt3wNqXbVe8YrLcHm6KpDsGf2JuAoM9i',
    redirectUrl: 'https://drafts.example.com/callback',
    createdAt: minutesBefore(SEED_NOW, 60 * 24 * 96),
  },
  {
    id: 'app3',
    name: 'Ticket analyzer',
    appId: 'Ec5vTgNa1LzPqWx8ByHrJm3KdSoUf7Qi',
    secret: 'Rw9pMhCk4XbZtLnQe6YsVd2JfGaUo8Ni',
    redirectUrl: 'https://analyzer.example.com/oauth',
    createdAt: minutesBefore(SEED_NOW, 60 * 24 * 41),
  },
  {
    id: 'app4',
    name: 'TeamSync mailbox API',
    appId: 'Kd8qWs2ZxNv5TcLpBmHr9YgEo3JaUf6i',
    secret: 'Lp4mVbXt7ZcQe9NrKhWs2YdGf5JoAu1i',
    redirectUrl: 'https://teamsync.example.com/auth/return',
    createdAt: minutesBefore(SEED_NOW, 60 * 24 * 12),
  },
]
