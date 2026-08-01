import { Camera, Mail, MessageCircle, type LucideIcon, Phone, Send, Smartphone } from 'lucide-react'
import type { ChannelType } from '@/types'

/**
 * Channel display metadata, shared by the workspace dashboard, the channels settings page, and
 * the reports channel tabs.
 *
 * Lucide dropped brand marks, so these are generic glyphs. That makes the accessible label the
 * thing that actually identifies the channel, which is why every icon here is rendered with one
 * rather than relying on the shape.
 */
export interface ChannelMeta {
  label: string
  icon: LucideIcon
  /** How reports group channels: Messaging covers WhatsApp and SMS, Social the other two. */
  reportGroup: 'email' | 'chat' | 'messaging' | 'social'
}

export const CHANNEL_META: Record<ChannelType, ChannelMeta> = {
  email: { label: 'Email', icon: Mail, reportGroup: 'email' },
  chat: { label: 'Live chat', icon: MessageCircle, reportGroup: 'chat' },
  whatsapp: { label: 'WhatsApp', icon: Phone, reportGroup: 'messaging' },
  sms: { label: 'SMS', icon: Smartphone, reportGroup: 'messaging' },
  instagram: { label: 'Instagram', icon: Camera, reportGroup: 'social' },
  messenger: { label: 'Messenger', icon: Send, reportGroup: 'social' },
}

export const CHANNEL_ORDER: ChannelType[] = [
  'email',
  'chat',
  'whatsapp',
  'sms',
  'instagram',
  'messenger',
]
