import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('message router', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('responds with ok:false when a handler throws synchronously', async () => {
    const listeners: Array<(raw: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean> =
      []
    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: {
          addListener: (fn: (typeof listeners)[number]) => listeners.push(fn),
        },
      },
    })

    const { registerMessageHandler, startMessageRouter } = await import('@/core/messaging/messageService')
    registerMessageHandler('NETMON_GET_REALTIME', () => {
      throw new Error('sync boom')
    })
    startMessageRouter()

    const sendResponse = vi.fn()
    const handled = listeners[0]!({ type: 'NETMON_GET_REALTIME' }, {}, sendResponse)
    expect(handled).toBe(true)
    await new Promise((r) => setTimeout(r, 0))
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: 'sync boom' })
  })

  it('warns when registering the same message type twice', async () => {
    const { registerMessageHandler } = await import('@/core/messaging/messageService')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    registerMessageHandler('PIP_TOGGLE', () => ({ action: 'none' }))
    registerMessageHandler('PIP_TOGGLE', () => ({ action: 'none' }))
    expect(warn.mock.calls.some((c) => String(c[1]).includes('duplicate'))).toBe(true)
    warn.mockRestore()
  })
})
