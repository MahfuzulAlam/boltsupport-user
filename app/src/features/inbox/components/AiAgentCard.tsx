import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import type { AiAgent, AgentStatus } from '@/types'

interface AiAgentCardProps {
  agent: AiAgent
  delayMs: number
}

const STATUS_STYLE: Record<AgentStatus, { label: string; bg: string; fg: string }> = {
  live: { label: 'Live', bg: 'var(--success-soft)', fg: 'var(--success-strong)' },
  paused: { label: 'Paused', bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
  // Draft is the state a new agent ships in, and it means customers cannot see it yet.
  draft: { label: 'Draft', bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
}

export function AiAgentCard({ agent, delayMs }: AiAgentCardProps) {
  const status = STATUS_STYLE[agent.status]
  const resolutionPct = Math.round(agent.stats.resolutionRate * 100)

  return (
    <section
      className="flex flex-col overflow-hidden rounded-lg border motion-safe:animate-[fadeup_160ms_ease-out_both]"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--card)',
        animationDelay: `${String(delayMs)}ms`,
      }}
      aria-labelledby="agent-card-name"
    >
      <header className="flex items-start gap-2.5 px-4 pt-4 pb-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md"
          style={{ background: 'var(--ai-soft)' }}
          aria-hidden="true"
        >
          <Sparkles className="size-4" style={{ color: 'var(--ai)' }} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="agent-card-name" className="text-[16px] font-semibold tracking-[-0.01em]">
            {agent.name} agent
          </h2>
          <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            {agent.status === 'live'
              ? 'Answers on chat and email, hands off to a human on request'
              : 'Not visible to customers until you launch it'}
          </p>
        </div>
        <span
          className="flex h-6 shrink-0 items-center rounded-xl px-2.5 text-[12px] font-medium"
          style={{ background: status.bg, color: status.fg }}
        >
          {status.label}
        </span>
      </header>

      <div className="px-4 pb-3">
        <div
          className="font-mono text-[26px] leading-none font-medium tracking-[-0.02em]"
          style={{
            color: agent.status === 'live' ? 'var(--foreground)' : 'var(--muted-foreground)',
          }}
        >
          {resolutionPct}%
        </div>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          resolved without a human this week
        </p>
      </div>

      <footer
        className="mt-auto flex items-center border-t px-4 py-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <Link
          to="/ai/agent"
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium hover:bg-[color:var(--ai-soft)]"
          style={{ color: 'var(--ai)' }}
        >
          <Sparkles className="size-4" />
          Open agent
        </Link>
      </footer>
    </section>
  )
}
