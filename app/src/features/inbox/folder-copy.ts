import {
  Ban,
  CheckCheck,
  CheckCircle2,
  CircleAlert,
  Inbox as InboxIcon,
  MessageCircle,
  PenSquare,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Folder } from '@/types'

interface FolderCopy {
  title: string
  empty: {
    icon: LucideIcon
    title: string
    description: string
  }
}

/**
 * Per folder wording.
 *
 * Empty states say something specific rather than sharing one generic line, because "Nothing
 * here" in Needs attention means the team is on top of things, and the same words in Drafts
 * mean something entirely different.
 */
export const FOLDER_COPY: Record<Folder, FolderCopy> = {
  chats: {
    title: 'Chats',
    empty: {
      icon: MessageCircle,
      title: 'No live chats',
      description: 'Conversations from the chat widget land here as customers start them.',
    },
  },
  unassigned: {
    title: 'Unassigned',
    empty: {
      icon: CheckCheck,
      title: 'No unassigned conversations',
      description:
        'Everything here has an owner. Check Mine for what is waiting on you, or start a new conversation.',
    },
  },
  mine: {
    title: 'Mine',
    empty: {
      icon: CheckCheck,
      title: 'You are all caught up',
      description: 'Nothing is assigned to you right now. Unassigned is where to pick up next.',
    },
  },
  drafts: {
    title: 'Drafts',
    empty: {
      icon: PenSquare,
      title: 'No drafts',
      description: 'Replies you start but do not send will wait for you here.',
    },
  },
  'needs-attention': {
    title: 'Needs attention',
    empty: {
      icon: CircleAlert,
      title: 'Nothing needs attention',
      description: 'No breached SLAs and no paused sends. This is the folder you want empty.',
    },
  },
  assigned: {
    title: 'Assigned',
    empty: {
      icon: Users,
      title: 'Nothing assigned yet',
      description: 'Once conversations have an owner they show up here.',
    },
  },
  closed: {
    title: 'Closed',
    empty: {
      icon: CheckCircle2,
      title: 'No closed conversations',
      description: 'Conversations you resolve are archived here.',
    },
  },
  spam: {
    title: 'Spam',
    empty: {
      icon: Ban,
      title: 'No spam',
      description: 'Anything marked as spam is kept here rather than deleted.',
    },
  },
}

export const FOLDER_FALLBACK_ICON = InboxIcon
