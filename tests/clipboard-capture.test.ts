import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { addClipboardEntry, readClipboardText } from '@/core/clipboard'
import { readCopySelection } from '@/core/clipboard/readCopySelection'
import { useClipboardWatcher } from '@/shared/hooks/useClipboardWatcher'

vi.mock('@/core/clipboard', async () => {
  const actual = await vi.importActual<typeof import('@/core/clipboard')>('@/core/clipboard')
  return {
    ...actual,
    addClipboardEntry: vi.fn(async () => undefined),
    readClipboardText: vi.fn(async () => 'stale clipboard'),
  }
})

function select(text: string) {
  document.body.innerHTML = `<p id="clip">${text}</p>`
  const node = document.getElementById('clip')?.firstChild
  if (!node) throw new Error('missing text node')
  const range = document.createRange()
  range.selectNodeContents(node)
  const selection = document.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

afterEach(() => {
  document.body.innerHTML = ''
  document.getSelection()?.removeAllRanges()
  vi.clearAllMocks()
})

describe('readCopySelection', () => {
  it('reads the selected text and skips password fields', () => {
    select('copied just now')
    expect(readCopySelection(document)).toBe('copied just now')

    const password = document.createElement('input')
    password.type = 'password'
    password.value = 'secret-value'
    document.body.appendChild(password)
    password.focus()
    password.setSelectionRange(0, password.value.length)
    expect(readCopySelection(document)).toBe('')
  })
})

describe('useClipboardWatcher', () => {
  it('records a copy from the selection and never polls the clipboard', () => {
    renderHook(() => useClipboardWatcher())
    select('lands immediately')

    document.dispatchEvent(new Event('copy'))

    expect(addClipboardEntry).toHaveBeenCalledWith('lands immediately')
    expect(readClipboardText).not.toHaveBeenCalled()
  })
})
