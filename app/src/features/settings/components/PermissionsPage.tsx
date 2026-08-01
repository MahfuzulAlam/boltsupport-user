import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { InboxPermissions } from '@/types'
import { fetchInboxSetting, fetchUsers, patchInboxSetting } from '../api/settings'
import { useSettingsForm } from '../hooks/use-settings-form'
import { SettingsPage } from './SettingsPage'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  agent: 'Agent',
  viewer: 'Viewer',
}

export function PermissionsPage() {
  const inboxId = useParams()['inboxId'] ?? 'in1'
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const saved = useQuery({
    queryKey: ['inbox-settings', inboxId, 'permissions'],
    queryFn: ({ signal }) => fetchInboxSetting(inboxId, 'permissions', signal),
  })
  const users = useQuery({ queryKey: ['users'], queryFn: ({ signal }) => fetchUsers(signal) })
  const form = useSettingsForm<InboxPermissions>(saved.data)

  const save = useMutation({
    mutationFn: (patch: Partial<InboxPermissions>) =>
      patchInboxSetting(inboxId, 'permissions', patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-settings', inboxId] })
      form.saved()
      toast('Access updated')
    },
  })

  const value = form.value
  const needle = search.trim().toLowerCase()
  const visible = (users.data ?? []).filter(
    (user) =>
      needle === '' ||
      user.name.toLowerCase().includes(needle) ||
      user.email.toLowerCase().includes(needle),
  )

  const toggle = (userId: string) => {
    if (value === undefined) return
    form.update({
      userIds: value.userIds.includes(userId)
        ? value.userIds.filter((id) => id !== userId)
        : [...value.userIds, userId],
    })
  }

  return (
    <SettingsPage
      title="Permissions"
      description="Choose who can access this inbox. Everyone else will not see it at all."
      save={{
        dirty: form.dirty,
        onSave: () => {
          if (form.edits !== null) save.mutate(form.edits)
        },
        onDiscard: form.discard,
        note:
          value !== undefined && value.userIds.length === 0
            ? 'Nobody would be able to open this inbox.'
            : '',
      }}
    >
      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value)
        }}
        placeholder="Search people"
        aria-label="Search people"
        className="mb-3 max-w-[320px]"
      />

      {value === undefined ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((user) => {
            const selected = value.userIds.includes(user.id)
            return (
              <button
                key={user.id}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => {
                  toggle(user.id)
                }}
                className={cn('flex items-center gap-2.5 rounded-lg border p-3 text-left')}
                style={{
                  borderColor: selected ? 'var(--brand)' : 'var(--border)',
                  background: selected ? 'var(--brand-soft)' : 'var(--card)',
                }}
              >
                <Avatar className="size-9">
                  <AvatarFallback
                    className="text-[13px] font-medium"
                    style={{ background: 'var(--muted)' }}
                  >
                    {user.name
                      .split(' ')
                      .map((part) => part.charAt(0))
                      .slice(0, 2)
                      .join('')}
                  </AvatarFallback>
                </Avatar>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{user.name}</span>
                  <span
                    className="block truncate text-[12px]"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {ROLE_LABEL[user.role] ?? user.role}
                  </span>
                </span>

                {selected ? (
                  <Check
                    className="size-4 shrink-0"
                    style={{ color: 'var(--brand)' }}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </SettingsPage>
  )
}
