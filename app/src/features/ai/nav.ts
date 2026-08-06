import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  ClipboardCheck,
  FileText,
  Gauge,
  LayoutGrid,
  PenLine,
  HeartPulse,
  Tag,
  TriangleAlert,
  UserMinus,
  UserRound,
} from 'lucide-react'
import type { SettingsNavGroup } from '@/features/settings'

/**
 * The AI rail.
 *
 * Grouped by who the feature acts on rather than by how it is built, because that is the question
 * somebody arrives with. Assist features put something in front of an agent and wait. Quality
 * features watch what the agent then does. The agent itself is the only one a customer ever sees,
 * so it sits alone: the blast radius of a mistake there is different in kind, not in degree.
 *
 * Knowledge is first because it is upstream of all of them. Changing what the AI reads changes
 * every feature at once, and that is worth noticing before you tune a threshold.
 */
export const AI_NAV_GROUPS: SettingsNavGroup[] = [
  {
    title: 'Overview',
    items: [
      { to: '/ai', label: 'All features', icon: LayoutGrid },
      { to: '/ai/knowledge', label: 'Knowledge', icon: BookOpen },
    ],
  },
  {
    title: 'Assist',
    items: [
      { to: '/ai/summary', label: 'Summary', icon: FileText },
      { to: '/ai/auto-draft', label: 'Auto draft', icon: PenLine },
      { to: '/ai/auto-tag', label: 'Auto tag', icon: Tag },
      { to: '/ai/auto-assign', label: 'Auto assign', icon: UserRound },
    ],
  },
  {
    title: 'Quality',
    items: [
      { to: '/ai/evaluation', label: 'Check reply', icon: ClipboardCheck },
      { to: '/ai/evaluation/results', label: 'Coaching scores', icon: BarChart3 },
      { to: '/ai/satisfaction', label: 'Predicted satisfaction', icon: Gauge },
    ],
  },
  {
    /*
     * Detection rather than assistance. These four watch for trouble instead of helping write a
     * reply, which is a different job and a different frame of mind, so they group on their own.
     */
    title: 'Risk detection',
    items: [
      { to: '/ai/health-score', label: 'Health score', icon: Activity },
      { to: '/ai/sentiment-drift', label: 'Sentiment drift', icon: HeartPulse },
      { to: '/ai/silent-churn', label: 'Silent churn', icon: UserMinus },
      { to: '/ai/refund-threat', label: 'Refund threat', icon: TriangleAlert },
    ],
  },
  {
    title: 'Customer facing',
    items: [{ to: '/ai/agent', label: 'AI agent', icon: Bot }],
  },
]
