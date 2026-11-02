import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FormActionResult } from '@/core/form-memory/model'
import { sendMessage } from '@/core/messaging'
import { useFormPage } from '@/tools/productivity/form-autofill/useFormPage'

vi.mock('@/core/messaging', () => ({ sendMessage: vi.fn() }))

const sendMessageMock = vi.mocked(sendMessage)

function inspectionResult(total: number): FormActionResult {
  return {
    ok: true,
    filled: 0,
    cleared: 0,
    total,
    populated: 0,
    matched: 0,
    saved: 0,
    shared: 0,
    review: 0,
    learn: true,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('chrome', { tabs: {} })
  sendMessageMock.mockReset()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useFormPage polling', () => {
  it('stops polling after an inspection finds no fields but keeps manual refresh available', async () => {
    sendMessageMock.mockResolvedValue(inspectionResult(0))
    const { result } = renderHook(() => useFormPage(true, true, 'page-1'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_500)
    })

    expect(sendMessageMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refresh()
    })

    expect(sendMessageMock).toHaveBeenCalledTimes(2)
  })

  it('continues polling while detected fields are present', async () => {
    sendMessageMock.mockResolvedValue(inspectionResult(1))
    renderHook(() => useFormPage(true, true, 'page-1'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500)
    })

    expect(sendMessageMock).toHaveBeenCalledTimes(2)
  })
})