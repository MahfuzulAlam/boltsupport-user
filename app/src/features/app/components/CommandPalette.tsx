import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowRight, Sparkles, User } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { fetchConversations } from '@/features/inbox'
import { useDebounce } from '@/hooks/use-debounce'
import { shortcutDisplay } from '@/lib/shortcuts'
import { navToPaletteItems, type NavGroup } from '../nav-config'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nav: NavGroup[]
}

/**
 * Every row shows its shortcut, so the palette teaches the keyboard map over time rather than
 * competing with it. AI rows carry the sparkle and the violet accent, and the footer states the
 * guarantee that makes the AI actions safe to offer here at all.
 */
export function CommandPalette({ open, onOpenChange, nav }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 180)

  const { data: conversations } = useQuery({
    queryKey: ['palette-conversations', debouncedQuery],
    queryFn: ({ signal }) => fetchConversations({ search: debouncedQuery, limit: 5 }, signal),
    enabled: open && debouncedQuery.trim().length > 1,
  })

  const go = (to: string) => {
    onOpenChange(false)
    setQuery('')
    void navigate(to)
  }

  const notYet = (label: string) => {
    onOpenChange(false)
    toast(`${label} arrives with its screen`, {
      description: 'The action is registered here so the palette is complete as the app fills in.',
    })
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search for a page, an action, a conversation, or a contact"
    >
      <CommandInput
        placeholder="Search for a page, an action, or a conversation"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Nothing matches that. Try a ticket number or a contact name.</CommandEmpty>

        <CommandGroup heading="Go to">
          {navToPaletteItems(nav).map((item) => (
            <CommandItem
              key={item.id}
              value={item.label}
              onSelect={() => {
                go(item.to)
              }}
            >
              {item.ai === true ? (
                <Sparkles className="size-4" style={{ color: 'var(--ai)' }} />
              ) : (
                <ArrowRight className="size-4 opacity-60" />
              )}
              <span style={item.ai === true ? { color: 'var(--ai)' } : undefined}>
                {item.label}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Actions">
          <CommandItem
            value="New conversation"
            onSelect={() => {
              notYet('New conversation')
            }}
          >
            <ArrowRight className="size-4 opacity-60" />
            New conversation
            <CommandShortcut>{shortcutDisplay('compose')}</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="Summarize with AI"
            onSelect={() => {
              notYet('Summarize with AI')
            }}
          >
            <Sparkles className="size-4" style={{ color: 'var(--ai)' }} />
            <span style={{ color: 'var(--ai)' }}>Summarize with AI</span>
          </CommandItem>
          <CommandItem
            value="Draft with AI"
            onSelect={() => {
              notYet('Draft with AI')
            }}
          >
            <Sparkles className="size-4" style={{ color: 'var(--ai)' }} />
            <span style={{ color: 'var(--ai)' }}>Draft with AI</span>
            <CommandShortcut>{shortcutDisplay('draftWithAi')}</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {conversations !== undefined && conversations.items.length > 0 ? (
          <CommandGroup heading="Conversations">
            {conversations.items.map((conversation) => (
              <CommandItem
                key={conversation.id}
                value={`${conversation.subject} ${String(conversation.number)} ${conversation.contact.name}`}
                onSelect={() => {
                  go(`/inbox/${conversation.inboxId}/unassigned/${conversation.id}`)
                }}
              >
                <User className="size-4 opacity-60" />
                <span className="truncate">{conversation.subject}</span>
                <CommandShortcut className="font-mono">#{conversation.number}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>

      <div
        className="flex items-center justify-between border-t px-3 py-2 text-[12px]"
        style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
      >
        <span>
          <kbd className="kbd">↑↓</kbd> move <kbd className="kbd ml-1">↵</kbd> run
        </span>
        <span>AI actions never send without your review</span>
      </div>
    </CommandDialog>
  )
}
