import { describe, expect, it, vi } from 'vitest'

import { EXTENSION_BRIDGE_CONNECTION_READY } from '@/core/reactDevtools/constants'
import { connectReactDevtoolsPort } from '@/chrome/background/reactDevtools/ports'

function makePort(name: string, tabId?: number) {
  const listeners: { message: Array<(msg: unknown) => void>; disconnect: Array<() => void> } = {
    message: [],
    disconnect: [],
  }
  return {
    name,
    sender: tabId != null ? { tab: { id: tabId } } : undefined,
    onMessage: {
      addListener: (fn: (msg: unknown) => void) => listeners.message.push(fn),
      removeListener: (fn: (msg: unknown) => void) => {
        listeners.message = listeners.message.filter((x) => x !== fn)
      },
    },
    onDisconnect: {
      addListener: (fn: () => void) => listeners.disconnect.push(fn),
      removeListener: (fn: () => void) => {
        listeners.disconnect = listeners.disconnect.filter((x) => x !== fn)
      },
    },
    postMessage: vi.fn(),
    disconnect: vi.fn(),
    _listeners: listeners,
  }
}

describe('connectReactDevtoolsPort', () => {
  it('ignores unrelated port names', () => {
    const port = makePort('interceptor-netlog')
    connectReactDevtoolsPort(port as unknown as chrome.runtime.Port)
    expect(port.onMessage.addListener).toBeDefined()
  })

  it('pipes extension and proxy and sends READY on proxy', () => {
    const proxy = makePort('proxy', 42)
    const extension = makePort('42')
    connectReactDevtoolsPort(proxy as unknown as chrome.runtime.Port)
    connectReactDevtoolsPort(extension as unknown as chrome.runtime.Port)
    expect(proxy.postMessage).toHaveBeenCalledWith({
      source: 'react-devtools-background',
      payload: { type: EXTENSION_BRIDGE_CONNECTION_READY },
    })
  })
})
