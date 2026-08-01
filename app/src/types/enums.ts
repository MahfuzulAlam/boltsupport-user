import { z } from 'zod'

/**
 * Enums shared across more than one domain file. They live here rather than in the file that
 * "owns" them so conversation, automation, and inbox can all depend on them without cycles.
 *
 * Values are stable identifiers, never display strings. Labels live in `src/lib/labels.ts`
 * so wording can change without a data migration.
 */

export const convStatusSchema = z.enum(['active', 'pending', 'closed', 'spam'])
export type ConvStatus = z.infer<typeof convStatusSchema>

export const prioritySchema = z.enum(['urgent', 'high', 'normal', 'low'])
export type Priority = z.infer<typeof prioritySchema>

export const channelTypeSchema = z.enum([
  'email',
  'chat',
  'sms',
  'whatsapp',
  'instagram',
  'messenger',
])
export type ChannelType = z.infer<typeof channelTypeSchema>

export const channelStatusSchema = z.enum(['connected', 'disconnected', 'error', 'coming_soon'])
export type ChannelStatus = z.infer<typeof channelStatusSchema>

/** Customer satisfaction rating, actual or predicted. */
export const csatSchema = z.enum(['great', 'okay', 'notGood'])
export type Csat = z.infer<typeof csatSchema>

export const sentimentSchema = z.enum(['positive', 'neutral', 'frustrated', 'angry'])
export type Sentiment = z.infer<typeof sentimentSchema>

/** The five message types the provenance rail distinguishes. */
export const messageTypeSchema = z.enum(['customer', 'reply', 'note', 'system', 'ai_event'])
export type MessageType = z.infer<typeof messageTypeSchema>

/** System folders are computed, never stored (FR-1.6). */
export const folderSchema = z.enum([
  'chats',
  'unassigned',
  'mine',
  'drafts',
  'needs-attention',
  'assigned',
  'closed',
  'spam',
])
export type Folder = z.infer<typeof folderSchema>
