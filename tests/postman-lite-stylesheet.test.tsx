import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('postman-lite/style.css?inline', () => ({
  default: '*{border-color:hsl(var(--border))}',
}))

import { usePostmanLiteStylesheet } from '@/features/api-client/usePostmanLiteStylesheet'

const sheets = () => document.head.querySelectorAll('style[data-browser-toolbox="postman-lite"]')

afterEach(() => cleanup())

describe('usePostmanLiteStylesheet', () => {
  it('attaches the postman-lite sheet only while the API client is mounted', () => {
    expect(sheets()).toHaveLength(0)

    const { unmount } = renderHook(() => usePostmanLiteStylesheet())
    expect(sheets()).toHaveLength(1)
    expect(sheets()[0]?.textContent).toContain('hsl(var(--border))')

    unmount()
    expect(sheets()).toHaveLength(0)
  })

  it('keeps one shared sheet until the last instance unmounts', () => {
    const first = renderHook(() => usePostmanLiteStylesheet())
    const second = renderHook(() => usePostmanLiteStylesheet())
    expect(sheets()).toHaveLength(1)

    first.unmount()
    expect(sheets()).toHaveLength(1)

    second.unmount()
    expect(sheets()).toHaveLength(0)
  })
})
