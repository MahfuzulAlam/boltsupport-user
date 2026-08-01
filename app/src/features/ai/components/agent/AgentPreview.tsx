import { Sparkles } from 'lucide-react'

/** What the preview says at each step, in the agent's own voice. */
const SCRIPT: Record<1 | 2 | 3, string[]> = {
  1: [
    'Give me some knowledge so I can answer your customers’ questions.',
    'You can add more at any time.',
  ],
  2: ['Now tell me who I am.', 'Name, tone, and anything a new hire would need on day one.'],
  3: [
    'Ask me something a customer would.',
    'I will show you what I would say, and when I would fetch a human instead.',
  ],
}

/**
 * The live preview beside the form.
 *
 * It is the agent talking rather than a static mock, because the thing being configured is a
 * voice, and a preview that never speaks does not tell you whether you got it right.
 */
export function AgentPreview({ step, name }: { step: 1 | 2 | 3; name: string }) {
  return (
    <aside
      className="hidden flex-col items-center justify-center p-8 lg:flex"
      style={{
        background: 'linear-gradient(160deg, var(--ai-soft) 0%, hsl(330 70% 52% / 0.10) 100%)',
      }}
    >
      <div className="w-full max-w-[300px]">
        <div className="mb-4 flex items-center gap-2.5">
          <span
            className="flex size-9 items-center justify-center rounded-xl"
            style={{ background: 'var(--ai)' }}
            aria-hidden="true"
          >
            <Sparkles className="size-4" style={{ color: 'hsl(0 0% 100%)' }} />
          </span>
          <span className="text-[15px] font-semibold">
            {name.trim() === '' ? 'Your agent' : name}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {SCRIPT[step].map((line) => (
            <p
              key={line}
              className="rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[13px] leading-[1.55] shadow-sm"
              style={{ background: 'var(--card)' }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </aside>
  )
}
