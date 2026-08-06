import type { AiAgent, AiSettings, KnowledgeBase } from '@/types'
import { minutesBefore } from '@/lib/rand'
import { SEED_NOW } from './clock'

/**
 * Every auto apply mode starts on `suggest` (AI-7). The seed deliberately ships the product in
 * the state a real workspace should start in, so nothing is applied without a human until the
 * acceptance rates in the audit tables justify promoting it.
 */
export const aiSettings: AiSettings = {
  enabled: true,

  // Written the way a real admin writes it: what the company is, and the two or three habits
  // that would otherwise have to be corrected in every reply.
  workspaceInstructions:
    'BoltSupport is a shared inbox helpdesk sold to support teams. Customers are usually support ' +
    'leads or admins, so assume they know their own product but not ours. Never promise a ' +
    'delivery date for anything on the roadmap. Refunds outside the 30 day window need a lead.',

  summary: {
    enabled: true,
    instructions:
      'Lead with what the customer is asking for, not with how long the thread is. If they have ' +
      'already tried something, say what, so nobody suggests it again.',
    autoGenerate: false,
    minMessages: 4,
    style: 'brief',
    includeNextStep: true,
  },

  autoAssign: {
    enabled: true,
    instructions: 'Route anything mentioning SAML or SCIM to whoever last handled one.',
    mode: 'suggest',
    threshold: 0.75,
    // Workload is off by default, which is exactly the combination the settings page warns
    // about if someone turns auto apply on. The guardrail needs a reachable failure state.
    signals: ['skills', 'history', 'availability', 'language'],
    fallbackUserId: null,
    excludedUserIds: [],
    maxConcurrentPerAgent: 12,
    respectAvailability: true,
  },

  autoTag: {
    enabled: true,
    instructions:
      'A refund request is billing. A chargeback is chargeback, never billing, because the two ' +
      'go to different queues. Tag what the customer wants, not how they feel about it.',
    mode: 'suggest',
    threshold: 0.9,
    allowedTagIds: ['t1', 't2', 't3', 't4', 't5'],
    descriptions: {
      t2: 'the customer wants money back, not a return',
      t3: 'the customer mentions their bank or a dispute',
      t4: 'single sign on setup, SAML or OIDC',
    },
    maxTagsPerConversation: 3,
  },

  autoDraft: {
    enabled: true,
    instructions:
      'Open with the answer, then the reasoning. Do not apologise more than once in a reply.',
    defaultTone: 'friendly',
    defaultLength: 'standard',
    useKnowledgeBase: true,
    lowConfidenceThreshold: 0.6,
    requireCitations: true,
    matchCustomerLanguage: true,
  },

  evaluation: {
    enabled: true,
    instructions: 'Flag any reply that commits us to a date, a refund, or a custom build.',
    samplingRate: 0.25,
    criteria: { accuracy: true, completeness: true, tone: true, clarity: true, policy: true },
    warnBeforeSend: true,
  },

  healthScore: {
    enabled: true,
    instructions:
      'A trial account with a lot of setup questions is not unhealthy, it is new. Weight repeat ' +
      'issues on the same topic more heavily than a spread of unrelated ones.',
    signals: {
      repeatIssues: true,
      resolutionDrift: true,
      responseLatency: true,
      escalationRate: true,
      sentimentTrend: true,
    },
    atRiskAt: 70,
    watchAt: 40,
    trendDays: 90,
  },

  sentimentDrift: {
    enabled: true,
    instructions:
      'One angry ticket after a good year is not a decline. Look for the second and third before ' +
      'calling it.',
    // Five is enough that a single bad ticket cannot swing the mean on its own.
    windowSize: 5,
    minDrop: 0.25,
    alertOnDecline: true,
  },

  silentChurn: {
    enabled: true,
    instructions:
      'Say what happened and over what period. "Three reopens on billing sync in 18 days" is ' +
      'actionable. "Elevated churn risk" is not.',
    quietDays: 14,
    reopenThreshold: 3,
    minConfidence: 0.6,
  },

  refundThreat: {
    enabled: true,
    instructions:
      'A customer asking how refunds work is not threatening one. Fire on intent to leave or to ' +
      'reverse a charge, not on the word refund.',
    // High, because this one interrupts. A banner that cries wolf gets ignored, and then the real
    // one is ignored too.
    minConfidence: 0.75,
    escalateToUserId: null,
    postInternalNote: true,
  },

  satisfaction: {
    enabled: true,
    instructions: 'Treat a second unanswered follow up as a stronger signal than harsh wording.',
    visibleTo: 'everyone',
    atRiskThreshold: 0.4,
    showOnContactProfile: false,
  },
}

/**
 * The agent ships in `draft`, invisible to customers until explicitly launched (FR-4.47).
 * One knowledge source carries `injectionDetected` so the "instructions were ignored" notice
 * has something real to render.
 */
export const aiAgent: AiAgent = {
  id: 'agent1',
  name: 'Bolt',
  color: 'var(--ai)',
  identity:
    'You are Bolt, support for BoltSupport. Friendly and plain spoken, never salesy. Explain one step at a time and name the doc you used.',
  status: 'draft',
  sources: [
    {
      id: 'ks1',
      type: 'website',
      label: 'boltsupport.io',
      url: 'https://boltsupport.io',
      status: 'indexed',
      pages: 128,
      lastSyncAt: minutesBefore(SEED_NOW, 120),
      injectionDetected: false,
    },
    {
      id: 'ks2',
      type: 'docs',
      label: 'docs.boltsupport.io',
      url: 'https://docs.boltsupport.io',
      status: 'indexed',
      pages: 48,
      lastSyncAt: minutesBefore(SEED_NOW, 120),
      injectionDetected: true,
    },
    {
      id: 'ks3',
      type: 'snippet',
      label: 'Refund policy snippet',
      status: 'indexed',
      pages: 1,
      lastSyncAt: minutesBefore(SEED_NOW, 1_440),
      injectionDetected: false,
    },
    {
      id: 'ks4',
      type: 'website',
      label: 'status.boltsupport.io',
      url: 'https://status.boltsupport.io',
      status: 'failed',
      pages: 0,
      lastSyncAt: minutesBefore(SEED_NOW, 1_440),
      injectionDetected: false,
    },
  ],
  guardrails: {
    escalateOnLowConfidence: true,
    escalateOnRepeat: true,
    avoidTopics: ['refunds', 'contract terms', 'security incidents'],
    businessHoursOnly: false,
    confidenceThreshold: 0.75,
  },
  deployment: { channelIds: ['ch2'] },
  stats: { handled: 412, resolutionRate: 0.38, escalationRate: 0.24 },
}

/**
 * The workspace knowledge layer, one source of each kind.
 *
 * The states are chosen so every screen has something real to render: a source that is ready, a
 * source still indexing, a source flagged for injection, and a proven answer sitting in draft
 * waiting for somebody to approve it.
 */
export const knowledgeBases: KnowledgeBase[] = [
  {
    id: 'kb1',
    kind: 'documentation',
    label: 'Help centre',
    description: 'Every published article, kept in step as you edit them.',
    status: 'ready',
    itemCount: 10,
    lastIndexedAt: minutesBefore(SEED_NOW, 45),
    usedBy: ['summary', 'autoDraft', 'evaluation', 'agent'],
    injectionDetected: false,
    collectionIds: [],
  },
  {
    id: 'kb2',
    kind: 'qa',
    label: 'Policies and facts',
    description: 'Short answers to the things customers ask that are not worth an article.',
    status: 'ready',
    itemCount: 4,
    lastIndexedAt: minutesBefore(SEED_NOW, 120),
    usedBy: ['autoDraft', 'evaluation', 'agent'],
    injectionDetected: false,
    entries: [
      {
        id: 'qa1',
        question: 'How long is the refund window?',
        answer: '30 days from the invoice date. A lead can approve anything outside that.',
      },
      {
        id: 'qa2',
        question: 'Which regions can a workspace be hosted in?',
        answer:
          'United States, Ireland, and Australia. Moving an existing workspace takes 48 hours.',
      },
      {
        id: 'qa3',
        question: 'Is there a free trial?',
        answer:
          '14 days on any plan, no card. It converts to the plan you picked unless you cancel.',
      },
      {
        id: 'qa4',
        question: 'Do you support SAML?',
        answer: 'Yes, on Business and above, alongside SCIM provisioning. OIDC is not supported.',
      },
    ],
  },
  {
    id: 'kb3',
    kind: 'proven',
    label: 'Proven answers',
    description: 'Answers lifted from conversations your team already resolved.',
    status: 'ready',
    // Two approved. The third is still a draft, and a draft teaches nothing.
    itemCount: 2,
    lastIndexedAt: minutesBefore(SEED_NOW, 300),
    usedBy: ['autoDraft'],
    injectionDetected: false,
    answers: [
      {
        id: 'pa1',
        conversationId: 'c2',
        conversationSubject: 'Webhook retries stopped after 402',
        question: 'Why did webhook retries stop after a 402?',
        answer:
          'A 402 is treated as a permanent failure, so the retry schedule is dropped rather than ' +
          'backed off. Clear the billing hold, then re-enable the endpoint to restart delivery.',
        state: 'approved',
        similarCount: 14,
      },
      {
        id: 'pa2',
        conversationId: 'c3',
        conversationSubject: 'Custom domain for the knowledge base',
        question: 'How do I put the knowledge base on my own domain?',
        answer:
          'Add a CNAME from your subdomain to docs.boltsupport.io, then enter it under Docs sites. ' +
          'The certificate is issued automatically and takes about ten minutes.',
        state: 'approved',
        similarCount: 9,
      },
      {
        id: 'pa3',
        conversationId: 'c4',
        conversationSubject: 'Move our workspace to the EU region',
        question: 'Can we move an existing workspace to the EU?',
        answer:
          'Yes. We schedule it out of hours, it takes about 48 hours, and the workspace is read ' +
          'only for the last two of them. Raise it with your account lead to book a window.',
        // Left in draft on purpose: the review queue needs something waiting in it.
        state: 'draft',
        similarCount: 6,
      },
    ],
  },
  {
    id: 'kb4',
    kind: 'website',
    label: 'boltsupport.io/pricing',
    description: 'Public pricing and plan limits, re-crawled weekly.',
    status: 'indexing',
    itemCount: 0,
    usedBy: ['agent'],
    // Somebody else's page. Flagged so the "instructions were ignored" notice has a real subject.
    injectionDetected: true,
    url: 'https://boltsupport.io/pricing',
  },
]
