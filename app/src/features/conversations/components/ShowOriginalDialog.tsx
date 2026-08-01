import { toast } from 'sonner'
import { Copy } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { AuthoredMessage } from '@/types'

interface ShowOriginalDialogProps {
  message: AuthoredMessage
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** What a message that never travelled as email can honestly show: its stored body. */
function fallbackSource(message: AuthoredMessage): string {
  return [
    `Message-ID: <${message.id}@boltsupport.io>`,
    `Date: ${new Date(message.createdAt).toUTCString()}`,
    `From: ${message.author.name}${message.author.email === undefined ? '' : ` <${message.author.email}>`}`,
    `X-BoltSupport-Type: ${message.type}`,
    '',
    message.bodyHtml,
  ].join('\n')
}

/**
 * The message as it arrived, headers and all.
 *
 * Agents open this when the rendered thread looks wrong: a reply that went to the wrong address, a
 * sender whose display name does not match the envelope, a body that renders oddly. None of those
 * answers are visible in the rendered message.
 *
 * It renders in a `<pre>` as text. That is the point rather than a limitation: the raw source is
 * the untrusted original, and showing it as markup here would hand it a second render path outside
 * the sandboxed frame that exists to contain it.
 */
export function ShowOriginalDialog({ message, open, onOpenChange }: ShowOriginalDialogProps) {
  const source = message.rawSource ?? fallbackSource(message)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Original message</DialogTitle>
          <DialogDescription>
            The message exactly as it was received, before it was rendered.
          </DialogDescription>
        </DialogHeader>

        <pre
          className="max-h-[460px] overflow-auto rounded-md border p-3 font-mono text-[12px] leading-[1.6] whitespace-pre-wrap"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          {source}
        </pre>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard
                .writeText(source)
                .then(() => {
                  toast('Source copied')
                })
                .catch(() => {
                  toast.error('We could not copy that', { description: 'Select it and copy.' })
                })
            }}
          >
            <Copy className="size-3.5" />
            Copy source
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
