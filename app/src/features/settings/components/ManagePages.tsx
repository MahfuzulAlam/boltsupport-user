import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { fetchIntegrations, fetchTags, fetchTeams, fetchUsers } from '../api/settings'

const PAGE = 'mx-auto w-full max-w-[900px] px-6 pt-6 pb-10'
const CARD = 'overflow-hidden rounded-lg border'
const CARD_STYLE = { borderColor: 'var(--border)', background: 'var(--card)' }
const ROW = 'flex flex-wrap items-center gap-3 border-b px-3 py-2.5 text-[13px] last:border-b-0'

export function UsersPage() {
  const users = useQuery({ queryKey: ['users'], queryFn: ({ signal }) => fetchUsers(signal) })

  return (
    <div className={PAGE}>
      <PageHeader
        title="Users"
        description="Everyone in this workspace and what they can reach."
        actions={<Button size="sm">Invite teammate</Button>}
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

  return (
    <div className={PAGE}>
      <PageHeader
        title="Teams"
        description="Group people so a workflow can route to a team rather than a person who might be away."
        actions={<Button size="sm">New team</Button>}
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

  return (
    <div className={PAGE}>
      <PageHeader
        title="Tags"
        description="The workspace tag set. Auto Tag can only choose from tags that exist here."
        actions={<Button size="sm">New tag</Button>}
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
            <Button variant="outline" size="sm">
              {integration.connected ? 'Configure' : 'Connect'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
