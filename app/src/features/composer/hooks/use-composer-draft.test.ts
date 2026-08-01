import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useComposerDraft } from './use-composer-draft'

const key = (id: string) => `boltsupport.draft.${id}`

describe('draft persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('writes every change, so a reload cannot lose a half written reply', () => {
    const { result } = renderHook(() => useComposerDraft('c1'))

    act(() => {
      result.current.update({ html: '<p>Half written</p>' })
    })

    expect(localStorage.getItem(key('c1'))).toContain('Half written')
  })

  it('restores what was there on the next mount', () => {
    const first = renderHook(() => useComposerDraft('c1'))
    act(() => {
      first.result.current.update({ html: '<p>Still here</p>' })
    })
    first.unmount()

    const second = renderHook(() => useComposerDraft('c1'))
    expect(second.result.current.draft.html).toBe('<p>Still here</p>')
  })

  it('keeps each conversation to its own draft', () => {
    const one = renderHook(() => useComposerDraft('c1'))
    act(() => {
      one.result.current.update({ html: '<p>For Maya</p>' })
    })

    const two = renderHook(() => useComposerDraft('c2'))
    expect(two.result.current.draft.html).toBe('')
    expect(localStorage.getItem(key('c2'))).toBeNull()
  })

  it('remembers the mode, so a note does not silently become a reply', () => {
    const first = renderHook(() => useComposerDraft('c1'))
    act(() => {
      first.result.current.update({ mode: 'note', html: '<p>internal</p>' })
    })
    first.unmount()

    const second = renderHook(() => useComposerDraft('c1'))
    expect(second.result.current.draft.mode).toBe('note')
  })

  it('treats markup with no text as empty, so Send stays disabled', () => {
    const { result } = renderHook(() => useComposerDraft('c1'))

    act(() => {
      result.current.update({ html: '<p></p>' })
    })
    expect(result.current.isDirty).toBe(false)

    act(() => {
      result.current.update({ html: '<p>   </p>' })
    })
    expect(result.current.isDirty).toBe(false)

    act(() => {
      result.current.update({ html: '<p>real words</p>' })
    })
    expect(result.current.isDirty).toBe(true)
  })

  it('clears storage on send', () => {
    const { result } = renderHook(() => useComposerDraft('c1'))
    act(() => {
      result.current.update({ html: '<p>sent</p>' })
    })
    act(() => {
      result.current.clear()
    })

    expect(localStorage.getItem(key('c1'))).toBeNull()
    expect(result.current.draft.html).toBe('')
  })

  it('survives a corrupted stored value rather than blocking the reply', () => {
    localStorage.setItem(key('c1'), 'not json at all')
    const { result } = renderHook(() => useComposerDraft('c1'))

    expect(result.current.draft.html).toBe('')
    expect(result.current.draft.mode).toBe('reply')
  })
})
