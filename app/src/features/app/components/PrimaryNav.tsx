import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Sparkles } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { NavGroup } from '../nav-config'

interface PrimaryNavProps {
  nav: NavGroup[]
}

function isActive(pathname: string, match: string): boolean {
  return match === '/' ? pathname === '/' : pathname.startsWith(match)
}

/** The 2px brand underline marks the active route. */
function ActiveUnderline() {
  return (
    <span
      aria-hidden="true"
      className="absolute right-3 bottom-0 left-3 h-[2px]"
      style={{ background: 'var(--brand)' }}
    />
  )
}

export function PrimaryNav({ nav }: PrimaryNavProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav aria-label="Primary" className="flex h-[56px] items-center">
      {nav.map((group) => {
        const active = isActive(pathname, group.match)
        const style = { color: active ? 'white' : 'var(--chrome-foreground)' }

        if (group.items === undefined) {
          return (
            <Link
              key={group.id}
              to={group.to ?? '/'}
              className="relative flex h-[56px] items-center px-3 text-[15px] font-medium"
              style={style}
              aria-current={active ? 'page' : undefined}
            >
              {group.label}
              {active ? <ActiveUnderline /> : null}
            </Link>
          )
        }

        return (
          <DropdownMenu key={group.id}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative flex h-[56px] items-center gap-1 px-3 text-[15px] font-medium"
                style={style}
              >
                {group.label}
                <ChevronDown className="size-3.5 opacity-70" />
                {active ? <ActiveUnderline /> : null}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-[236px]">
              {group.items.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => void navigate(item.to)}
                  style={item.ai === true ? { color: 'var(--ai)' } : undefined}
                >
                  {item.ai === true ? <Sparkles className="size-4" /> : null}
                  <span className="truncate">{item.label}</span>
                  {item.count !== undefined ? (
                    <span className="ml-auto font-mono text-[13px] opacity-70">{item.count}</span>
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })}
    </nav>
  )
}
