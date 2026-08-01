import { Megaphone } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'

/**
 * Proactive outbound messages, not built.
 *
 * The nav item exists because the area is planned, and a nav item that leads nowhere is worse
 * than one that says plainly it is not here yet.
 */
export function MessagesPage() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-6 pt-6 pb-10">
      <PageHeader title="Messages" description="Reach customers before they write in." />
      <EmptyState
        icon={Megaphone}
        title="Proactive messages are coming soon"
        description="Announcements, onboarding nudges, and targeted campaigns will live here. Nothing is sent from this screen today."
      />
    </div>
  )
}
