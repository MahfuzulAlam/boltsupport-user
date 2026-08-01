import type { ChannelType } from '@/types'

export interface Provider {
  type: ChannelType
  name: string
  description: string
  /** The brand tile behind the mark. Kept here so a row and its modal cannot disagree. */
  tile: string
  /**
   * Exactly what the OAuth consent screen will ask for, in the operator's words.
   *
   * FR-6.2 requires these to be shown before the redirect, not after. Sending someone into a
   * consent screen without telling them what is being granted is the pattern this exists to
   * avoid, so the modal reads this list and never a server response.
   */
  scopes: { scope: string; label: string }[]
  /** WhatsApp and SMS need a number chosen after consent, plus the 24 hour window notice. */
  needsNumber?: boolean
  available: boolean
}

export const PROVIDERS: Record<ChannelType, Provider> = {
  email: {
    type: 'email',
    name: 'Email',
    description: 'Forward your support address into this inbox',
    tile: 'hsl(226 46% 20%)',
    scopes: [
      { scope: 'mail.read', label: 'Read messages sent to this address' },
      { scope: 'mail.send', label: 'Send replies from this address' },
    ],
    available: true,
  },
  chat: {
    type: 'chat',
    name: 'Live chat widget',
    description: 'Embed a chat widget on your site and route it here',
    tile: 'hsl(221 83% 53%)',
    scopes: [{ scope: 'widget', label: 'Serve the widget on your domains' }],
    available: true,
  },
  whatsapp: {
    type: 'whatsapp',
    name: 'WhatsApp',
    description: 'Route WhatsApp messages into this inbox',
    tile: 'hsl(142 70% 35%)',
    scopes: [
      { scope: 'whatsapp_business_messaging', label: 'Send and receive WhatsApp messages' },
      { scope: 'whatsapp_business_management', label: 'Read your WhatsApp Business account list' },
      { scope: 'business_management', label: 'Read the business profile the account belongs to' },
    ],
    needsNumber: true,
    available: true,
  },
  sms: {
    type: 'sms',
    name: 'SMS',
    description: 'Receive and reply to text messages',
    tile: 'hsl(262 60% 52%)',
    scopes: [
      { scope: 'sms.read', label: 'Receive messages sent to your numbers' },
      { scope: 'sms.send', label: 'Send messages from your numbers' },
      { scope: 'numbers.read', label: 'List the numbers on your account' },
    ],
    needsNumber: true,
    available: true,
  },
  instagram: {
    type: 'instagram',
    name: 'Instagram',
    description: 'Bring Instagram DMs into this inbox',
    tile: 'hsl(330 70% 52%)',
    scopes: [
      { scope: 'instagram_manage_messages', label: 'Read and reply to direct messages' },
      { scope: 'pages_show_list', label: 'See which accounts you manage' },
    ],
    available: true,
  },
  messenger: {
    type: 'messenger',
    name: 'Messenger',
    description: 'Bring Facebook Messenger conversations into this inbox',
    tile: 'hsl(214 89% 52%)',
    scopes: [
      { scope: 'pages_messaging', label: 'Read and reply to Messenger conversations' },
      { scope: 'pages_show_list', label: 'See which pages you manage' },
    ],
    available: true,
  },
}

/** The order the rows appear in, most used first. */
export const CHANNEL_ORDER: ChannelType[] = [
  'email',
  'chat',
  'instagram',
  'messenger',
  'sms',
  'whatsapp',
]

/**
 * The messaging window, in plain language.
 *
 * FR-6.5. Without this an agent writes a free form reply on day two, watches it get rejected by
 * the carrier, and has no idea why.
 */
export const SERVICE_WINDOW_NOTICE =
  'You can reply freely for 24 hours after a customer’s last message. After that, only pre-approved template messages will be delivered, and free form replies are rejected by the provider.'
