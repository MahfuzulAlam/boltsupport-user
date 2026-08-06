import { z } from 'zod'
import { confidenceSchema, idSchema, isoDateSchema } from './common'
import { csatSchema, sentimentSchema } from './enums'

/**
 * AI domain types.
 *
 * Several fields exist purely to carry a safety guarantee, and dropping one silently removes
 * the guardrail it backs:
 *   confidence + rationale  gate auto apply and back the "Why?" popover (AI-7)
 *   state                   distinguishes a proposal from an applied change (AI-4)
 *   injectionDetected       drives the visible "instructions were ignored" notice (AI-3)
 *   sourceLastMessageId     derives summary staleness without polling (FR-4.5)
 *   undoableUntil           bounds the undo window on an applied AI action (AI-4)
 */

export const aiSummarySchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  /** Two to four bullets. Structured output beats a wall of text (FR-4.2). */
  tldr: z.array(z.string()).min(1).max(5),
  customerWants: z.string(),
  alreadyTried: z.string(),
  blockedOn: z.string(),
  suggestedNextStep: z.string(),
  sentiment: sentimentSchema,
  messageCount: z.number().int().nonnegative(),
  /** Compare against Conversation.lastMessageId to derive staleness. Never poll for it. */
  sourceLastMessageId: idSchema,
  generatedAt: isoDateSchema,
  model: z.string(),
  injectionDetected: z.boolean(),
})
export type AiSummary = z.infer<typeof aiSummarySchema>

export const aiSuggestionKindSchema = z.enum(['assign', 'tag', 'priority'])
export type AiSuggestionKind = z.infer<typeof aiSuggestionKindSchema>

/** One weighted signal behind a suggestion. A bare score with no explanation is either
 *  ignored or trusted blindly, and both are failures. */
export const aiRationaleSchema = z.object({
  signal: z.string(),
  weight: z.number(),
})
export type AiRationale = z.infer<typeof aiRationaleSchema>

export const aiSuggestionSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  kind: aiSuggestionKindSchema,
  /** A userId, tagId, or priority depending on `kind`. */
  value: z.string(),
  confidence: confidenceSchema,
  rationale: z.array(aiRationaleSchema),
  state: z.enum(['pending', 'accepted', 'rejected', 'auto_applied']),
  createdAt: isoDateSchema,
})
export type AiSuggestion = z.infer<typeof aiSuggestionSchema>

export const aiToneSchema = z.enum(['friendly', 'neutral', 'formal', 'apologetic'])
export type AiTone = z.infer<typeof aiToneSchema>

export const aiLengthSchema = z.enum(['short', 'standard', 'detailed'])
export type AiLength = z.infer<typeof aiLengthSchema>

export const aiSourceSchema = z.object({
  id: idSchema,
  type: z.enum(['doc', 'saved_reply']),
  title: z.string(),
})
export type AiSource = z.infer<typeof aiSourceSchema>

export const aiDraftSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  bodyHtml: z.string(),
  tone: aiToneSchema,
  length: aiLengthSchema,
  language: z.string(),
  confidence: confidenceSchema,
  /** Empty means no knowledge matched, which the UI must state out loud (FR-4.15). */
  sources: z.array(aiSourceSchema),
  injectionDetected: z.boolean(),
  createdAt: isoDateSchema,
})
export type AiDraft = z.infer<typeof aiDraftSchema>

export const evalVerdictSchema = z.enum(['pass', 'warn', 'fail'])
export type EvalVerdict = z.infer<typeof evalVerdictSchema>

export const evalCriterionSchema = z.enum(['accuracy', 'completeness', 'tone', 'clarity', 'policy'])
export type EvalCriterion = z.infer<typeof evalCriterionSchema>

export const evaluationCriteriaSchema = z.object({
  key: evalCriterionSchema,
  verdict: evalVerdictSchema,
  note: z.string(),
  /** Character offsets into the plain text serialization of the draft. */
  spans: z
    .array(z.object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative() }))
    .optional(),
})

export const evaluationSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  messageId: idSchema.optional(),
  agentId: idSchema,
  score: z.number().int().min(0).max(100),
  criteria: z.array(evaluationCriteriaSchema),
  /** The highest value catch in the feature, so it outranks the score visually (FR-4.35). */
  unansweredQuestion: z.string().optional(),
  rationale: z.string(),
  disagreed: z.object({ by: idSchema, reason: z.string() }).optional(),
  createdAt: isoDateSchema,
})
export type Evaluation = z.infer<typeof evaluationSchema>

export const predictedSatisfactionSchema = z.object({
  rating: csatSchema,
  confidence: confidenceSchema,
  drivers: z.array(z.string()),
  predictedAt: isoDateSchema,
  /** Populated once the customer rates. Drives the calibration grid, and demotes the
   *  prediction to a footnote wherever both exist (FR-4.40). */
  actualRating: csatSchema.optional(),
})
export type PredictedSatisfaction = z.infer<typeof predictedSatisfactionSchema>

/*
 * The workspace knowledge layer.
 *
 * Every AI feature that needs to know something about your product reads from here, rather than
 * each one carrying its own idea of what it is allowed to look at. Before this, only the customer
 * facing agent had sources and Auto Draft had a single `useKnowledgeBase` boolean, so "what does
 * the AI actually know" had two different answers depending on which screen you asked from.
 */

/** Every feature that can read a source, in the order they appear in the rail. */
export const aiFeatureSchema = z.enum([
  'summary',
  'autoDraft',
  'autoTag',
  'autoAssign',
  'evaluation',
  'satisfaction',
  'healthScore',
  'sentimentDrift',
  'silentChurn',
  'refundThreat',
  'agent',
])
export type AiFeature = z.infer<typeof aiFeatureSchema>

/**
 * The four kinds of thing a workspace can teach the AI.
 *
 * They are separate kinds rather than one "document" with a type field because each is gathered
 * differently and trusted differently: documentation is written for customers and already
 * reviewed, a question and answer pair is written for the AI and nobody else reads it, a proven
 * answer is lifted from a conversation that actually worked, and a website is somebody else's
 * text that we happen to have fetched.
 */
export const knowledgeKindSchema = z.enum(['documentation', 'qa', 'proven', 'website'])
export type KnowledgeKind = z.infer<typeof knowledgeKindSchema>

/** One question and its answer. The smallest unit of knowledge somebody can write by hand. */
export const qaEntrySchema = z.object({
  id: idSchema,
  question: z.string().min(1),
  answer: z.string().min(1),
})
export type QaEntry = z.infer<typeof qaEntrySchema>

/**
 * An answer lifted out of a conversation that was already resolved.
 *
 * Kept as a draft until somebody approves it, because the reply that resolved one conversation
 * was written for one customer: it can carry an account number, a one off discount, or a promise
 * nobody wants repeated. Approval is the step where that gets noticed.
 */
export const provenAnswerSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  /** Kept for the citation, so an agent can open the thread this came from. */
  conversationSubject: z.string(),
  question: z.string(),
  answer: z.string(),
  state: z.enum(['draft', 'approved', 'rejected']),
  /** How many later conversations looked like the one this came from. */
  similarCount: z.number().int().nonnegative(),
})
export type ProvenAnswer = z.infer<typeof provenAnswerSchema>

export const knowledgeBaseSchema = z.object({
  id: idSchema,
  kind: knowledgeKindSchema,
  label: z.string().min(1),
  /** One line saying what is in here, shown under the label. */
  description: z.string(),
  status: z.enum(['draft', 'indexing', 'ready', 'failed']),
  /** Articles, pairs, answers, or pages, depending on the kind. */
  itemCount: z.number().int().nonnegative(),
  lastIndexedAt: isoDateSchema.optional(),
  /**
   * Which features may read this source.
   *
   * Scoping lives on the source rather than in each feature's settings so that adding a feature
   * later cannot silently widen what an existing source is used for. An empty list is a source
   * that is stored and indexed but not yet in use, which is a legitimate state while somebody
   * fills it in.
   */
  usedBy: z.array(aiFeatureSchema),
  /** Crawled or customer authored text is untrusted. A flagged source still indexes, as data
   *  (AI-2, AI-3). */
  injectionDetected: z.boolean(),

  /** website only. */
  url: z.string().optional(),
  /** documentation only. Absent means every collection. */
  collectionIds: z.array(idSchema).optional(),
  /** qa only. */
  entries: z.array(qaEntrySchema).optional(),
  /** proven only. */
  answers: z.array(provenAnswerSchema).optional(),
})
export type KnowledgeBase = z.infer<typeof knowledgeBaseSchema>

export const agentStatusSchema = z.enum(['draft', 'live', 'paused'])
export type AgentStatus = z.infer<typeof agentStatusSchema>

export const knowledgeSourceSchema = z.object({
  id: idSchema,
  type: z.enum(['website', 'snippet', 'docs']),
  label: z.string(),
  url: z.string().optional(),
  status: z.enum(['queued', 'crawling', 'indexed', 'failed']),
  pages: z.number().int().nonnegative(),
  lastSyncAt: isoDateSchema.optional(),
  /** Crawled pages are untrusted. A flagged source still indexes, as data (AI-2, AI-3). */
  injectionDetected: z.boolean(),
})
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>

export const aiAgentSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  color: z.string(),
  identity: z.string(),
  status: agentStatusSchema,
  sources: z.array(knowledgeSourceSchema),
  guardrails: z.object({
    escalateOnLowConfidence: z.boolean(),
    escalateOnRepeat: z.boolean(),
    avoidTopics: z.array(z.string()),
    businessHoursOnly: z.boolean(),
    confidenceThreshold: confidenceSchema,
  }),
  deployment: z.object({ channelIds: z.array(idSchema) }),
  stats: z.object({
    handled: z.number().int().nonnegative(),
    resolutionRate: confidenceSchema,
    escalationRate: confidenceSchema,
  }),
})
export type AiAgent = z.infer<typeof aiAgentSchema>

/** Auto apply modes default to off and are gated on a threshold (AI-7). */
export const aiModeSchema = z.enum(['suggest', 'auto'])
export type AiMode = z.infer<typeof aiModeSchema>

/**
 * Free text an admin writes to steer one feature.
 *
 * Every feature has its own rather than sharing a workspace wide prompt, because the useful
 * instruction for tagging ("treat a chargeback as billing, not as a complaint") is noise to the
 * summariser and would quietly cost accuracy if they shared a field. Capped so a runaway
 * instruction cannot crowd out the conversation it is meant to be reasoning about.
 */
export const instructionsSchema = z.string().max(2000)

/** How long a piece of guidance can be before the field stops accepting more. */
export const INSTRUCTIONS_MAX = 2000

export const aiSettingsSchema = z.object({
  /** Workspace kill switch. Off produces calm disabled states, never errors (AI-11). */
  enabled: z.boolean(),

  /**
   * Guidance that applies to everything: who you are, what you sell, how you speak.
   *
   * Per feature instructions are added to this rather than replacing it, so the description of
   * the business is written once and the per feature fields stay about the feature.
   */
  workspaceInstructions: instructionsSchema,

  summary: z.object({
    enabled: z.boolean(),
    instructions: instructionsSchema,
    /** Off means the panel waits to be asked. On, it summarises once a thread gets long. */
    autoGenerate: z.boolean(),
    /** Below this many messages a thread is quicker to read than to summarise. */
    minMessages: z.number().int().positive(),
    style: z.enum(['brief', 'detailed']),
    /** The customer wants / already tried / blocked on breakdown, rather than prose alone. */
    includeNextStep: z.boolean(),
  }),

  autoAssign: z.object({
    enabled: z.boolean(),
    instructions: instructionsSchema,
    mode: aiModeSchema,
    threshold: confidenceSchema,
    signals: z.array(z.string()),
    fallbackUserId: idSchema.nullable(),
    excludedUserIds: z.array(idSchema),
    maxConcurrentPerAgent: z.number().int().positive(),
    /** Nobody is routed work while they are marked away. */
    respectAvailability: z.boolean(),
  }),

  autoTag: z.object({
    enabled: z.boolean(),
    /**
     * Tagging guidance, kept separate from every other feature's.
     *
     * This is where a workspace writes down the distinctions its tag set implies but does not
     * state: which tag wins when two could apply, what a word means here as opposed to in
     * general. Without it the only lever is the tag name itself, and a tag called "billing"
     * cannot explain that refunds belong to it and chargebacks do not.
     */
    instructions: instructionsSchema,
    mode: aiModeSchema,
    threshold: confidenceSchema,
    /** Mandatory. The model may only choose from this list and can never invent a tag
     *  (FR-4.27). Auto apply cannot be enabled while it is empty (FR-4.28). */
    allowedTagIds: z.array(idSchema),
    descriptions: z.record(z.string(), z.string()),
    /** A ceiling, so a thread touching six topics does not come back wearing six tags. */
    maxTagsPerConversation: z.number().int().positive(),
  }),

  autoDraft: z.object({
    enabled: z.boolean(),
    instructions: instructionsSchema,
    defaultTone: aiToneSchema,
    defaultLength: aiLengthSchema,
    useKnowledgeBase: z.boolean(),
    /** Below this, one click Accept is disabled so the agent must engage (FR-4.16). */
    lowConfidenceThreshold: confidenceSchema,
    /** A draft with nothing behind it says so rather than sounding equally sure (FR-4.15). */
    requireCitations: z.boolean(),
    /** Reply in whatever language the customer wrote in. */
    matchCustomerLanguage: z.boolean(),
  }),

  evaluation: z.object({
    enabled: z.boolean(),
    instructions: instructionsSchema,
    samplingRate: confidenceSchema,
    /** Which of the five checks run. All off is the same as switching the feature off. */
    criteria: z.object({
      accuracy: z.boolean(),
      completeness: z.boolean(),
      tone: z.boolean(),
      clarity: z.boolean(),
      policy: z.boolean(),
    }),
    /** Evaluation never blocks Send (AI-6). This only decides whether it speaks up first. */
    warnBeforeSend: z.boolean(),
  }),

  /**
   * The four risk detectors.
   *
   * Each has a threshold that decides when it speaks, because the cost of a false positive differs
   * by feature: a wrong health band is noise in a sidebar, a wrong refund banner interrupts an
   * agent mid reply. They are separate numbers for that reason rather than one shared sensitivity.
   */
  healthScore: z.object({
    enabled: z.boolean(),
    instructions: instructionsSchema,
    /** Which sub signals feed the score. Turning one off removes its points, not just its row. */
    signals: z.object({
      repeatIssues: z.boolean(),
      resolutionDrift: z.boolean(),
      responseLatency: z.boolean(),
      escalationRate: z.boolean(),
      sentimentTrend: z.boolean(),
    }),
    /** Score at or above this lands the account in the At risk band. */
    atRiskAt: z.number().int().min(1).max(100),
    /** Score at or above this lands it in Watch. */
    watchAt: z.number().int().min(1).max(100),
    /** How far back the trend line runs. */
    trendDays: z.number().int().positive(),
  }),

  sentimentDrift: z.object({
    enabled: z.boolean(),
    instructions: instructionsSchema,
    /** How many recent tickets each window covers. Too few and one bad day reads as a decline. */
    windowSize: z.number().int().min(2).max(20),
    /** How far the mean must fall between windows before it counts as declining. */
    minDrop: z.number().min(0).max(2),
    /** Alert when it turns declining, rather than only showing the trend. */
    alertOnDecline: z.boolean(),
  }),

  silentChurn: z.object({
    enabled: z.boolean(),
    instructions: instructionsSchema,
    /** Days of silence from the customer before the detector starts looking. */
    quietDays: z.number().int().positive(),
    /** Reopens within the window that count as a pattern rather than bad luck. */
    reopenThreshold: z.number().int().positive(),
    minConfidence: confidenceSchema,
  }),

  refundThreat: z.object({
    enabled: z.boolean(),
    instructions: instructionsSchema,
    /** Below this the banner does not appear at all. It interrupts, so it has to be right. */
    minConfidence: confidenceSchema,
    /** Who the Escalate button hands it to. Null means whoever leads the inbox. */
    escalateToUserId: idSchema.nullable(),
    /** Also post an internal note on the conversation, so the thread carries its own record. */
    postInternalNote: z.boolean(),
  }),

  satisfaction: z.object({
    enabled: z.boolean(),
    instructions: instructionsSchema,
    visibleTo: z.enum(['everyone', 'leads']),
    /** Under this, the conversation lands in the At risk view. */
    atRiskThreshold: confidenceSchema,
    /** A prediction is a guess about a person. Off keeps it out of the customer record. */
    showOnContactProfile: z.boolean(),
  }),
})
export type AiSettings = z.infer<typeof aiSettingsSchema>
