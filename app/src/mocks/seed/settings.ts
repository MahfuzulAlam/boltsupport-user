import type {
  AutoReply,
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

export const notificationPrefs: NotificationPrefs = {
  events: {
    'Assigned to me': { browser: true, email: true },
    'Mentioned in a note': { browser: true, email: true },
    'A conversation I own gets a reply': { browser: true, email: false },
    'An SLA is about to breach': { browser: true, email: true },
    'A conversation is rated Not good': { browser: false, email: true },
    'AI escalates to a human': { browser: true, email: false },
  },
  digest: 'daily',
}
