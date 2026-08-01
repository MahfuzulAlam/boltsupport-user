import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { inboxesQueryKey, useInboxes } from '@/features/inbox'
import type { Channel, ChannelType } from '@/types'
import { connectChannel, disconnectChannel, syncChannel } from '../api/channels'
import { CHANNEL_ORDER, PROVIDERS } from '../providers'
import { ChannelRow } from './ChannelRow'
import { ConnectChannelModal } from './ConnectChannelModal'

export function ChannelsPage() {
  const inboxId = useParams()['inboxId'] ?? 'in1'
  const queryClient = useQueryClient()
  const inboxes = useInboxes()
  const [connecting, setConnecting] = useState<ChannelType | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const inbox = (inboxes.data ?? []).find((item) => item.id === inboxId)

  const refresh = () => queryClient.invalidateQueries({ queryKey: inboxesQueryKey })

  const sync = useMutation({
    mutationFn: (channelId: string) => syncChannel(inboxId, channelId),
    onSettled: () => {
      setSyncingId(null)
      void refresh()
    },
    onSuccess: () => {
      toast('Synced')
    },
  })

  const disconnect = useMutation({
    mutationFn: (channelId: string) => disconnectChannel(inboxId, channelId),
    onSuccess: (channel) => {
      void refresh()
      toast(`${PROVIDERS[channel.type].name} disconnected`)
    },
  })

  if (inbox === undefined) {
    return (
      <div className="w-full pt-6">
        <PageHeader title="Connect channels" />
      </div>
    )
  }

  // The seed carries a row per channel type; anything missing shows as disconnected rather
  // than vanishing, so nobody goes looking for a channel that is simply not set up (FR-6.6).
  const byType = new Map(inbox.channels.map((channel) => [channel.type, channel]))
  const rows: Channel[] = CHANNEL_ORDER.map(
    (type) =>
      byType.get(type) ?? {
        id: `${inboxId}-${type}`,
        inboxId,
        type,
        status: 'disconnected' as const,
        scopes: [],
      },
  )

  const provider = connecting === null ? null : PROVIDERS[connecting]
  const connectingChannel = rows.find((row) => row.type === connecting)

  return (
    <div className="w-full max-w-[820px] pt-6 pb-10">
      <PageHeader
        title="Connect channels"
        description="Add customer conversations from other channels into this inbox."
      />

      <div
        className="overflow-hidden rounded-lg border"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        {rows.map((channel) => (
          <ChannelRow
            key={channel.type}
            channel={channel}
            provider={PROVIDERS[channel.type]}
            syncing={syncingId === channel.id}
            onConnect={() => {
              setConnecting(channel.type)
            }}
            onSync={() => {
              setSyncingId(channel.id)
              sync.mutate(channel.id)
            }}
            onDisconnect={() => {
              disconnect.mutate(channel.id)
            }}
          />
        ))}
      </div>

      {provider !== null && connectingChannel !== undefined ? (
        <ConnectChannelModal
          provider={provider}
          open
          onOpenChange={(open) => {
            if (!open) setConnecting(null)
          }}
          onConnect={async (payload) => {
            const channel = await connectChannel(inboxId, connectingChannel.id, payload)
            await refresh()
            return channel
          }}
        />
      ) : null}
    </div>
  )
}
