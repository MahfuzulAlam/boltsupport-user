export { fetchAiSettings, fetchAiAgent, fetchAiInboxStats, type AiInboxStats } from './api/ai'
export { useAiSettings, useAiAgent, useAiInboxStats } from './hooks/use-ai'
export { useAiSummary } from './hooks/use-ai-summary'
export { SatisfactionDot } from './components/SatisfactionDot'
export { AiSurface } from './components/AiSurface'
export { AiSummaryPanel } from './components/AiSummaryPanel'
export { AiSuggestionStrip } from './components/AiSuggestionStrip'
export { PredictedSatisfactionPanel } from './components/PredictedSatisfactionPanel'

// Risk detection. The three account level panels compose into one export so no caller can show a
// partial set; the refund threat banner is separate because it lives in the thread, not a sidebar.
export { AccountRiskPanels } from './components/risk/AccountRiskPanels'
export { RefundThreatBanner } from './components/risk/RefundThreatBanner'
export { useRefundThreat, useRefundThreatState } from './hooks/use-risk'
