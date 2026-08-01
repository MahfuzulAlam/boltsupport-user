import { Link } from 'react-router-dom'
import { Check, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WidgetMock } from './WidgetMock'

const BENEFITS = [
  'Learns only from content you approve',
  'Escalates to a human when it cannot help',
  'Stays private until you launch it',
  'You only pay for questions it resolves',
]

/**
 * The agent landing, shown before one has been set up.
 *
 * The second of exactly two places allowed the serif display face. Every line here is about
 * containment rather than capability, because the objection to a customer-facing agent is not
 * "can it answer" but "what will it say when it should not have".
 */
export function AgentLanding() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-6 pt-6 pb-10">
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <div
          className="flex flex-wrap items-center gap-3 border-b px-5 py-3"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          <Info
            className="size-4 shrink-0"
            style={{ color: 'var(--muted-foreground)' }}
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 text-[13px]">
            You are only charged when the agent resolves a customer question without human
            assistance.
          </p>
          <Button variant="outline" size="sm">
            See pricing
          </Button>
        </div>

        <div className="grid items-center gap-10 p-8 lg:grid-cols-2">
          <div>
            <h1
              className="mb-3 text-[36px] leading-[1.1] tracking-[-0.01em]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Resolve questions automatically
            </h1>
            <p
              className="mb-5 max-w-[46ch] text-[15px]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Create an AI agent that responds to customers around the clock with accurate, on brand
              answers.
            </p>

            <ul className="mb-6 flex flex-col gap-2">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 text-[15px]">
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'var(--success-soft)' }}
                  >
                    <Check
                      className="size-3"
                      style={{ color: 'var(--success-strong)' }}
                      aria-hidden="true"
                    />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4">
              <Button asChild size="lg">
                <Link to="/ai/agent/setup">Customize your agent</Link>
              </Button>
              <button type="button" className="text-[13px]" style={{ color: 'var(--brand)' }}>
                How it works
              </button>
            </div>
          </div>

          <WidgetMock />
        </div>
      </div>
    </div>
  )
}
