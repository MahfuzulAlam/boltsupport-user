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

export const aiSettingsSchema = z.object({
  /** Workspace kill switch. Off produces calm disabled states, never errors (AI-11). */
  enabled: z.boolean(),
  autoAssign: z.object({
    enabled: z.boolean(),
    mode: aiModeSchema,
    threshold: confidenceSchema,
    signals: z.array(z.string()),
    fallbackUserId: idSchema.nullable(),
    excludedUserIds: z.array(idSchema),
    maxConcurrentPerAgent: z.number().int().positive(),
  }),
  autoTag: z.object({
    enabled: z.boolean(),
    mode: aiModeSchema,
    threshold: confidenceSchema,
    /** Mandatory. The model may only choose from this list and can never invent a tag
     *  (FR-4.27). Auto apply cannot be enabled while it is empty (FR-4.28). */
    allowedTagIds: z.array(idSchema),
    descriptions: z.record(z.string(), z.string()),
  }),
  autoDraft: z.object({
    enabled: z.boolean(),
    defaultTone: aiToneSchema,
    useKnowledgeBase: z.boolean(),
    /** Below this, one click Accept is disabled so the agent must engage (FR-4.16). */
    lowConfidenceThreshold: confidenceSchema,
  }),
  evaluation: z.object({ enabled: z.boolean(), samplingRate: confidenceSchema }),
  satisfaction: z.object({ enabled: z.boolean(), visibleTo: z.enum(['everyone', 'leads']) }),
})
export type AiSettings = z.infer<typeof aiSettingsSchema>
