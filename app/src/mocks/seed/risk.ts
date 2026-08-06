import type { AccountHealth, ChurnAlert, HealthSignal, RefundThreat, SentimentDrift } from '@/types'
import { bandFor } from '@/types'
import { minutesBefore } from '@/lib/rand'
import { SEED_NOW } from './clock'

/**
 * Risk fixtures for the four detectors.
 *
 * Written so every branch of every screen has something real behind it rather than one happy
 * account repeated: an account in each health band, a sentiment trend going each of the three
 * directions, four churn alerts whose reasons share no sentence structure, and a refund threat in
 * each of its three states. The reasons in particular are deliberately unalike, because a layout
 * built against one example sentence breaks the first time a real one is longer.
 */

const DAY = 1_440

/** Points sum to the score by construction, so the breakdown can never disagree with the total. */
function health(contactId: string, signals: HealthSignal[], trendScores: number[]): AccountHealth {
  const score = signals.reduce((total, signal) => total + signal.points, 0)
  return {
    contactId,
    score,
    band: bandFor(score),
    // Oldest first, one reading a fortnight apart, ending on the current score.
    trend: [...trendScores, score].map((value, index, all) => ({
      at: minutesBefore(SEED_NOW, (all.length - 1 - index) * 14 * DAY),
      score: value,
    })),
    signals,
    updatedAt: minutesBefore(SEED_NOW, 90),
  }
}

export const accountHealth: AccountHealth[] = [
  // Northwind: the at risk account the rest of the fixtures hang off.
  health(
    'ct1',
    [
      {
        key: 'repeat_issues',
        points: 24,
        value: '4 on billing sync',
        direction: 'worse',
        detail:
          'Four conversations about the same failing sync in 30 days, three of them reopened.',
      },
      {
        key: 'resolution_drift',
        points: 18,
        value: '2.1d, up from 0.9d',
        direction: 'worse',
        detail:
          "Time to resolve has more than doubled against this account's own three month mean.",
      },
      {
        key: 'response_latency',
        points: 14,
        value: '9h first reply',
        direction: 'worse',
        detail: 'First replies are landing outside the SLA target of four hours on this plan.',
      },
      {
        key: 'escalation_rate',
        points: 12,
        value: '2 of 6 escalated',
        direction: 'worse',
        detail:
          'A third of their recent conversations needed a lead, against a workspace norm of 8%.',
      },
      {
        key: 'sentiment_trend',
        points: 10,
        value: 'Declining',
        direction: 'worse',
        detail: 'Mean sentiment across the last five tickets fell from +0.31 to minus 0.28.',
      },
    ],
    [31, 38, 44, 52, 61],
  ),

  // Helix: middle band, and the interesting part is that one signal is improving.
  health(
    'ct2',
    [
      {
        key: 'repeat_issues',
        points: 8,
        value: '2 on SSO',
        direction: 'flat',
        detail: 'Two conversations about SAML group mapping, neither reopened.',
      },
      {
        key: 'resolution_drift',
        points: 6,
        value: '1.4d, up from 1.1d',
        direction: 'worse',
        detail: 'Slightly slower than their own baseline, within normal variation for the plan.',
      },
      {
        key: 'response_latency',
        points: 16,
        value: '6h first reply',
        direction: 'worse',
        detail: 'First replies drifted past the four hour target twice in the last fortnight.',
      },
      {
        key: 'escalation_rate',
        points: 4,
        value: '1 of 9 escalated',
        direction: 'better',
        detail: 'Down from three of nine last quarter, so the routing change is holding.',
      },
      {
        key: 'sentiment_trend',
        points: 9,
        value: 'Stable',
        direction: 'flat',
        detail: 'Mean sentiment is flat at +0.12 across the last five tickets.',
      },
    ],
    [51, 47, 44, 41, 44],
  ),

  // Brightpath: healthy, and improving, so the trend line has a downward shape somewhere.
  health(
    'ct3',
    [
      {
        key: 'repeat_issues',
        points: 4,
        value: 'None',
        direction: 'better',
        detail: 'No topic has come back twice in 60 days.',
      },
      {
        key: 'resolution_drift',
        points: 3,
        value: '0.6d, down from 1.0d',
        direction: 'better',
        detail: 'Resolving faster than their own baseline for the third month running.',
      },
      {
        key: 'response_latency',
        points: 5,
        value: '1.2h first reply',
        direction: 'better',
        detail: 'Comfortably inside the four hour target on every conversation this month.',
      },
      {
        key: 'escalation_rate',
        points: 2,
        value: '0 of 7 escalated',
        direction: 'flat',
        detail: 'Nothing has needed a lead since March.',
      },
      {
        key: 'sentiment_trend',
        points: 4,
        value: 'Improving',
        direction: 'better',
        detail: 'Mean sentiment rose from +0.22 to +0.54 across the last five tickets.',
      },
    ],
    [34, 30, 26, 22, 20],
  ),

  /*
   * Priya at quanta.in, who also carries a churn alert.
   *
   * The three account detectors have to line up on the same contacts. Seeding churn for an account
   * with no health score left an agent looking at "usage down 62%" with nothing to put it next to,
   * which is the exact moment the score is worth having.
   */
  health(
    'ct4',
    [
      {
        key: 'repeat_issues',
        points: 9,
        value: '1 on seat billing',
        direction: 'flat',
        detail: 'One duplicated charge, raised once and not reopened.',
      },
      {
        key: 'resolution_drift',
        points: 15,
        value: '3.4d, up from 1.2d',
        direction: 'worse',
        detail: 'Nearly three times their own baseline, mostly waiting on us rather than on them.',
      },
      {
        key: 'response_latency',
        points: 22,
        value: '14h first reply',
        direction: 'worse',
        detail: 'The slowest first replies of any account on this plan in the last month.',
      },
      {
        key: 'escalation_rate',
        points: 6,
        value: '1 of 8 escalated',
        direction: 'flat',
        detail: 'In line with the workspace norm.',
      },
      {
        key: 'sentiment_trend',
        points: 20,
        value: 'Declining',
        direction: 'worse',
        detail:
          'Both admins stopped replying rather than complaining, which reads worse, not better.',
      },
    ],
    [28, 33, 41, 55, 64],
  ),

  // Desmond at aperturelabs. Watch band, and the signals disagree with each other on purpose.
  health(
    'ct5',
    [
      {
        key: 'repeat_issues',
        points: 14,
        value: '3 on exports',
        direction: 'worse',
        detail: 'Three conversations about getting data out, which is rarely idle curiosity.',
      },
      {
        key: 'resolution_drift',
        points: 5,
        value: '0.8d, down from 1.1d',
        direction: 'better',
        detail: 'Resolving faster than their baseline, so the slowness is not ours.',
      },
      {
        key: 'response_latency',
        points: 7,
        value: '2.4h first reply',
        direction: 'flat',
        detail: 'Comfortably inside the four hour target.',
      },
      {
        key: 'escalation_rate',
        points: 3,
        value: '0 of 11 escalated',
        direction: 'better',
        detail: 'Nothing has needed a lead this quarter.',
      },
      {
        key: 'sentiment_trend',
        points: 13,
        value: 'Stable',
        direction: 'flat',
        detail: 'Polite throughout, which is why the export questions are the only signal here.',
      },
    ],
    [39, 37, 40, 41, 40],
  ),

  // Lena at northgate. Quiet rather than unhappy, so the score is carried by absence.
  health(
    'ct6',
    [
      {
        key: 'repeat_issues',
        points: 3,
        value: 'None',
        direction: 'better',
        detail: 'Nothing has come back twice.',
      },
      {
        key: 'resolution_drift',
        points: 4,
        value: '0.9d, flat',
        direction: 'flat',
        detail: 'Steady, on the rare occasions they write in.',
      },
      {
        key: 'response_latency',
        points: 6,
        value: '3.1h first reply',
        direction: 'flat',
        detail: 'Inside target every time.',
      },
      {
        key: 'escalation_rate',
        points: 2,
        value: '0 of 4 escalated',
        direction: 'flat',
        detail: 'Nothing has needed a lead.',
      },
      {
        key: 'sentiment_trend',
        points: 27,
        value: 'No recent tickets',
        direction: 'worse',
        detail: 'Nothing to read for 47 days. Silence after weekly contact is its own signal.',
      },
    ],
    [22, 24, 29, 36, 40],
  ),
]

/* --------------------------------------------------------------- sentiment */

function point(conversationId: string, subject: string, daysAgo: number, sentiment: number) {
  return { conversationId, subject, at: minutesBefore(SEED_NOW, daysAgo * DAY), sentiment }
}

export const sentimentDrift: SentimentDrift[] = [
  {
    contactId: 'ct1',
    direction: 'declining',
    current: -0.28,
    previous: 0.31,
    windowSize: 5,
    // Oldest first. The shape is the feature: two windows, and the second one falls away.
    points: [
      point('c11', 'Seat count question', 44, 0.42),
      point('c12', 'Invoice copy for finance', 39, 0.38),
      point('c13', 'Sync paused after a card decline', 33, 0.21),
      point('c14', 'Sync still paused', 27, 0.35),
      point('c15', 'Billing sync failing again', 21, 0.19),
      point('c16', 'Third time on billing sync', 15, -0.12),
      point('c17', 'No reply on the sync ticket', 11, -0.24),
      point('c18', 'This is becoming a problem', 6, -0.41),
      point('c19', 'Escalating internally', 3, -0.35),
      point('c20', 'Where are we on this', 1, -0.28),
    ],
    updatedAt: minutesBefore(SEED_NOW, 120),
  },
  {
    contactId: 'ct2',
    direction: 'stable',
    current: 0.12,
    previous: 0.09,
    windowSize: 5,
    points: [
      point('c21', 'SAML group mapping', 40, 0.05),
      point('c22', 'SCIM provisioning question', 34, 0.14),
      point('c23', 'Adding a second domain', 28, 0.08),
      point('c24', 'Login loop on staging', 22, 0.02),
      point('c25', 'Login loop resolved', 17, 0.16),
      point('c26', 'Bulk user import', 12, 0.11),
      point('c27', 'Import formatting', 8, 0.09),
      point('c28', 'Import worked, thanks', 5, 0.24),
      point('c29', 'One more SSO question', 3, 0.06),
      point('c30', 'All set', 1, 0.1),
    ],
    updatedAt: minutesBefore(SEED_NOW, 200),
  },
  {
    contactId: 'ct3',
    direction: 'improving',
    current: 0.54,
    previous: 0.22,
    windowSize: 5,
    points: [
      point('c31', 'Docs site not building', 38, -0.08),
      point('c32', 'Custom domain certificate', 31, 0.11),
      point('c33', 'Certificate issued', 26, 0.29),
      point('c34', 'Search not indexing', 20, 0.18),
      point('c35', 'Indexing fixed', 15, 0.4),
      point('c36', 'Theme question', 11, 0.47),
      point('c37', 'Very happy with the migration', 7, 0.68),
      point('c38', 'Small copy tweak', 4, 0.51),
      point('c39', 'Thanks for the quick turnaround', 2, 0.62),
      point('c40', 'One last thing', 1, 0.42),
    ],
    updatedAt: minutesBefore(SEED_NOW, 240),
  },
  {
    contactId: 'ct4',
    direction: 'declining',
    current: -0.12,
    previous: 0.24,
    windowSize: 5,
    points: [
      point('c44', 'Adding ten more seats', 52, 0.34),
      point('c45', 'Invoice address change', 46, 0.28),
      point('c46', 'Seat count looks wrong', 40, 0.19),
      point('c47', 'Duplicated seat charge', 34, 0.11),
      point('c48', 'Still showing 48 seats', 29, 0.28),
      point('c49', 'Refund for duplicated seat charge', 22, -0.04),
      point('c50', 'Any update on the refund', 16, -0.11),
      point('c51', 'Chasing again', 10, -0.18),
      point('c52', 'Renewal quote for 40 seats', 6, -0.09),
      point('c53', 'Who should I speak to', 2, -0.18),
    ],
    updatedAt: minutesBefore(SEED_NOW, 150),
  },
  {
    contactId: 'ct5',
    direction: 'stable',
    current: 0.19,
    previous: 0.21,
    windowSize: 5,
    points: [
      point('c54', 'Webhook signature check', 44, 0.22),
      point('c55', 'Retry backoff question', 37, 0.17),
      point('c56', 'Rate limit headers', 30, 0.26),
      point('c57', 'Sandbox keys', 24, 0.18),
      point('c58', 'Sandbox keys rotated', 19, 0.22),
      point('c59', 'Exporting conversation history', 13, 0.21),
      point('c60', 'Export including attachments', 9, 0.14),
      point('c61', 'Export format options', 5, 0.16),
      point('c62', 'Thanks for the help', 3, 0.29),
      point('c63', 'One more thing', 1, 0.15),
    ],
    updatedAt: minutesBefore(SEED_NOW, 280),
  },
  {
    contactId: 'ct6',
    direction: 'stable',
    current: 0.27,
    previous: 0.31,
    windowSize: 5,
    // The last of these is 47 days old. The churn alert on this account is about the gap after it.
    points: [
      point('c64', 'Onboarding the second team', 96, 0.38),
      point('c65', 'Permissions for the new hires', 89, 0.29),
      point('c66', 'Custom fields on contacts', 82, 0.27),
      point('c67', 'Reporting on tags', 74, 0.3),
      point('c68', 'Weekly digest email', 67, 0.31),
      point('c69', 'Digest timing', 61, 0.24),
      point('c70', 'Saved views for the team', 56, 0.33),
      point('c71', 'Bulk closing old threads', 52, 0.22),
      point('c72', 'That worked, thanks', 49, 0.35),
      point('c73', 'Quick question on SLAs', 47, 0.21),
    ],
    updatedAt: minutesBefore(SEED_NOW, 400),
  },
]

/* ------------------------------------------------------------- silent churn */

/**
 * Four reasons that share no shape.
 *
 * Different lengths, different structures, different evidence. If the layout only works for the
 * first one it will be obvious immediately rather than the first time a real reason is written.
 */
export const churnAlerts: ChurnAlert[] = [
  {
    id: 'ch1',
    contactId: 'ct1',
    reason: '3 reopened tickets on billing sync in 18 days, no reply since 6 August',
    risk: 'high',
    confidence: 0.84,
    detectedAt: minutesBefore(SEED_NOW, 180),
    lastInboundAt: minutesBefore(SEED_NOW, 6 * DAY),
    evidence: [
      { conversationId: 'c15', subject: 'Billing sync failing again' },
      { conversationId: 'c16', subject: 'Third time on billing sync' },
      { conversationId: 'c18', subject: 'This is becoming a problem' },
    ],
    state: 'open',
  },
  {
    id: 'ch2',
    contactId: 'ct4',
    reason:
      'Usage down 62% since the June renewal and the two admins who opened every previous ticket have both stopped replying',
    risk: 'high',
    confidence: 0.79,
    detectedAt: minutesBefore(SEED_NOW, 2 * DAY),
    lastInboundAt: minutesBefore(SEED_NOW, 31 * DAY),
    evidence: [{ conversationId: 'c41', subject: 'Renewal quote for 40 seats' }],
    state: 'open',
  },
  {
    id: 'ch3',
    contactId: 'ct5',
    reason: 'Asked about export formats twice in a week, which is usually somebody leaving',
    risk: 'medium',
    confidence: 0.66,
    detectedAt: minutesBefore(SEED_NOW, 5 * DAY),
    lastInboundAt: minutesBefore(SEED_NOW, 5 * DAY),
    evidence: [
      { conversationId: 'c42', subject: 'Exporting conversation history' },
      { conversationId: 'c43', subject: 'Export including attachments' },
    ],
    state: 'acknowledged',
  },
  {
    id: 'ch4',
    contactId: 'ct6',
    reason: 'Quiet for 47 days after a run of weekly tickets, and never rated the last one',
    risk: 'medium',
    confidence: 0.61,
    detectedAt: minutesBefore(SEED_NOW, 9 * DAY),
    lastInboundAt: minutesBefore(SEED_NOW, 47 * DAY),
    evidence: [],
    state: 'open',
  },
]

/* ------------------------------------------------------------ refund threat */

export const refundThreats: RefundThreat[] = [
  {
    id: 'rt1',
    conversationId: 'c1',
    messageId: 'm1',
    confidence: 0.91,
    phrase:
      'If this is not sorted by Friday we will be asking for a refund for the whole annual term.',
    detectedAt: minutesBefore(SEED_NOW, 40),
    state: 'open',
  },
  {
    id: 'rt2',
    conversationId: 'c2',
    messageId: 'm4',
    confidence: 0.82,
    phrase: 'I have already asked my bank to reverse the last two payments.',
    detectedAt: minutesBefore(SEED_NOW, 5 * DAY),
    state: 'escalated',
  },
  {
    id: 'rt3',
    conversationId: 'c3',
    messageId: 'm7',
    confidence: 0.77,
    phrase: 'What does your refund policy actually say?',
    // Dismissed on purpose: asking how refunds work is not threatening one, and the settings page
    // says exactly that. The fixture proves the state exists.
    detectedAt: minutesBefore(SEED_NOW, 12 * DAY),
    state: 'dismissed',
  },
]
