import { BookOpen, Check, Globe, MessageSquareQuote } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AiFeature, KnowledgeKind } from '@/types'

/**
 * What each kind is for, in the words somebody choosing between them needs.
 *
 * The distinction that matters is not the file format, it is who wrote it and who checked it.
 * Documentation was written for customers and has already been reviewed. A question and answer
 * pair is written for the AI and nobody else will ever read it, so it can be blunt about things
 * an article has to be diplomatic about. A proven answer already worked on a real person. A
 * website is somebody else's text that we happen to have fetched, and is the only one of the four
 * that nobody here has read.
 */
export const KIND_META: Record<
  KnowledgeKind,
  { label: string; icon: LucideIcon; blurb: string; unit: string; addLabel: string }
> = {
  documentation: {
    label: 'Documentation',
    icon: BookOpen,
    blurb: 'Your published help centre, kept in step as you edit it.',
    unit: 'articles',
    addLabel: 'Connect documentation',
  },
  qa: {
    label: 'Questions and answers',
    icon: MessageSquareQuote,
    blurb: 'Short answers to things customers ask that are not worth a whole article.',
    unit: 'pairs',
    addLabel: 'Add questions and answers',
  },
  proven: {
    label: 'Proven answers',
    icon: Check,
    blurb: 'Answers lifted from conversations your team already resolved, once you approve them.',
    unit: 'answers',
    addLabel: 'Build from resolved conversations',
  },
  website: {
    label: 'Website',
    icon: Globe,
    blurb: 'Public pages we fetch on a schedule. Nobody here writes or reviews these.',
    unit: 'pages',
    addLabel: 'Crawl a website',
  },
}

/** Rail order, so a card list and the add menu agree. */
export const KINDS: KnowledgeKind[] = ['documentation', 'qa', 'proven', 'website']

export const FEATURE_LABEL: Record<AiFeature, string> = {
  summary: 'Summary',
  autoDraft: 'Auto draft',
  autoTag: 'Auto tag',
  autoAssign: 'Auto assign',
  evaluation: 'Check reply',
  satisfaction: 'Predicted satisfaction',
  healthScore: 'Health score',
  sentimentDrift: 'Sentiment drift',
  silentChurn: 'Silent churn',
  refundThreat: 'Refund threat',
  agent: 'AI agent',
}
