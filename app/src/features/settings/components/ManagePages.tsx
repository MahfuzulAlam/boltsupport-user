import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ApiError } from '@/lib/api-client'
import {
  createTag,
  createTeam,
  fetchIntegrations,
  fetchTags,
  fetchTeams,
  fetchUsers,
  inviteUser,
  setIntegrationConnected,
} from '../api/settings'
import { CreateDialog } from './CreateDialog'

const PAGE = 'mx-auto w-full max-w-[900px] px-6 pt-6 pb-10'
const CARD = 'overflow-hidden rounded-lg border'
const CARD_STYLE = { borderColor: 'var(--border)', background: 'var(--card)' }
const ROW = 'flex flex-wrap items-center gap-3 border-b px-3 py-2.5 text-[13px] last:border-b-0'

/** Named rather than free hex: a tag set stays legible when the colours are a fixed vocabulary. */
const TAG_COLORS = [
  { value: '#2563eb', label: 'Blue' },
  { value: '#dc2626', label: 'Red' },
  { value: '#16a34a', label: 'Green' },
  { value: '#d97706', label: 'Amber' },
  { value: '#7c3aed', label: 'Violet' },
  { value: '#0891b2', label: 'Teal' },
  { value: '#64748b', label: 'Slate' },
]

export function UsersPage() {
  const users = useQuery({ queryKey: ['users'], queryFn: ({ signal }) => fetchUsers(signal) })
  const [inviting, setInviting] = useState(false)
  const queryClient = useQueryClient()

  const invite = useMutation({
    mutationFn: (values: Record<string, string>) =>
      inviteUser({
        name: values['name'] ?? '',
        email: values['email'] ?? '',
        role: values['role'] ?? 'agent',
      }),
    onSuccess: async (user) => {
      setInviting(false)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast(`Invited ${user.name}`, { description: `They will get an email at ${user.email}.` })
    },
    onError: (error) => {
      // The duplicate address case is the one somebody actually hits, and it deserves the
      // server's own words rather than a generic failure.
      toast('Could not invite them', {
        description: error instanceof ApiError ? error.userMessage : 'Try again in a moment.',
      })
    },
  })

  return (
    <div className={PAGE}>
      <PageHeader
        title="Users"
        description="Everyone in this workspace and what they can reach."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setInviting(true)
            }}
          >
            Invite teammate
          </Button>
        }
      />

      <CreateDialog
        open={inviting}
        onOpenChange={setInviting}
        title="Invite teammate"
        description="They get an email with a link to set their own password."
        submitLabel="Send invite"
        pending={invite.isPending}
        onSubmit={(values) => {
          invite.mutate(values)
        }}
        fields={[
          { name: 'name', label: 'Name', placeholder: 'Priya Raman', required: true },
          { name: 'email', label: 'Email', placeholder: 'priya@example.com', required: true },
          {
            name: 'role',
            label: 'Role',
            options: [
              { value: 'agent', label: 'Agent' },
              { value: 'admin', label: 'Administrator' },
              { value: 'owner', label: 'Account owner' },
            ],
            hint: 'You can change this later from their permissions page.',
          },
        ]}
      />

      <div className={CARD} style={CARD_STYLE}>
        {(users.data ?? []).map((user) => (
          <div key={user.id} className={ROW} style={{ borderColor: 'var(--border)' }}>
            <Avatar className="size-8">
              <AvatarFallback className="text-[12px]" style={{ background: 'var(--muted)' }}>
                {user.name
                  .split(' ')
                  .map((part) => part.charAt(0))
                  .slice(0, 2)
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-[140px] flex-1">
              <span className="block font-medium">{user.name}</span>
              <span className="block" style={{ color: 'var(--muted-foreground)' }}>
                {user.email}
              </span>
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[12px] font-medium capitalize"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {user.role}
            </span>
            <span
              className="w-[80px] text-right"
              style={{
                color: user.available ? 'var(--success-strong)' : 'var(--muted-foreground)',
              }}
            >
              {user.available ? 'Available' : 'Away'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TeamsPage() {
  const teams = useQuery({ queryKey: ['teams'], queryFn: ({ signal }) => fetchTeams(signal) })
  const users = useQuery({ queryKey: ['users'], queryFn: ({ signal }) => fetchUsers(signal) })
  const nameOf = (id: string) => (users.data ?? []).find((user) => user.id === id)?.name ?? id
  const [creating, setCreating] = useState(false)
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: (values: Record<string, string>) => createTeam({ name: values['name'] ?? '' }),
    onSuccess: async (team) => {
      setCreating(false)
      await queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast(`${team.name} created`, { description: 'Add people to it from the row.' })
    },
  })

  return (
    <div className={PAGE}>
      <PageHeader
        title="Teams"
        description="Group people so a workflow can route to a team rather than a person who might be away."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setCreating(true)
            }}
          >
            New team
          </Button>
        }
      />

      <CreateDialog
        open={creating}
        onOpenChange={setCreating}
        title="New team"
        description="A team starts empty. Add people to it once it exists."
        submitLabel="Create team"
        pending={create.isPending}
        onSubmit={(values) => {
          create.mutate(values)
        }}
        fields={[{ name: 'name', label: 'Team name', placeholder: 'Billing', required: true }]}
      />

      <div className={CARD} style={CARD_STYLE}>
        {(teams.data ?? []).map((team) => (
          <div key={team.id} className={ROW} style={{ borderColor: 'var(--border)' }}>
            <span className="w-[160px] shrink-0 font-medium">{team.name}</span>
            <span className="min-w-0 flex-1" style={{ color: 'var(--muted-foreground)' }}>
              {team.memberIds.map(nameOf).join(', ')}
            </span>
            <span className="font-mono">{team.memberIds.length}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TagsPage() {
  const tags = useQuery({ queryKey: ['tags'], queryFn: ({ signal }) => fetchTags(signal) })
  const [creating, setCreating] = useState(false)
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: (values: Record<string, string>) =>
      createTag({ name: values['name'] ?? '', color: values['color'] ?? '#64748b' }),
    onSuccess: async (tag) => {
      setCreating(false)
      await queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast(`${tag.name} added`, {
        description: 'Auto Tag can use it once you allow it in AI settings.',
      })
    },
  })

  return (
    <div className={PAGE}>
      <PageHeader
        title="Tags"
        description="The workspace tag set. Auto Tag can only choose from tags that exist here."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setCreating(true)
            }}
          >
            New tag
          </Button>
        }
      />

      <CreateDialog
        open={creating}
        onOpenChange={setCreating}
        title="New tag"
        description="Tags are workspace wide. Auto Tag will not apply a new one until it is allowed."
        submitLabel="Add tag"
        pending={create.isPending}
        onSubmit={(values) => {
          create.mutate(values)
        }}
        fields={[
          { name: 'name', label: 'Name', placeholder: 'billing', required: true },
          { name: 'color', label: 'Colour', options: TAG_COLORS },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {(tags.data ?? []).map((tag) => (
          <span
            key={tag.id}
            className="inline-flex h-8 items-center gap-2 rounded-[16px] border px-3 text-[13px]"
            style={{ borderColor: 'var(--border)' }}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ background: tag.color }}
              aria-hidden="true"
            />
            {tag.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export function IntegrationsPage() {
  const integrations = useQuery({
    queryKey: ['integrations'],
    queryFn: ({ signal }) => fetchIntegrations(signal),
  })

  const queryClient = useQueryClient()
  const toggle = useMutation({
    mutationFn: ({ id, connected }: { id: string; connected: boolean }) =>
      setIntegrationConnected(id, connected),
    onSuccess: async (integration) => {
      await queryClient.invalidateQueries({ queryKey: ['integrations'] })
      toast(
        integration.connected
          ? `${integration.name} connected`
          : `${integration.name} disconnected`,
        {
          description: integration.connected
            ? 'Context from it now arrives with the conversation.'
            : 'Nothing already saved was removed.',
        },
      )
    },
  })

  return (
    <div className={PAGE}>
      <PageHeader
        title="Integrations"
        description="Connect BoltSupport to the rest of your stack so context arrives with the conversation."
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {(integrations.data ?? []).map((integration) => (
          <div key={integration.id} className="rounded-lg border p-3.5" style={CARD_STYLE}>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[15px] font-medium">{integration.name}</span>
              {integration.connected ? (
                <span
                  className="rounded px-1.5 py-0.5 text-[12px] font-medium"
                  style={{ background: 'var(--success-soft)', color: 'var(--success-strong)' }}
                >
                  Connected
                </span>
              ) : null}
            </div>
            <p className="mb-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              {integration.description}
            </p>
            {/* One button that reports what it did, rather than one that looked clickable and
                was not. Disconnecting is offered on the same control because the state it toggles
                is the only state this page holds. */}
            <Button
              variant="outline"
              size="sm"
              disabled={toggle.isPending}
              onClick={() => {
                toggle.mutate({ id: integration.id, connected: !integration.connected })
              }}
            >
              {integration.connected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
