import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { apiRequest } from '@/lib/api-client'
import { tagSchema } from '@/types'
import {
  GuardrailWarning,
  ModeCards,
  SettingsSection,
  StickySaveBar,
  ThresholdSlider,
  Toggle,
} from '@/components/settings-primitives'
import { useAiSettingsForm } from '../hooks/use-ai-settings-form'

/**
 * Auto Tag settings.
 *
 * The allowed tag set is the whole feature. FR-4.27 says the model may only choose from it and
 * can never invent a tag, and FR-4.28 says auto apply cannot be switched on while it is empty.
 * That second rule is enforced here rather than described: the card is disabled, and emptying
 * the list drops the mode back to suggest.
 */
export function AutoTagSettingsPage() {
  const form = useAiSettingsForm()
  const tags = useQuery({
    queryKey: ['tags'],
    queryFn: ({ signal }) => apiRequest('/tags', z.array(tagSchema), { signal }),
  })

  if (form.settings === null) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-6 pt-6">
        <PageHeader title="Auto Tag" />
      </div>
    )
  }

  const autoTag = form.settings.autoTag
  const allowed = autoTag.allowedTagIds
  const isEmpty = allowed.length === 0
  const tagById = new Map((tags.data ?? []).map((tag) => [tag.id, tag]))
  const available = (tags.data ?? []).filter((tag) => !allowed.includes(tag.id))

  const patch = (next: Partial<typeof autoTag>) => {
    form.update({ autoTag: { ...autoTag, ...next } })
  }

  const removeTag = (tagId: string) => {
    const remaining = allowed.filter((id) => id !== tagId)
    // Emptying the list cannot leave auto apply switched on behind it.
    patch({
      allowedTagIds: remaining,
      ...(remaining.length === 0 ? { mode: 'suggest' as const } : {}),
    })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <PageHeader
          title="Auto Tag"
          description="Suggestions appear on the conversation and in the review queue."
        />

        <SettingsSection title="Auto tag">
          <Toggle
            checked={autoTag.enabled}
            onChange={(enabled) => {
              patch({ enabled })
            }}
            label={`Auto tag is ${autoTag.enabled ? 'enabled' : 'disabled'}`}
            description="Tags are suggested on incoming conversations and collected in the review queue."
          />
        </SettingsSection>

        <SettingsSection title="Mode">
          <ModeCards
            mode={autoTag.mode}
            onChange={(mode) => {
              if (mode === 'auto' && isEmpty) {
                toast('Add at least one allowed tag first')
                return
              }
              patch({ mode })
            }}
            autoDisabled={isEmpty}
            autoDisabledReason="Add at least one allowed tag first"
          />
          <div className="mt-4">
            <ThresholdSlider
              value={autoTag.threshold}
              onChange={(threshold) => {
                patch({ threshold })
              }}
              helper={(percent) =>
                `Tags below ${String(percent)}% confidence wait in the review queue.`
              }
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Allowed tag set"
          description="The AI can only choose from this list. It can never invent a new tag."
        >
          <div className="flex flex-wrap gap-2">
            {allowed.map((tagId) => (
              <span
                key={tagId}
                className="flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[13px]"
                style={{ borderColor: 'var(--border)' }}
              >
                {tagById.get(tagId)?.name ?? tagId}
                <button
                  type="button"
                  aria-label={`Remove ${tagById.get(tagId)?.name ?? tagId}`}
                  onClick={() => {
                    removeTag(tagId)
                  }}
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}

            {available.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  patch({ allowedTagIds: [...allowed, tag.id] })
                }}
                className="flex h-7 items-center rounded-md border border-dashed px-2.5 text-[13px]"
                style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
              >
                Add {tag.name}
              </button>
            ))}
          </div>

          {isEmpty ? (
            <div
              role="alert"
              className="mt-3 rounded-md px-3 py-2 text-[13px]"
              style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}
            >
              Add at least one tag. Auto apply stays off while this list is empty.
            </div>
          ) : null}
        </SettingsSection>

        {autoTag.mode === 'auto' ? (
          <GuardrailWarning>
            Auto apply is on. Tags above{' '}
            <span className="font-mono">{Math.round(autoTag.threshold * 100)}%</span> are applied
            without review, and each one is logged with Undo.
          </GuardrailWarning>
        ) : null}
      </div>

      <StickySaveBar
        dirty={form.dirty}
        onSave={form.save}
        onDiscard={form.discard}
        note="Changes apply to this workspace"
      />
    </div>
  )
}
