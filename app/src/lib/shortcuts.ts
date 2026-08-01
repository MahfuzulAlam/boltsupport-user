/**
 * The canonical keyboard map.
 *
 * This array is the single source for both the bindings and the `?` cheat sheet. Keeping them
 * in one place is the whole point: a product whose selling point is keyboard operation cannot
 * afford a cheat sheet that documents a binding the code no longer has.
 *
 * Source: PRD section 14.1 and design specification section 15. Where the prototype disagreed
 * (it showed Snooze as Z), the PRD wins.
 */

export type ShortcutGroup = 'Global' | 'Conversation list' | 'Conversation' | 'Composer'

export type ShortcutBinding =
  /** A modifier combination, for example Cmd+Shift+G. */
  | { type: 'combo'; key: string; meta?: boolean; shift?: boolean }
  /** A bare letter, ignored while typing. */
  | { type: 'single'; key: string }
  /** A lead key then a second key inside the chord window, for example G then I. */
  | { type: 'chord'; lead: string; key: string }

interface ShortcutDef {
  id: string
  /** Rendered in the cheat sheet and in <kbd> hints. */
  display: string
  label: string
  group: ShortcutGroup
  binding: ShortcutBinding
  /**
   * Fires even when focus is in an input or editor. Only Send, Discard, and the palette need
   * this, because everything else would fight ordinary typing.
   */
  allowWhileTyping?: boolean
  /**
   * Ceded to the rich text editor when focus is inside one. Cmd+K is the only binding that
   * legitimately means two things, so the rule is encoded once here rather than being
   * rediscovered in each component.
   */
  editorOwnsIt?: boolean
}

export const SHORTCUTS = [
  // Global
  {
    id: 'palette',
    display: '⌘K',
    label: 'Command palette',
    group: 'Global',
    binding: { type: 'combo', key: 'k', meta: true },
    allowWhileTyping: true,
    editorOwnsIt: true,
  },
  {
    id: 'search',
    display: '/',
    label: 'Focus search',
    group: 'Global',
    binding: { type: 'single', key: '/' },
  },
  {
    id: 'help',
    display: '?',
    label: 'This cheat sheet',
    group: 'Global',
    binding: { type: 'single', key: '?' },
  },
  {
    id: 'compose',
    display: 'C',
    label: 'New conversation',
    group: 'Global',
    binding: { type: 'single', key: 'c' },
  },
  {
    id: 'goInboxes',
    display: 'G then I',
    label: 'Go to Inboxes',
    group: 'Global',
    binding: { type: 'chord', lead: 'g', key: 'i' },
  },
  {
    id: 'goDocs',
    display: 'G then D',
    label: 'Go to Docs',
    group: 'Global',
    binding: { type: 'chord', lead: 'g', key: 'd' },
  },
  {
    id: 'goReports',
    display: 'G then R',
    label: 'Go to Reports',
    group: 'Global',
    binding: { type: 'chord', lead: 'g', key: 'r' },
  },
  {
    id: 'goCustomers',
    display: 'G then C',
    label: 'Go to Customers',
    group: 'Global',
    binding: { type: 'chord', lead: 'g', key: 'c' },
  },
  {
    id: 'goAi',
    display: 'G then A',
    label: 'Go to AI',
    group: 'Global',
    binding: { type: 'chord', lead: 'g', key: 'a' },
  },
  {
    id: 'goHome',
    display: 'G then H',
    label: 'Go to Workspace',
    group: 'Global',
    binding: { type: 'chord', lead: 'g', key: 'h' },
  },

  // Conversation list
  {
    id: 'listDown',
    display: 'J',
    label: 'Move down',
    group: 'Conversation list',
    binding: { type: 'single', key: 'j' },
  },
  {
    id: 'listUp',
    display: 'K',
    label: 'Move up',
    group: 'Conversation list',
    binding: { type: 'single', key: 'k' },
  },
  {
    id: 'listSelect',
    display: 'X',
    label: 'Select',
    group: 'Conversation list',
    binding: { type: 'single', key: 'x' },
  },
  {
    id: 'listOpen',
    display: '↵',
    label: 'Open',
    group: 'Conversation list',
    binding: { type: 'single', key: 'Enter' },
  },
  {
    id: 'selectAll',
    display: '* then A',
    label: 'Select all',
    group: 'Conversation list',
    binding: { type: 'chord', lead: '*', key: 'a' },
  },
  {
    id: 'selectNone',
    display: '* then N',
    label: 'Select none',
    group: 'Conversation list',
    binding: { type: 'chord', lead: '*', key: 'n' },
  },
  {
    id: 'assign',
    display: 'A',
    label: 'Assign',
    group: 'Conversation list',
    binding: { type: 'single', key: 'a' },
  },
  {
    id: 'statusActive',
    display: 'S then A',
    label: 'Status: Active',
    group: 'Conversation list',
    binding: { type: 'chord', lead: 's', key: 'a' },
  },
  {
    id: 'statusPending',
    display: 'S then P',
    label: 'Status: Pending',
    group: 'Conversation list',
    binding: { type: 'chord', lead: 's', key: 'p' },
  },
  {
    id: 'statusClosed',
    display: 'S then C',
    label: 'Status: Closed',
    group: 'Conversation list',
    binding: { type: 'chord', lead: 's', key: 'c' },
  },
  {
    id: 'statusSpam',
    display: 'S then X',
    label: 'Mark as spam',
    group: 'Conversation list',
    binding: { type: 'chord', lead: 's', key: 'x' },
  },
  {
    id: 'tag',
    display: 'T',
    label: 'Add tag',
    group: 'Conversation list',
    binding: { type: 'single', key: 't' },
  },
  {
    id: 'snooze',
    display: 'H',
    label: 'Snooze',
    group: 'Conversation list',
    binding: { type: 'single', key: 'h' },
  },
  {
    id: 'remove',
    display: 'D',
    label: 'Delete',
    group: 'Conversation list',
    binding: { type: 'single', key: 'd' },
  },
  {
    id: 'move',
    display: 'M',
    label: 'Move',
    group: 'Conversation list',
    binding: { type: 'single', key: 'm' },
  },
  {
    id: 'editDraft',
    display: 'E',
    label: 'Edit draft',
    group: 'Conversation list',
    binding: { type: 'single', key: 'e' },
  },

  // Conversation
  {
    id: 'reply',
    display: 'R',
    label: 'Reply',
    group: 'Conversation',
    binding: { type: 'single', key: 'r' },
  },
  {
    id: 'note',
    display: 'N',
    label: 'Internal note',
    group: 'Conversation',
    binding: { type: 'single', key: 'n' },
  },
  {
    id: 'forward',
    display: 'F',
    label: 'Forward',
    group: 'Conversation',
    binding: { type: 'single', key: 'f' },
  },
  {
    id: 'undoSend',
    display: 'Z',
    label: 'Undo send',
    group: 'Conversation',
    binding: { type: 'single', key: 'z' },
  },
  {
    id: 'regenerateSummary',
    display: '⌘⇧U',
    label: 'Regenerate AI summary',
    group: 'Conversation',
    binding: { type: 'combo', key: 'u', meta: true, shift: true },
  },
  {
    id: 'follow',
    display: 'W',
    label: 'Follow this conversation',
    group: 'Conversation',
    binding: { type: 'single', key: 'w' },
  },
  {
    id: 'hideDetails',
    display: ';',
    label: 'Show or hide message details',
    group: 'Conversation',
    binding: { type: 'single', key: ';' },
  },
  {
    id: 'layout',
    display: 'L',
    label: 'Switch between the regular and wide layout',
    group: 'Conversation',
    binding: { type: 'single', key: 'l' },
  },
  {
    id: 'collapseAll',
    display: '-',
    label: 'Collapse every message',
    group: 'Conversation',
    binding: { type: 'single', key: '-' },
  },
  {
    id: 'expandAll',
    display: '+',
    label: 'Expand every message',
    group: 'Conversation',
    binding: { type: 'single', key: '+' },
  },

  // Composer
  {
    id: 'send',
    display: '⌘↵',
    label: 'Send',
    group: 'Composer',
    binding: { type: 'combo', key: 'Enter', meta: true },
    allowWhileTyping: true,
  },
  {
    id: 'draftWithAi',
    display: '⌘⇧G',
    label: 'Draft with AI',
    group: 'Composer',
    binding: { type: 'combo', key: 'g', meta: true, shift: true },
    allowWhileTyping: true,
  },
  {
    id: 'checkReply',
    display: '⌘⇧E',
    label: 'Check reply',
    group: 'Composer',
    binding: { type: 'combo', key: 'e', meta: true, shift: true },
    allowWhileTyping: true,
  },
  {
    id: 'saveDraft',
    display: '⌘⇧D',
    label: 'Save draft',
    group: 'Composer',
    binding: { type: 'combo', key: 'd', meta: true, shift: true },
    allowWhileTyping: true,
  },
  {
    id: 'savedReplies',
    display: '⌘⇧S',
    label: 'Saved replies',
    group: 'Composer',
    binding: { type: 'combo', key: 's', meta: true, shift: true },
    allowWhileTyping: true,
  },
  {
    id: 'docsSearch',
    display: '⌘/',
    label: 'Search docs',
    group: 'Composer',
    binding: { type: 'combo', key: '/', meta: true },
    allowWhileTyping: true,
  },
  {
    id: 'showCc',
    display: '⌘⇧C',
    label: 'Show Cc',
    group: 'Composer',
    binding: { type: 'combo', key: 'c', meta: true, shift: true },
    allowWhileTyping: true,
  },
  {
    id: 'showBcc',
    display: '⌘⇧B',
    label: 'Show Bcc',
    group: 'Composer',
    binding: { type: 'combo', key: 'b', meta: true, shift: true },
    allowWhileTyping: true,
  },
  {
    id: 'discard',
    display: 'esc',
    label: 'Discard or close',
    group: 'Composer',
    binding: { type: 'single', key: 'Escape' },
    allowWhileTyping: true,
  },
] as const satisfies readonly ShortcutDef[]

/** Derived from the array, so a handler can only be registered for a shortcut that exists. */
export type ShortcutId = (typeof SHORTCUTS)[number]['id']

export type Shortcut = Omit<ShortcutDef, 'id'> & { id: ShortcutId }

/**
 * The same data, widened for iteration.
 *
 * `as const` gives a union of literal object types, and a member absent from one of them (most
 * entries have no `allowWhileTyping`) is not readable across the union. Consumers that loop want
 * the uniform shape; consumers that want the literal id union use `ShortcutId` above.
 */
export const SHORTCUT_LIST: readonly Shortcut[] = SHORTCUTS

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  'Global',
  'Conversation list',
  'Conversation',
  'Composer',
]

export function shortcutsInGroup(group: ShortcutGroup) {
  return SHORTCUT_LIST.filter((s) => s.group === group)
}

export function shortcutDisplay(id: ShortcutId): string {
  return SHORTCUT_LIST.find((s) => s.id === id)?.display ?? ''
}

/**
 * The one rule worth stating out loud, shown at the bottom of the cheat sheet.
 */
export const CMD_K_NOTE =
  'Cmd K opens the palette everywhere except inside the reply editor, where it inserts a link. The editor owns that binding, so the two never fight.'
