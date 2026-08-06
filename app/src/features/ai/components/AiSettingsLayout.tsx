import { Link, Outlet } from 'react-router-dom'
import { ChevronLeft, Sparkles } from 'lucide-react'
import { SettingsNav } from '@/features/settings'
import { useAiSettings } from '../hooks/use-ai'
import { AI_NAV_GROUPS } from '../nav'

/**
 * The shell every AI settings page sits in.
 *
 * The same rail component as the account and inbox settings, because these are settings and
 * learning a third navigation pattern for them buys nothing. What is specific to AI is the
 * footer: whether the workspace kill switch is on changes what every page under here means, and
 * a threshold you tuned while everything was switched off is a threshold that does nothing.
 */
export function AiSettingsLayout() {
  const settings = useAiSettings()
  const off = settings.data?.enabled === false

  return (
    <div className="flex h-full w-full">
      <SettingsNav
        label="AI settings"
        groups={AI_NAV_GROUPS}
        header={
          <>
            <Link
              to="/"
              className="mb-4 flex items-center gap-1 text-[14px]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Back to inboxes
            </Link>

            <span className="flex items-center gap-2 text-[19px] font-semibold tracking-[-0.01em]">
              <Sparkles className="size-[18px]" style={{ color: 'var(--ai)' }} aria-hidden="true" />
              AI
            </span>
          </>
        }
        footer={
          off ? (
            <p
              className="rounded-lg border px-2.5 py-2 text-[13px]"
              style={{
                borderColor: 'var(--warning)',
                background: 'hsl(38 92% 50% / 0.10)',
              }}
            >
              AI is switched off for the whole workspace. These settings are saved, but nothing here
              is running.
            </p>
          ) : null
        }
      />

      <div className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
