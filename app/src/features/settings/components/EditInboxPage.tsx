import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/Select'
import { SettingsSection } from '@/components/settings-primitives'
import { inboxesQueryKey, useInboxes } from '@/features/inbox'
import type { InboxSettings } from '@/types'
import { fetchInboxSetting, fetchUsers, patchInboxSetting } from '../api/settings'
import { useSettingsForm } from '../hooks/use-settings-form'
import { SettingsPage } from './SettingsPage'

/** Copies to the clipboard and says so, because a silent copy reads as a failed click. */
function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex max-w-[420px] items-center gap-2">
      <Input value={value} readOnly aria-label={label} className="font-mono text-[13px]" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(value)
          setCopied(true)
          window.setTimeout(() => {
            setCopied(false)
          }, 1500)
        }}
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}

export function EditInboxPage() {
  const inboxId = useParams()['inboxId'] ?? 'in1'
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const inboxes = useInboxes()

  const saved = useQuery({
    queryKey: ['inbox-settings', inboxId, 'general'],
    queryFn: ({ signal }) => fetchInboxSetting(inboxId, 'general', signal),
  })
  const users = useQuery({ queryKey: ['users'], queryFn: ({ signal }) => fetchUsers(signal) })
  const form = useSettingsForm<InboxSettings>(saved.data)

  const save = useMutation({
    mutationFn: (patch: Partial<InboxSettings>) => patchInboxSetting(inboxId, 'general', patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-settings', inboxId] })
      void queryClient.invalidateQueries({ queryKey: inboxesQueryKey })
      form.saved()
      toast('Inbox updated')
    },
  })

  const value = form.value
  const inbox = (inboxes.data ?? []).find((item) => item.id === inboxId)

  return (
    <SettingsPage
      title="Edit inbox"
      description="Name, address, and what a new conversation starts as."
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
          <SettingsSection title="Basics">
            <Label htmlFor="inbox-name" className="mb-1.5 block text-[13px]">
              Name
            </Label>
            <Input
              id="inbox-name"
              value={value.name}
              onChange={(event) => {
                form.update({ name: event.target.value })
              }}
              className="mb-4 max-w-[420px]"
            />

            <Label className="mb-1.5 block text-[13px]">Address</Label>
            <p className="mb-1.5 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
              Forward your support address here, or hand this one out directly.
            </p>
            <CopyField value={inbox?.email ?? ''} label="Inbox address" />
          </SettingsSection>

          <SettingsSection
            title="Defaults"
            description="What a conversation looks like the moment it arrives."
          >
            <Label htmlFor="from-name" className="mb-1.5 block text-[13px]">
              From name
            </Label>
            <Input
              id="from-name"
              value={value.fromName}
              onChange={(event) => {
                form.update({ fromName: event.target.value })
              }}
              className="mb-4 max-w-[420px]"
            />

            <Label className="mb-1.5 block text-[13px]">Status</Label>
            <Select
              value={value.defaultStatus}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'pending', label: 'Pending' },
              ]}
              onChange={(next) => {
                form.update({ defaultStatus: next as InboxSettings['defaultStatus'] })
              }}
              aria-label="Default status"
              className="mb-4 max-w-[420px]"
            />

            <Label className="mb-1.5 block text-[13px]">Assignee</Label>
            <Select
              value={value.defaultAssigneeId ?? 'none'}
              options={[
                { value: 'none', label: 'Nobody, leave it unassigned' },
                ...(users.data ?? []).map((user) => ({ value: user.id, label: user.name })),
              ]}
              onChange={(next) => {
                form.update({ defaultAssigneeId: next === 'none' ? null : next })
              }}
              aria-label="Default assignee"
              className="max-w-[420px]"
            />
          </SettingsSection>

          <SettingsSection
            title="Delete this inbox"
            description="Conversations in it are deleted too. This cannot be undone."
          >
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px]">Delete “{value.name}” and everything in it?</span>
                <Button
                  size="sm"
                  style={{ background: 'var(--danger)', color: 'hsl(0 0% 100%)' }}
                  onClick={() => {
                    setConfirmDelete(false)
                    toast('Deleting an inbox needs an owner', {
                      description: 'Ask a workspace owner to do this from billing.',
                    })
                  }}
                >
                  Yes, delete {value.name}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirmDelete(false)
                  }}
                >
                  Keep it
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                style={{ color: 'var(--danger-strong)', borderColor: 'var(--danger)' }}
                onClick={() => {
                  setConfirmDelete(true)
                }}
              >
                Delete inbox
              </Button>
            )}
          </SettingsSection>
        </>
      )}
    </SettingsPage>
  )
}
