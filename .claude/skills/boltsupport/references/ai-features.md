# BoltSupport AI features

Six AI features plus a customer-facing AI Agent, all in `features/ai/`. Source: PRD §5-§11.

The design position across all of them is **suggestion, not action**: the model proposes, a human
confirms. Auto-send is where trust collapses, and once an agent has been burned by AI text reaching
a customer they stop using every AI feature in the product, not just the one that failed. So the
human-in-the-loop rule is not a per-feature preference, it is the thing that makes the AI layer
usable at all.

## The contract every AI feature inherits

Build these once and reuse them, rather than re-deciding per feature.

1. **Proposed state is visually distinct.** Every AI output wraps in
   `features/ai/components/AiSurface.tsx`, which applies the violet provenance rail, the sparkle
   icon, and a `data-ai-generated` attribute. AI output is never styled ad hoc, because ad hoc
   styling is how AI text eventually looks like human text.
2. **Accept, Regenerate, Discard.** Accepting converts the content to normal editable state and
   keeps an internal `aiAssisted` flag. Discarding restores whatever the human had before, from a
   snapshot.
3. **Every applied AI action writes an audit event and offers Undo.** In a thread this is a
   compact centered violet system line, for example "Auto assigned to Priya Shah by AI, confidence
   0.82", with inline Undo for 30 seconds. Outside a thread it is an Undo toast.
4. **Never show a bare score.** Confidence always comes with a "Why?" affordance listing the signals
   that drove it, each as a short row with a plus or minus weight. `AiSuggestion.rationale` exists
   for this. A number with no explanation is either ignored or trusted blindly, and both are bad.
5. **Confidence gates auto-apply, and below threshold degrades to a suggestion** rather than acting
   or failing. Low confidence changes the UI, it does not hide the output: Auto Draft swaps its
   violet banner for an amber "Low confidence. This needs a careful human review." and disables
   one-click Accept so the agent has to engage.
6. **Rejections are recorded for calibration.** Dismissing a suggestion is data, not a no-op.
7. **Degrade gracefully.** If the AI service errors, the rest of the screen renders normally. If AI
   is off for the workspace, show a calm "AI features are turned off for this workspace" with a
   settings link, not an error.
8. **Internal-only outputs stay internal.** Summaries and predicted satisfaction never appear on a
   customer-facing surface, never go into a reply body automatically, and carry
   `data-internal="true"`. Write a test that asserts this.

## Shared settings page pattern

Auto Assign (§7), Auto Tag (§8), Auto Draft, Evaluation, and Satisfaction settings all live at
workspace level under `/ai/*`, never duplicated per inbox. Per-inbox scoping happens inside each
settings page via the shared `ConditionGroupBuilder` exported from the automation barrel. Each page:

- Master enable toggle.
- Mode as RadioGroup **cards**: "Suggest only" (default, safest) versus "Auto apply above a
  confidence threshold".
- Confidence Slider with live copy that states the consequence in plain language, for example
  "Conversations below 75% confidence stay unassigned for a human to route."
- Scoping via `ConditionGroupBuilder`.
- Sticky save bar, disabled until dirty.
- **An audit table with an acceptance rate at the top**, for example "Agents kept 87% of AI
  assignments in the last 30 days." This number is the go/no-go signal for turning on auto-apply.
  Below roughly 70%, stay in suggest-only mode.

## Per-feature quick reference

| Feature | Surfaces | The thing that matters most | PRD |
|---|---|---|---|
| **AI Summary** | Conversation right sidebar (pinned top), list preview pane | Staleness is **derived**, never polled: `isStale = conversation.lastMessageId !== summary.sourceLastMessageId`. A stale summary stays visible and dimmed with an amber "3 new messages since this summary" bar plus Refresh, because a stale summary still beats no summary. Regenerate is idempotent and cancellable via AbortController; never leave two streams writing the same state. | §5, L435 |
| **Auto Draft** | Composer toolbar (Cmd+Shift+G), slash menu, palette | Source citations under the draft, and when nothing matched, say so out loud: "No knowledge sources matched. Verify any claims before sending." That one line prevents the most damaging failure, a confident wrong answer. Auto Draft never sends; an unedited draft gets a non-blocking "Unedited AI draft" chip next to Send. Record `aiAssisted`, model, tone, and `editedRatio` on the sent message. | §6, L477 |
| **Auto Assign** | Inline suggestion strip, list bulk action, settings | Bulk auto-assign opens a confirmation listing every conversation with its proposed assignee, confidence, and a per-row checkbox, so nothing is applied sight-unseen. Fairness guardrail: max concurrent conversations per agent, and warn if auto-apply is on while workload balancing is off. | §7, L543 |
| **Auto Tag** | Dashed suggestion chips in the header, review queue, settings | The **allowed tag set is required**. The model can only choose from it and can never invent a tag; auto-apply cannot be enabled with an empty set. This is data hygiene and a security control at once. Per-tag descriptions materially improve accuracy. | §8, L584 |
| **Response Evaluation** | Pre-send "Check reply" in composer, QA dashboard | Advisory only. Send is never disabled by an evaluation result. Give the "Unanswered question" callout visual priority over the score, since it is the highest-value catch. The dashboard carries a visible, not fine-print, line: "Quality scores are guidance for coaching, not performance management." Agent trust decides whether this feature gets used or resented. | §9, L620 |
| **Predicted Satisfaction** | Conversation panel, list dot, "At risk" saved view, report | Always labelled "Predicted, not a real rating". When an actual rating arrives, the real one becomes prominent and the prediction demotes to a calibration line. The report needs a calibration panel and confusion grid, because without it the number is unfalsifiable. Never render a predicted score in an agent performance ranking. | §10, L656 |
| **AI Agent** | `/ai/agent`, `/ai/agent/setup` wizard, console | Answers and escalates only, never executes account actions. Escalation hands the full transcript plus an AI summary to the human inbox. Crawled content and chat input are untrusted. Step 2's identity textarea ships three one-click starter templates, because a blank textarea is the main reason setup gets abandoned. | §11, L697 |

## Default AI-powered views

Two saved views ship by default in the inbox sidebar, both marked with the sparkle:

- **At risk**: open conversations with a predicted "Not good" above a confidence threshold. This is
  the practical payoff of prediction, a lead rescuing the conversation before the bad rating lands.
- **AI suggestions pending**: unreviewed AI tags or assignments.

## Types

`AiSummary`, `AiSuggestion`, `AiDraft`, `Evaluation`, `PredictedSatisfaction`, `KnowledgeSource`,
`AiAgent`, and `AiSettings` are defined in PRD §24 (L1149). Note the fields that carry the contract
above: `confidence`, `rationale`, `state` (`pending | accepted | rejected | auto_applied`),
`injectionDetected`, `sourceLastMessageId`, and `undoableUntil`. If a new AI surface does not use
them, it is probably skipping a guardrail.

## Component list

`AiSurface`, `AiSummaryPanel`, `AiSummaryContent`, `AiSuggestionStrip`, `AiDraftBanner`,
`AiSourceChips`, `ConfidenceMeter`, `PredictedSatisfactionPanel`, `SatisfactionDot`,
`EvaluationScoreRing`, `EvaluationCriteriaList`, `AiAgentWizard`, `AgentPreviewPanel`,
`KnowledgeSourceTable`, `TestConsole`, `AiAuditTable`, `AiKillSwitchNotice`.

Security rules for anything passing content to a model are in `security.md`.
