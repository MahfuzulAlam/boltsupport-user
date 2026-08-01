import { describe, expect, it } from 'vitest'
import { MAX_ATTACHMENT_BYTES, checkAttachment, formatBytes } from './attachments'

const file = (name: string, size = 1024, type = '') => ({ name, size, type })

describe('checkAttachment', () => {
  it('accepts the documents support agents actually send', () => {
    expect(checkAttachment(file('invoice.pdf', 200_000, 'application/pdf')).ok).toBe(true)
    expect(checkAttachment(file('screenshot.png', 80_000, 'image/png')).ok).toBe(true)
    expect(checkAttachment(file('export.csv', 4_000, 'text/csv')).ok).toBe(true)
    expect(checkAttachment(file('logs.zip', 900_000, 'application/zip')).ok).toBe(true)
  })

  it.each(['virus.exe', 'setup.msi', 'script.sh', 'macro.vbs', 'payload.js', 'installer.dmg'])(
    'refuses %s by extension',
    (name) => {
      const result = checkAttachment(file(name))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('executable')
    },
  )

  it('catches a double extension, where only the last one counts', () => {
    // invoice.pdf.exe reads as a PDF at a glance, which is the entire point of the trick.
    expect(checkAttachment(file('invoice.pdf.exe')).ok).toBe(false)
  })

  it('catches an executable renamed to look harmless', () => {
    // The extension check passes here; only the MIME gives it away.
    const result = checkAttachment(file('report.pdf', 5000, 'application/x-msdownload'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('executable')
  })

  it('is not fooled by capitalisation', () => {
    expect(checkAttachment(file('VIRUS.EXE')).ok).toBe(false)
  })

  it('refuses anything over the size cap and says by how much', () => {
    const result = checkAttachment(file('huge.pdf', MAX_ATTACHMENT_BYTES + 1, 'application/pdf'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('too-large')
      expect(result.message).toContain('25.0 MB')
    }
  })

  it('accepts a file exactly at the cap', () => {
    expect(checkAttachment(file('big.pdf', MAX_ATTACHMENT_BYTES, 'application/pdf')).ok).toBe(true)
  })

  it('refuses an empty file rather than attaching nothing', () => {
    const result = checkAttachment(file('empty.pdf', 0, 'application/pdf'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('empty')
  })

  it('accepts a file with no MIME at all, judging it on its extension', () => {
    // Browsers routinely report an empty type for uncommon formats.
    expect(checkAttachment(file('notes.txt', 100, '')).ok).toBe(true)
    expect(checkAttachment(file('thing.exe', 100, '')).ok).toBe(false)
  })
})

describe('formatBytes', () => {
  it('picks a readable unit', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
