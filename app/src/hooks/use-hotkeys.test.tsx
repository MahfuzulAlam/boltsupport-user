import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import { useHotkeys } from './use-hotkeys'
import { SHORTCUT_LIST } from '@/lib/shortcuts'

interface KeyOptions {
  meta?: boolean
  shift?: boolean
  target?: HTMLElement
}

function press(
  key: string,
  { meta = false, shift = false, target }: KeyOptions = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    metaKey: meta,
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  })
  ;(target ?? document.body).dispatchEvent(event)
  return event
}

describe('useHotkeys', () => {
  it('fires a single key binding', () => {
    const help = vi.fn()
    renderHook(() => {
      useHotkeys({ help })
    })

    press('?')

    expect(help).toHaveBeenCalledOnce()
  })

  it('ignores single keys while typing, so letters reach the field', () => {
    const compose = vi.fn()
    renderHook(() => {
      useHotkeys({ compose })
    })
    const { container } = render(<input aria-label="Subject" />)
    const input = container.querySelector('input')

    press('c', { target: input ?? undefined })

    expect(compose).not.toHaveBeenCalled()
  })

  it('still fires Escape while typing, because discard has to work mid edit', () => {
    const discard = vi.fn()
    renderHook(() => {
      useHotkeys({ discard })
    })
    const { container } = render(<input aria-label="Subject" />)

    press('Escape', { target: container.querySelector('input') ?? undefined })

    expect(discard).toHaveBeenCalledOnce()
  })

  it('leaves Escape unprevented so overlays can still dismiss themselves', () => {
    const discard = vi.fn()
    renderHook(() => {
      useHotkeys({ discard })
    })

    const event = press('Escape')

    // Radix and every other dismissable layer bail out when the event is already prevented,
    // which made dialogs impossible to close from the keyboard.
    expect(discard).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(false)
  })

  it('does prevent default for bindings it fully owns', () => {
    renderHook(() => {
      useHotkeys({ help: vi.fn() })
    })

    expect(press('?').defaultPrevented).toBe(true)
  })

  it('fires Cmd+Enter while typing, because send has to work from the editor', () => {
    const send = vi.fn()
    renderHook(() => {
      useHotkeys({ send })
    })
    const { container } = render(<textarea aria-label="Reply" />)

    press('Enter', { meta: true, target: container.querySelector('textarea') ?? undefined })

    expect(send).toHaveBeenCalledOnce()
  })

  it('opens the palette with Cmd+K outside an editor', () => {
    const palette = vi.fn()
    renderHook(() => {
      useHotkeys({ palette })
    })

    press('k', { meta: true })

    expect(palette).toHaveBeenCalledOnce()
  })

  it('cedes Cmd+K to the editor, so the two bindings never fight', () => {
    const palette = vi.fn()
    renderHook(() => {
      useHotkeys({ palette })
    })
    const { container } = render(<textarea aria-label="Reply" />)

    press('k', { meta: true, target: container.querySelector('textarea') ?? undefined })

    expect(palette).not.toHaveBeenCalled()
  })

  it('runs a chord: G then I', () => {
    const goInboxes = vi.fn()
    const goDocs = vi.fn()
    renderHook(() => {
      useHotkeys({ goInboxes, goDocs })
    })

    press('g')
    press('i')

    expect(goInboxes).toHaveBeenCalledOnce()
    expect(goDocs).not.toHaveBeenCalled()
  })

  it('forgets the lead key once the chord window closes', () => {
    vi.useFakeTimers()
    const goInboxes = vi.fn()
    renderHook(() => {
      useHotkeys({ goInboxes })
    })

    press('g')
    vi.advanceTimersByTime(1500)
    press('i')

    expect(goInboxes).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('does not swallow a key that only leads chords nobody is listening for', () => {
    const remove = vi.fn()
    // `g` leads chords, but with no chord handlers registered it must not arm and eat the
    // next key.
    renderHook(() => {
      useHotkeys({ remove })
    })

    press('g')
    press('d')

    expect(remove).toHaveBeenCalledOnce()
  })
})

describe('the shortcut map', () => {
  it('has no duplicate ids', () => {
    const ids = SHORTCUT_LIST.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every shortcut a display string, since the cheat sheet renders from this array', () => {
    for (const shortcut of SHORTCUT_LIST) {
      expect(shortcut.display.length).toBeGreaterThan(0)
      expect(shortcut.label.length).toBeGreaterThan(0)
    }
  })

  it('never binds the same combo twice', () => {
    const combos = SHORTCUT_LIST.filter((s) => s.binding.type === 'combo').map((s) =>
      s.binding.type === 'combo'
        ? `${s.binding.key}|${String(s.binding.meta ?? false)}|${String(s.binding.shift ?? false)}`
        : '',
    )
    expect(new Set(combos).size).toBe(combos.length)
  })
})
