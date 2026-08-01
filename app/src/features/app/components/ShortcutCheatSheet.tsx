import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CMD_K_NOTE, SHORTCUT_GROUPS, shortcutsInGroup } from '@/lib/shortcuts'

interface ShortcutCheatSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Rendered entirely from `src/lib/shortcuts.ts`, the same array the bindings come from, so the
 * sheet cannot document a key the app does not actually listen for.
 */
export function ShortcutCheatSheet({ open, onOpenChange }: ShortcutCheatSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Everything in the triage loop is reachable without the mouse.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group}>
              <h3 className="eyebrow mb-2">{group}</h3>
              <dl>
                {shortcutsInGroup(group).map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex h-8 items-center justify-between gap-4 border-b text-[13px]"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <dt className="truncate">{shortcut.label}</dt>
                    <dd className="shrink-0">
                      <kbd className="kbd">{shortcut.display}</kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <div
          className="mt-2 rounded-md p-3 text-[13px]"
          style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
        >
          <span className="font-medium" style={{ color: 'var(--foreground)' }}>
            One rule worth knowing.{' '}
          </span>
          {CMD_K_NOTE}
        </div>
      </DialogContent>
    </Dialog>
  )
}
