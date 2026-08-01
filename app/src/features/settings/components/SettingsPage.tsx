import { PageHeader } from '@/components/PageHeader'
import { StickySaveBar } from '@/components/settings-primitives'

interface SettingsPageProps {
  title: string
  description: string
  children: React.ReactNode
  /** Omitted on read-only pages such as the saved reply list. */
  save?: {
    dirty: boolean
    onSave: () => void
    onDiscard: () => void
    note?: string
  }
}

/**
 * The frame every settings screen uses: title, description, scrolling body, sticky save bar.
 *
 * The bar lives here rather than in each page so it cannot be forgotten, and it is disabled
 * until something is actually dirty: an always-enabled Save teaches people to press it out of
 * habit, and then they cannot tell whether a change took.
 */
export function SettingsPage({ title, description, children, save }: SettingsPageProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pt-6 pb-4">
        <PageHeader title={title} description={description} />
        {children}
      </div>

      {save !== undefined ? (
        <StickySaveBar
          dirty={save.dirty}
          note={save.note ?? ''}
          onSave={save.onSave}
          onDiscard={save.onDiscard}
        />
      ) : null}
    </div>
  )
}
