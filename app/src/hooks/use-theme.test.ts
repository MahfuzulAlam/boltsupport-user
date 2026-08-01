import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initTheme, resolveInitialTheme, useTheme } from './use-theme'

function mockSystemPrefersDark(prefersDark: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: prefersDark,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
}

describe('theme resolution', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    delete document.documentElement.dataset['theme']
    mockSystemPrefersDark(false)
  })

  it('falls back to the system preference when nothing is stored', () => {
    mockSystemPrefersDark(true)
    expect(resolveInitialTheme()).toBe('dark')

    mockSystemPrefersDark(false)
    expect(resolveInitialTheme()).toBe('light')
  })

  it('prefers a stored choice over the system preference', () => {
    localStorage.setItem('boltsupport.theme', 'light')
    mockSystemPrefersDark(true)

    expect(resolveInitialTheme()).toBe('light')
  })

  it('ignores a corrupted stored value rather than throwing', () => {
    localStorage.setItem('boltsupport.theme', 'chartreuse')
    mockSystemPrefersDark(true)

    expect(resolveInitialTheme()).toBe('dark')
  })

  it('applies both the class and the data attribute, so prototype markup and shadcn agree', () => {
    mockSystemPrefersDark(true)
    initTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset['theme']).toBe('dark')
  })

  it('persists the choice on toggle and flips the applied theme', () => {
    useTheme.getState().setTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    useTheme.getState().toggleTheme()

    expect(useTheme.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('boltsupport.theme')).toBe('dark')
  })
})
