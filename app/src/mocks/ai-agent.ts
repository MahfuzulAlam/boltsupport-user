import { getDb } from './db'

export interface AgentAnswer {
  text: string
  confidence: number
  sources: { id: string; label: string }[]
  escalated: boolean
  escalationReason?: string
}

/**
 * The test console's answer, derived from seed data rather than a model.
 *
 * The point of the console is to let an operator see the guardrails fire before a customer does,
 * so the interesting cases are the refusals: a blocked topic, a low confidence miss, and an
 * answer with nothing behind it. Those are computed from the agent's own configuration, which
 * means changing a guardrail visibly changes what the console does.
 */
/**
 * Crude singular/plural folding for topic matching.
 *
 * Someone who blocks "refunds" means "refund" as well. A guardrail that only fires on the exact
 * word they happened to type is a guardrail that leaks, and the leak is invisible until a
 * customer gets the answer it was meant to prevent.
 */
function stem(word: string): string {
  const lower = word.toLowerCase()
  return lower.length > 3 && lower.endsWith('s') ? lower.slice(0, -1) : lower
}

export function answerAsAgent(question: string): AgentAnswer {
  const agent = getDb().aiAgent
  const needle = question.toLowerCase()

  const blocked = agent.guardrails.avoidTopics.find((topic) =>
    topic
      .split(' ')
      .filter((word) => word.length > 2)
      .some((word) => needle.includes(stem(word))),
  )
  if (blocked !== undefined) {
    return {
      text: `I am not able to help with ${blocked}. Let me pass you to someone on the team who can.`,
      confidence: 1,
      sources: [],
      escalated: true,
      escalationReason: `“${blocked}” is on the topics to avoid list.`,
    }
  }

  const articles = getDb()
    .articles.filter((article) => article.status === 'published')
    .filter(
      (article) =>
        article.keywords.some((keyword) => needle.includes(keyword)) ||
        needle.includes(article.title.toLowerCase().split(' ')[0] ?? ''),
    )
    .slice(0, 2)

  if (articles.length === 0) {
    return {
      text: 'I could not find anything in my sources that answers that. I will hand this to a teammate with the full conversation so far.',
      confidence: 0.2,
      sources: [],
      escalated: true,
      escalationReason: 'Nothing in the indexed sources matched.',
    }
  }

  const confidence = articles.length > 1 ? 0.91 : 0.72
  if (
    agent.guardrails.escalateOnLowConfidence &&
    confidence < agent.guardrails.confidenceThreshold
  ) {
    return {
      text: 'I think I know the answer, but not well enough to be sure. Passing you to a teammate.',
      confidence,
      sources: articles.map((article) => ({ id: article.id, label: article.title })),
      escalated: true,
      escalationReason: `Confidence ${String(Math.round(confidence * 100))}% is below the ${String(
        Math.round(agent.guardrails.confidenceThreshold * 100),
      )}% threshold.`,
    }
  }

  const first = articles[0]
  return {
    text: `${first?.bodyHtml.replace(/<[^>]*>/g, ' ').trim() ?? ''} You can read more in “${
      first?.title ?? ''
    }”.`,
    confidence,
    sources: articles.map((article) => ({ id: article.id, label: article.title })),
    escalated: false,
  }
}
