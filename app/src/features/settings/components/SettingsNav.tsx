import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SettingsNavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Rendered as a quiet chip after the label, for anything not yet built. */
  badge?: string
}

export interface SettingsNavGroup {
  title: string
  items: SettingsNavItem[]
}

interface SettingsNavProps {
  /** Whatever sits above the groups: a back link, a name, a switcher. */
  header?: React.ReactNode
  groups: SettingsNavGroup[]
  label: string
  footer?: React.ReactNode
}

/**
 * The settings rail, shared by the account area and by each inbox.
 *
 * One component because they are the same object seen twice: a grouped list of destinations
 * against a recessed panel, with the current one lifted out of it on a white card. Two copies
 * would drift, and a rail that looks slightly different depending on which settings you are in
 * is a rail nobody learns.
 */
export function SettingsNav({ header, groups, label, footer }: SettingsNavProps) {
  return (
    <nav
      aria-label={label}
      className="hidden w-[248px] shrink-0 flex-col overflow-y-auto border-r md:flex"
      style={{ borderColor: 'var(--border)', background: 'var(--app)' }}
    >
      {header !== undefined ? <div className="px-4 pt-5 pb-2">{header}</div> : null}

      <div className="flex-1 px-3 pb-4">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="eyebrow mb-1.5 px-2.5">{group.title}</p>

            {group.items.map(({ to, label: itemLabel, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  cn(
                    'mb-0.5 flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px]',
                    isActive ? 'font-semibold shadow-sm' : 'hover:bg-[color:var(--hover)]',
                  )
                }
                style={({ isActive }) =>
                  isActive
                    ? { background: 'var(--card)', color: 'var(--brand)' }
                    : { color: 'var(--foreground)' }
                }
              >
                <Icon className="size-[17px] shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{itemLabel}</span>
                {badge === undefined ? null : (
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium"
                    style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                  >
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {footer !== undefined ? <div className="px-3 pb-5">{footer}</div> : null}
    </nav>
  )
}
