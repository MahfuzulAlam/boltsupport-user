import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/EmptyState'
import { createConnectedApp, fetchConnectedApps } from '../api/settings'

/**
 * OAuth apps this person registered.
 *
 * A list of names and nothing else. The credentials live one level in, because a page that shows
 * every secret at once is a page nobody can screen share.
 */
export function MyAppsPage() {
  const queryClient = useQueryClient()
  const apps = useQuery({
    queryKey: ['connected-apps'],
    queryFn: ({ signal }) => fetchConnectedApps(signal),
  })

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const create = useMutation({
    mutationFn: (appName: string) => createConnectedApp(appName),
    onSuccess: (app) => {
      void queryClient.invalidateQueries({ queryKey: ['connected-apps'] })
      setCreating(false)
      setName('')
      toast(`${app.name} created`, { description: 'Its credentials are on the app.' })
    },
    onError: () => {
      toast.error('We could not create that app', { description: 'Try again in a moment.' })
    },
  })

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 pt-8 pb-10">
      <div className="mb-6 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em]">My apps</h1>
          <p className="text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
            Apps you have connected using OAuth and the BoltSupport API.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreating(true)
          }}
        >
          Create app
        </Button>
      </div>

      {apps.data === undefined ? (
        <p className="text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
          {apps.isError ? 'We could not load your apps. Try again in a moment.' : 'Loading'}
        </p>
      ) : apps.data.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No apps yet"
          description="Create one to get an app id and secret you can build against."
          action={
            <Button
              onClick={() => {
                setCreating(true)
              }}
            >
              Create app
            </Button>
          }
        />
      ) : (
        <ul
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          {apps.data.map((app, index) => (
            <li
              key={app.id}
              className={index === 0 ? undefined : 'border-t'}
              style={{ borderColor: 'var(--border)' }}
            >
              <Link
                to={`/account/my-apps/${app.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-[color:var(--hover)]"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'var(--muted)' }}
                >
                  <LayoutGrid className="size-4" style={{ color: 'var(--muted-foreground)' }} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{app.name}</span>
                <ChevronRight
                  className="size-4 shrink-0"
                  style={{ color: 'var(--muted-foreground)' }}
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Create app</DialogTitle>
            <DialogDescription>
              We issue the id and the secret. You can add a redirect URL afterwards.
            </DialogDescription>
          </DialogHeader>

          <Label htmlFor="app-name" className="mb-1.5 text-[14px] font-medium">
            App name
          </Label>
          <Input
            id="app-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim() !== '') create.mutate(name.trim())
            }}
            placeholder="Ticket analyzer"
          />

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false)
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={name.trim() === '' || create.isPending}
              onClick={() => {
                create.mutate(name.trim())
              }}
            >
              Create app
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
