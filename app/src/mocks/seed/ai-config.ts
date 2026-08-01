import type { AiAgent, AiSettings } from '@/types'
import { minutesBefore } from '@/lib/rand'
import { SEED_NOW } from './clock'

/**
 * Every auto apply mode starts on `suggest` (AI-7). The seed deliberately ships the product in
 * the state a real workspace should start in, so nothing is applied without a human until the
 * acceptance rates in the audit tables justify promoting it.
 */
export const aiSettings: AiSettings = {
  enabled: true,
  autoAssign: {
    enabled: true,
    mode: 'suggest',
    threshold: 0.75,
    // Workload is off by default, which is exactly the combination the settings page warns
    // about if someone turns auto apply on. The guardrail needs a reachable failure state.
    signals: ['skills', 'history', 'availability', 'language'],
    fallbackUserId: null,
    excludedUserIds: [],
    maxConcurrentPerAgent: 12,
  },
  autoTag: {
    enabled: true,
    mode: 'suggest',
    threshold: 0.9,
    allowedTagIds: ['t1', 't2', 't3', 't4', 't5'],
    descriptions: {
      t2: 'the customer wants money back, not a return',
      t3: 'the customer mentions their bank or a dispute',
      t4: 'single sign on setup, SAML or OIDC',
    },
  },
  autoDraft: {
    enabled: true,
    defaultTone: 'friendly',
    useKnowledgeBase: true,
    lowConfidenceThreshold: 0.6,
  },
  evaluation: { enabled: true, samplingRate: 0.25 },
  satisfaction: { enabled: true, visibleTo: 'everyone' },
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
