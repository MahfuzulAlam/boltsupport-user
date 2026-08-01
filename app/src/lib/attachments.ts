/**
 * Attachment validation (NFR-2.9, FR-3.8).
 *
 * Extension and MIME are checked independently, because either alone is trivially bypassed: a
 * `.exe` renamed to `.pdf` passes an extension check, and a browser will happily report whatever
 * MIME the OS guesses. Both have to look acceptable.
 */

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

/**
 * Extensions refused outright. Anything that a recipient's machine might execute, plus the
 * archive and script formats commonly used to smuggle those. Double extensions like
 * `invoice.pdf.exe` are caught because only the final one is considered.
 */
const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'cpl',
  'msi',
  'msp',
  'scr',
  'pif',
  'hta',
  'jar',
  'app',
  'dmg',
  'pkg',
  'deb',
  'rpm',
  'run',
  'bin',
  'js',
  'mjs',
  'cjs',
  'vbs',
  'vbe',
  'ws',
  'wsf',
  'wsh',
  'ps1',
  'psm1',
  'sh',
  'bash',
  'zsh',
  'dll',
  'sys',
  'drv',
  'lnk',
  'reg',
  'scf',
  'inf',
])

const BLOCKED_MIME_PATTERNS = [
  /^application\/x-(?:msdownload|dosexec|executable|sh|shellscript|msi)/i,
  /^application\/(?:x-)?javascript/i,
  /^application\/vnd\.microsoft\.portable-executable/i,
  /^text\/javascript/i,
  /^application\/x-apple-diskimage/i,
]

export type AttachmentRejection =
  | { reason: 'too-large'; message: string }
  | { reason: 'executable'; message: string }
  | { reason: 'empty'; message: string }

export type AttachmentCheck = { ok: true } | ({ ok: false } & AttachmentRejection)

function extensionOf(name: string): string {
  const parts = name.toLowerCase().split('.')
  return parts.length > 1 ? (parts[parts.length - 1] ?? '') : ''
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function checkAttachment(file: {
  name: string
  size: number
  type: string
}): AttachmentCheck {
  if (file.size === 0) {
    return {
      ok: false,
      reason: 'empty',
      message: `${file.name} is empty, so there is nothing to attach.`,
    }
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      reason: 'too-large',
      message: `${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_ATTACHMENT_BYTES)}.`,
    }
  }

  const extension = extensionOf(file.name)
  if (BLOCKED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      reason: 'executable',
      message: `${file.name} is a program, and those are never attached to a customer reply.`,
    }
  }

  if (file.type !== '' && BLOCKED_MIME_PATTERNS.some((pattern) => pattern.test(file.type))) {
    return {
      ok: false,
      reason: 'executable',
      message: `${file.name} looks like a program despite its name, so it was not attached.`,
    }
  }

  return { ok: true }
}
