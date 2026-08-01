import { Hammer } from 'lucide-react'
import { PageHeader } from './PageHeader'

interface StubPageProps {
  title: string
  description: string
  /** Which build step replaces this stub. Shown so progress is visible rather than guessed at. */
  step: number
  covers?: string[]
}

/**
 * Placeholder for a route that is registered but not built yet.
 *
 * Every route in the map resolves to something with a real page header from step 3 onward, so
 * the navigation can be walked end to end and nothing dead-ends into a blank screen.
 */
export function StubPage({ title, description, step, covers }: StubPageProps) {
  return (
    <div className="mx-auto w-full max-w-[960px] px-6 pt-6 pb-12">
      <PageHeader title={title} description={description} />
      <div
        className="flex items-start gap-3 rounded-lg border p-4"
        style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
      >
        <Hammer className="mt-0.5 size-5 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
        <div className="text-[14px]">
          <p className="font-medium">
            Built in step <span className="font-mono">{step}</span>
          </p>
          {covers !== undefined && covers.length > 0 ? (
            <ul className="mt-1.5 list-disc pl-4 text-[color:var(--muted-foreground)]">
              {covers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}
