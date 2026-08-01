import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Moon, Sun, UserRound } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTheme } from '@/hooks/use-theme'
import { useAuth, useSession } from '@/features/auth'
import { shortcutDisplay } from '@/lib/shortcuts'

interface UserMenuProps {
  onShowShortcuts: () => void
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function UserMenu({ onShowShortcuts }: UserMenuProps) {
  const navigate = useNavigate()
  const { data: session } = useSession()
  const theme = useTheme((s) => s.theme)
  const toggleTheme = useTheme((s) => s.toggleTheme)
  const signOut = useAuth((s) => s.signOut)

  const name = session?.user.name ?? 'Loading'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Your account"
          className="ml-1 flex size-8 items-center justify-center rounded-full"
          style={{ border: '1px solid var(--chrome-line)' }}
        >
          <Avatar className="size-8">
            <AvatarFallback
              className="text-[12px] font-medium"
              style={{ background: 'var(--chrome-hover)', color: 'white' }}
            >
              {initials(name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[236px]">
        <DropdownMenuLabel className="font-normal">
          <div className="text-[14px] font-medium">{name}</div>
          <div className="text-[13px] text-[color:var(--muted-foreground)]">
            {session?.user.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate('/account/profile')}>
          <UserRound className="size-4" />
          Your profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate('/manage/notifications')}>
          <Bell className="size-4" />
          Notification settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onShowShortcuts}>
          {theme === 'dark' ? (
            <Sun className="size-4 opacity-0" />
          ) : (
            <Moon className="size-4 opacity-0" />
          )}
          Keyboard shortcuts
          <kbd className="kbd ml-auto">{shortcutDisplay('help')}</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            // Keep the menu open feel snappy: toggling the theme should not also navigate.
            event.preventDefault()
            toggleTheme()
          }}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut()
            void navigate('/login', { replace: true })
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
