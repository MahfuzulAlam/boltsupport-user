import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { SettingsSection } from '@/components/settings-primitives'
import type { AiFeature } from '@/types'
import { fetchKnowledge, patchKnowledge } from '../api/ai'
import { KIND_META } from '../knowledge-meta'

/**
 * What this one feature is allowed to read, shown on the feature's own page.
 *
 * The same scoping as the Knowledge page, from the other direction. Both are needed: setting up a
 * source you ask "who should see this", and tuning a feature you ask "what does this know". Making
 * somebody hold one of those questions in their head while looking at the other screen is how a
 * feature ends up quietly reading nothing and nobody can work out why its answers are thin.
 */
export function KnowledgeUsage({ feature }: { feature: AiFeature }) {
  const queryClient = useQueryClient()
  const sources = useQuery({
    queryKey: ['ai-knowledge'],
    queryFn: ({ signal }) => fetchKnowledge(signal),
  })

  const toggle = useMutation({
    mutationFn: ({ id, usedBy }: { id: string; usedBy: AiFeature[] }) =>
      patchKnowledge(id, { usedBy }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-knowledge'] })
    },
  })

  const list = sources.data ?? []
  const granted = list.filter((source) => source.usedBy.includes(feature))

  return (
    <SettingsSection
      title="Knowledge"
      description="Which sources this feature may read. Managed here or on the Knowledge page; it is the same setting."
    >
      {sources.isPending ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : list.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          No sources exist yet.{' '}
          <Link to="/ai/knowledge" style={{ color: 'var(--brand)' }}>
            Add one
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="flex flex-col">
            {list.map((source) => {
              const on = source.usedBy.includes(feature)
              const meta = KIND_META[source.kind]
              return (
                <label
                  key={source.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-2 hover:bg-[color:var(--hover)]"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    aria-label={source.label}
                    onChange={() => {
                      toggle.mutate({
                        id: source.id,
                        usedBy: on
                          ? source.usedBy.filter((item) => item !== feature)
                          : [...source.usedBy, feature],
                      })
                    }}
                    className="mt-0.5 size-4 accent-[color:var(--brand)]"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[14px]">
                      {source.label}
                      <span
                        className="font-mono text-[12px]"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {source.itemCount} {meta.unit}
                      </span>
                      {source.injectionDetected ? (
                        <ShieldAlert
                          className="size-3.5"
                          style={{ color: 'var(--warning-strong)' }}
                          aria-label="Contains text that tries to instruct the AI"
                        />
                      ) : null}
                    </span>
                    <span
                      className="block text-[13px]"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {source.itemCount === 0
                        ? 'Empty, so granting it changes nothing yet.'
                        : meta.blurb}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>

          {granted.length === 0 ? (
            <p className="mt-3 text-[13px]" style={{ color: 'var(--warning-strong)' }}>
              This feature reads nothing, so it is working from the conversation alone.
            </p>
          ) : null}
        </>
      )}
    </SettingsSection>
  )
}
