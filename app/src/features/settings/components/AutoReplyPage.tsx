import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Blocks } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SettingsSection, Toggle } from '@/components/settings-primitives'
import { MERGE_FIELDS, mergeFieldSyntax } from '@/features/composer'
import type { AutoReply } from '@/types'
import { fetchInboxSetting, patchInboxSetting } from '../api/settings'
import { useSettingsForm } from '../hooks/use-settings-form'
import { SettingsPage } from './SettingsPage'

export function AutoReplyPage() {
  const inboxId = useParams()['inboxId'] ?? 'in1'
  const queryClient = useQueryClient()

  const saved = useQuery({
    queryKey: ['inbox-settings', inboxId, 'auto-reply'],
    queryFn: ({ signal }) => fetchInboxSetting(inboxId, 'auto-reply', signal),
  })
  const form = useSettingsForm<AutoReply>(saved.data)
  const value = form.value

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: saved.data?.bodyHtml ?? '',
      editorProps: {
        attributes: {
          class: 'outline-none min-h-[160px] text-[14px] leading-[1.6]',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': 'Auto reply message',
        },
      },
      onUpdate: ({ editor: instance }) => {
        if (instance.isDestroyed) return
        form.update({ bodyHtml: instance.getHTML() })
      },
    },
    [saved.data?.inboxId],
  )

  const save = useMutation({
    mutationFn: (patch: Partial<AutoReply>) => patchInboxSetting(inboxId, 'auto-reply', patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-settings', inboxId] })
      form.saved()
      toast('Auto reply updated')
    },
  })

  return (
    <SettingsPage
      title="Auto reply"
      description="An acknowledgement while nobody is at the desk. It is not a reply to everything."
      save={{
        dirty: form.dirty,
        onSave: () => {
          if (form.edits !== null) save.mutate(form.edits)
        },
        onDiscard: form.discard,
      }}
    >
      {value === undefined ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : (
        <>
          <SettingsSection title="When to send">
            <Toggle
              checked={value.enabled}
              onChange={(enabled) => {
                form.update({ enabled })
              }}
              label="Send an auto reply"
              description="One per conversation, never on a follow up in the same thread."
            />
            <Toggle
              checked={value.outsideHoursOnly}
              disabled={!value.enabled}
              onChange={(outsideHoursOnly) => {
                form.update({ outsideHoursOnly })
              }}
              label="Only send outside office hours"
              description="Inside hours a real person is usually faster than the acknowledgement."
            />
            <p className="mt-1 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Office hours come from{' '}
              <Link to={`/inbox/${inboxId}/settings/inbox-hours`} style={{ color: 'var(--brand)' }}>
                inbox hours
              </Link>
              .
            </p>
          </SettingsSection>

          <SettingsSection title="Message">
            <Label htmlFor="auto-reply-subject" className="mb-1.5 block text-[13px]">
              Subject
            </Label>
            <Input
              id="auto-reply-subject"
              value={value.subject}
              disabled={!value.enabled}
              onChange={(event) => {
                form.update({ subject: event.target.value })
              }}
              className="mb-4 max-w-[520px]"
            />

            <div className="mb-1.5 flex items-center gap-2">
              <Label className="text-[13px]">Body</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={!value.enabled}
                  className="flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] disabled:opacity-45"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <Blocks className="size-3.5" aria-hidden="true" />
                  Insert variable
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {MERGE_FIELDS.map((field) => (
                    <DropdownMenuItem
                      key={field.token}
                      onSelect={() => {
                        editor
                          ?.chain()
                          .focus()
                          .insertContent(mergeFieldSyntax(field.token, field.fallback))
                          .run()
                      }}
                    >
                      {field.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div
              className="max-w-[640px] rounded-md border p-3"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--card)',
                opacity: value.enabled ? 1 : 0.55,
              }}
            >
              <EditorContent editor={editor} data-rich-text-editor />
            </div>

            {/* A fallback is not optional: a greeting that reads "Hi ," is worse than no name. */}
            <p className="mt-2 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
              Every variable carries a fallback, so a missing first name reads as “there” rather
              than an empty space.
            </p>

            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={!value.enabled}
              onClick={() => {
                toast('Test sent to you', { description: 'Check your own inbox in a moment.' })
              }}
            >
              Send myself a test
            </Button>
          </SettingsSection>
        </>
      )}
    </SettingsPage>
  )
}
