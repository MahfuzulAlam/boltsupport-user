import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Copy, Eye, EyeOff, MoreVertical, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StickySaveBar } from '@/components/settings-primitives'
import { deleteConnectedApp, fetchConnectedApp, patchConnectedApp } from '../api/settings'

function copy(text: string, what: string) {
  void navigator.clipboard
    .writeText(text)
    .then(() => {
      toast(`${what} copied`)
    })
    .catch(() => {
      toast.error(`We could not copy the ${what.toLowerCase()}`, {
        description: 'Select it and copy.',
      })
    })
}

/** A read-only credential with a copy control, and optionally a reveal. */
function CredentialField({
  id,
  label,
  value,
  secret = false,
}: {
  id: string
  label: string
  value: string
  secret?: boolean
}) {
  const [shown, setShown] = useState(false)
  const hidden = secret && !shown

  return (
    <div className="mb-4">
      <Label htmlFor={id} className="mb-1.5 text-[14px] font-medium">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          readOnly
          value={hidden ? '•'.repeat(value.length) : value}
          className="font-mono"
          style={{ color: 'var(--muted-foreground)' }}
        />
        {secret ? (
          <Button
            variant="outline"
            size="icon"
            aria-label={
              shown ? `Hide the ${label.toLowerCase()}` : `Reveal the ${label.toLowerCase()}`
            }
            onClick={() => {
              setShown((current) => !current)
            }}
          >
            {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="icon"
          aria-label={`Copy the ${label.toLowerCase()}`}
          onClick={() => {
            copy(value, label)
          }}
        >
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  )
}

/**
 * One OAuth app.
 *
 * The name and the redirect URL are yours to change; the id and the secret are issued and only
 * ever read here. The secret arrives masked and reveals on request, because the common reason to
 * open this page is to check the redirect URL, and a credential that is on screen by default is
 * a credential that ends up in a screen recording.
 */
export function EditAppPage() {
  const appId = useParams()['appId'] ?? ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const app = useQuery({
    queryKey: ['connected-app', appId],
    queryFn: ({ signal }) => fetchConnectedApp(appId, signal),
  })

  const [edits, setEdits] = useState<{ name?: string; redirectUrl?: string }>({})
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const dirty = Object.keys(edits).length > 0

  const save = useMutation({
    mutationFn: (patch: { name?: string; redirectUrl?: string }) => patchConnectedApp(appId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connected-app', appId] })
      void queryClient.invalidateQueries({ queryKey: ['connected-apps'] })
      setEdits({})
      toast('App saved')
    },
    onError: () => {
      toast.error('That change did not stick', { description: 'Try again in a moment.' })
    },
  })

  const remove = useMutation({
    mutationFn: () => deleteConnectedApp(appId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connected-apps'] })
      void navigate('/account/my-apps')
      toast('App deleted', { description: 'Anything using its credentials stops working.' })
    },
    onError: () => {
      toast.error('We could not delete that app', { description: 'Nothing was removed.' })
    },
  })

  if (app.data === undefined) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-6 pt-8">
        <p className="text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
          {app.isError ? 'That app is no longer here.' : 'Loading'}
        </p>
      </div>
    )
  }

  const value = { ...app.data, ...edits }
  const nameMissing = value.name.trim() === ''

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-[760px] flex-1 px-6 pt-6 pb-6">
        <Link
          to="/account/my-apps"
          className="mb-5 flex w-fit items-center gap-1 text-[14px]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          My apps
        </Link>

        <div className="mb-5 flex items-start gap-3">
          <h1 className="min-w-0 flex-1 text-[28px] font-semibold tracking-[-0.02em]">Edit app</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="App actions"
                className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-[color:var(--hover)]"
              >
                <MoreVertical className="size-4" style={{ color: 'var(--muted-foreground)' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setConfirmingDelete(true)
                }}
              >
                <Trash2 className="size-3.5" />
                Delete app
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <section
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <div className="mb-4">
            <Label htmlFor="name" className="mb-1.5 text-[14px] font-medium">
              App name
              <span aria-hidden="true" style={{ color: 'var(--danger)' }}>
                *
              </span>
            </Label>
            <Input
              id="name"
              value={value.name}
              onChange={(event) => {
                setEdits((current) => ({ ...current, name: event.target.value }))
              }}
            />
            {nameMissing ? (
              <p className="mt-1.5 text-[13px]" style={{ color: 'var(--danger-strong)' }}>
                An app needs a name.
              </p>
            ) : null}
          </div>

          <CredentialField id="app-id" label="App ID" value={value.appId} />
          <CredentialField id="app-secret" label="App secret" value={value.secret} secret />

          <div>
            <Label htmlFor="redirect" className="mb-1.5 text-[14px] font-medium">
              Redirection URL
            </Label>
            <Input
              id="redirect"
              value={value.redirectUrl}
              placeholder="https://example.com/oauth/callback"
              onChange={(event) => {
                setEdits((current) => ({ ...current, redirectUrl: event.target.value }))
              }}
            />
          </div>
        </section>
      </div>

      <StickySaveBar
        dirty={dirty && !nameMissing}
        note={
          dirty && nameMissing
            ? 'Give the app a name before saving'
            : dirty
              ? 'You have unsaved changes'
              : 'Everything is saved'
        }
        onDiscard={() => {
          setEdits({})
        }}
        onSave={() => {
          save.mutate(edits)
        }}
      />

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete {value.name}?</DialogTitle>
            <DialogDescription>
              Its credentials stop working immediately, and anything built against them stops with
              them. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmingDelete(false)
              }}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmingDelete(false)
                remove.mutate()
              }}
            >
              Delete app
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
