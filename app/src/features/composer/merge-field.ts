import { Node, mergeAttributes } from '@tiptap/core'

/**
 * A merge field, rendered as a chip (FR-3.4).
 *
 * An atom node rather than plain text: the fallback syntax
 * `{%customer.firstName,fallback=there%}` is fiddly to type and trivial to break by editing a
 * character out of the middle, and a half-deleted merge field ships to a customer as literal
 * punctuation. Making it a single indivisible token means it is either there or it is not.
 */
export interface MergeFieldOptions {
  HTMLAttributes: Record<string, string>
}

export const MERGE_FIELDS = [
  { token: 'customer.firstName', fallback: 'there', label: 'Customer first name' },
  { token: 'customer.lastName', fallback: '', label: 'Customer last name' },
  { token: 'customer.email', fallback: '', label: 'Customer email' },
  { token: 'agent.firstName', fallback: '', label: 'Your first name' },
  { token: 'inbox.name', fallback: 'Support', label: 'Inbox name' },
] as const

export function mergeFieldSyntax(token: string, fallback: string): string {
  return fallback === '' ? `{%${token}%}` : `{%${token},fallback=${fallback}%}`
}

export const MergeField = Node.create<MergeFieldOptions>({
  name: 'mergeField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      token: { default: '' },
      fallback: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-merge-field]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const token = String(node.attrs['token'])
    const fallback = String(node.attrs['fallback'])
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-merge-field': token,
        'data-fallback': fallback,
        class: 'merge-field',
        title: mergeFieldSyntax(token, fallback),
      }),
      token,
    ]
  },

  renderText({ node }) {
    // What actually goes on the wire, so the server sees the documented syntax.
    return mergeFieldSyntax(String(node.attrs['token']), String(node.attrs['fallback']))
  },
})
