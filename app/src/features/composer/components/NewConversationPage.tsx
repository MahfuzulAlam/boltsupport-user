import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/PageHeader'
import { ProvenanceRail } from '@/components/ProvenanceRail'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { TiptapEditor } from './TiptapEditor'
import { SplitSendButton } from './SplitSendButton'

const schema = z.object({
  to: z.email('Enter a valid email address'),
  subject: z.string().min(1, 'Give the conversation a subject'),
})

type Values = z.infer<typeof schema>

/** Outbound composer. Same editor and send control as a reply, so nothing is learned twice. */
export function NewConversationPage() {
  const params = useParams()
  const navigate = useNavigate()
  const inboxId = params['inboxId'] ?? 'in1'
  const [body, setBody] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(() => {
    toast('Conversation started', { description: 'Outbound sending lands with the channel work.' })
    void navigate(`/inbox/${inboxId}/mine`)
  })

  useHotkeys({
    discard: () => {
      void navigate(`/inbox/${inboxId}/unassigned`)
    },
  })

  const hasBody = body.replace(/<[^>]*>/g, '').trim() !== ''

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 pt-6 pb-10">
      <PageHeader title="New conversation" description="Start an outbound conversation." />

      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <div className="mb-4">
          <Label htmlFor="to" className="mb-1.5 text-[13px]">
            To
          </Label>
          <Input id="to" type="email" placeholder="customer@example.com" {...register('to')} />
          {errors.to !== undefined ? (
            <p className="mt-1.5 text-[13px]" style={{ color: 'var(--danger-strong)' }}>
              {errors.to.message}
            </p>
          ) : null}
        </div>

        <div className="mb-4">
          <Label htmlFor="subject" className="mb-1.5 text-[13px]">
            Subject
          </Label>
          <Input id="subject" placeholder="What is this about?" {...register('subject')} />
          {errors.subject !== undefined ? (
            <p className="mt-1.5 text-[13px]" style={{ color: 'var(--danger-strong)' }}>
              {errors.subject.message}
            </p>
          ) : null}
        </div>

        <div className="flex gap-3.5">
          <ProvenanceRail provenance="agent" />
          <div
            className="min-w-0 flex-1 rounded-md border px-3 py-2.5"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <TiptapEditor
              mode="reply"
              html={body}
              onChange={setBody}
              onSlashTrigger={() => undefined}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <SplitSendButton
            label="Send"
            action="Send conversation"
            disabled={!hasBody}
            onSend={() => {
              void onSubmit()
            }}
          />
        </div>
      </form>
    </div>
  )
}
