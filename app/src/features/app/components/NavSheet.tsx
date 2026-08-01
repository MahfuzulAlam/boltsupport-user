import { useNavigate } from 'react-router-dom'
import { Menu, Sparkles } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { NavGroup } from '../nav-config'

interface NavSheetProps {
  nav: NavGroup[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The narrow viewport navigation. It lists every destination the desktop nav has, including the
 * AI screens, so nothing becomes unreachable below the nav breakpoint.
 */
export function NavSheet({ nav, open, onOpenChange }: NavSheetProps) {
  const navigate = useNavigate()

  const go = (to: string) => {
    onOpenChange(false)
    void navigate(to)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation"
          className="-ml-2.5 flex size-11 items-center justify-center rounded-md"
          style={{ color: 'var(--chrome-foreground)' }}
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[288px] p-0">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto pb-6">
          {nav.map((group) => (
            <div key={group.id} className="px-2 pb-2">
              <div className="eyebrow px-2 py-1.5">{group.label}</div>
              {group.items === undefined ? (
                <button
                  type="button"
                  onClick={() => {
                    go(group.to ?? '/')
                  }}
                  className="flex min-h-11 w-full items-center rounded-md px-2 text-left text-[15px] hover:bg-[color:var(--hover)]"
                >
                  {group.label}
                </button>
              ) : (
                group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      go(item.to)
                    }}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-[15px] hover:bg-[color:var(--hover)]"
                    style={item.ai === true ? { color: 'var(--ai)' } : undefined}
                  >
                    {item.ai === true ? <Sparkles className="size-4 shrink-0" /> : null}
                    <span className="truncate">{item.label}</span>
                    {item.count !== undefined ? (
                      <span className="ml-auto font-mono text-[13px] opacity-70">{item.count}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
