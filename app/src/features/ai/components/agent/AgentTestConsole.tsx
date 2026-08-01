import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowUpRight, Send, Sparkles, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { askAgent, type AgentAnswer } from '@/features/ai/api/agent'

interface Turn {
  question: string
  answer: AgentAnswer | null
}

const SUGGESTIONS = ['How do I add a teammate?', 'What is your refund policy?', 'Set up SAML']

/**
 * The test console.
 *
 * Available before and after launch (FR-4.51), and deliberately shows the refusals as prominently
 * as the answers: the reason to test an agent is to watch it decline, not to watch it succeed.
 * Every answer carries its sources, and an answer with none says so rather than staying quiet.
 */
export function AgentTestConsole() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const ask = useMutation({
    mutationFn: (text: string) => askAgent(text),
    onSuccess: (answer) => {
      setTurns((current) => {
        const next = [...current]
        const last = next[next.length - 1]
        if (last !== undefined) next[next.length - 1] = { ...last, answer }
        return next
      })
      window.requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
      })
    },
  })

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (trimmed === '' || ask.isPending) return
    setTurns((current) => [...current, { question: trimmed, answer: null }])
    setQuestion('')
    ask.mutate(trimmed)
  }

  return (
    <div
      className="flex h-full min-h-[380px] flex-col overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      <div ref={listRef} className="flex-1 overflow-y-auto p-3.5" aria-live="polite">
        {turns.length === 0 ? (
          <div className="py-6 text-center">
            <p className="mb-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Ask the agent something a customer would.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    submit(suggestion)
                  }}
                  className="rounded-[13px] border px-2.5 py-1 text-[12px]"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turns.map((turn, index) => (
          <div key={`${turn.question}-${String(index)}`} className="mb-4">
            <p className="mb-2 flex items-start gap-2 text-[13px]">
              <UserRound
                className="mt-0.5 size-4 shrink-0"
                style={{ color: 'var(--muted-foreground)' }}
                aria-hidden="true"
              />
              <span>{turn.question}</span>
            </p>

            {turn.answer === null ? (
              <p
                className="flex items-center gap-2 pl-6 text-[13px]"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <Sparkles className="size-3.5 animate-pulse" style={{ color: 'var(--ai)' }} />
                Thinking
              </p>
            ) : (
              <div
                className="rounded-md p-3"
                style={{
                  background: turn.answer.escalated ? 'var(--muted)' : 'var(--ai-soft)',
                }}
              >
                <p className="mb-1.5 flex items-start gap-2 text-[13px] leading-[1.6]">
                  <Sparkles
                    className="mt-0.5 size-4 shrink-0"
                    style={{ color: 'var(--ai)' }}
                    aria-hidden="true"
                  />
                  <span>{turn.answer.text}</span>
                </p>

                <div className="flex flex-wrap items-center gap-1.5 pl-6">
                  {turn.answer.sources.length === 0 ? (
                    <span className="text-[12px]" style={{ color: 'var(--warning-strong)' }}>
                      No source matched this question.
                    </span>
                  ) : (
                    turn.answer.sources.map((source) => (
                      <span
                        key={source.id}
                        className="inline-flex items-center gap-1 rounded-[11px] border px-2 py-0.5 text-[12px]"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <ArrowUpRight
                          className="size-3"
                          style={{ color: 'var(--muted-foreground)' }}
                          aria-hidden="true"
                        />
                        {source.label}
                      </span>
                    ))
                  )}
                  <span
                    className="ml-auto font-mono text-[12px]"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {Math.round(turn.answer.confidence * 100)}%
                  </span>
                </div>

                {turn.answer.escalated ? (
                  <p className="mt-2 pl-6 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                    Handed to a human. {turn.answer.escalationReason ?? ''} The full transcript and
                    a summary go with it.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      <form
        className="flex items-center gap-2 border-t p-2.5"
        style={{ borderColor: 'var(--border)' }}
        onSubmit={(event) => {
          event.preventDefault()
          submit(question)
        }}
      >
        <Input
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value)
          }}
          placeholder="Ask a question"
          aria-label="Ask the agent a question"
          className="h-9"
        />
        <Button type="submit" size="sm" disabled={question.trim() === '' || ask.isPending}>
          <Send className="size-4" aria-hidden="true" />
          Ask
        </Button>
      </form>
    </div>
  )
}
