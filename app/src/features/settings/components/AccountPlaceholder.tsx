import { PageHeader } from '@/components/PageHeader'

interface AccountPlaceholderProps {
  title: string
  description: string
}

/**
 * A settings page that exists in the rail but has no content yet.
 *
 * Registered rather than omitted so the rail is complete and nothing dead ends: a link that
 * leads nowhere teaches an agent to stop trusting the rail, which costs more than an honest
 * empty page. It says what will live here rather than pretending to be broken.
 */
export function AccountPlaceholder({ title, description }: AccountPlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-[760px] px-6 pt-8 pb-10">
      <PageHeader title={title} description={description} />

      <div
        className="rounded-xl border border-dashed p-8 text-center"
        style={{ borderColor: 'var(--border)' }}
      >
        <p className="text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
          Nothing here yet.
        </p>
      </div>
    </div>
  )
}
