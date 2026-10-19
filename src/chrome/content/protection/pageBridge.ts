import { PAGE_COMMAND_KEY, PAGE_MESSAGE_KEY } from '@/core/protection/constants'

export type PageSignalKind = 'lockdown' | 'clipboard' | 'notification'

/** Page-world guards cannot reach chrome.*; the isolated protection script relays this. */
export function signalIsolated(kind: PageSignalKind): void {
  try {
    window.postMessage({ [PAGE_MESSAGE_KEY]: kind }, window.location.origin || '*')
  } catch {
    /* opaque origin (sandboxed frame) */
  }
}

export function onIsolatedCommand(command: string, handler: () => void): void {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    const data = event.data as Record<string, unknown> | null
    if (data && typeof data === 'object' && data[PAGE_COMMAND_KEY] === command) handler()
  })
}

export function userActivationActive(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } })
    .userActivation
  return activation ? activation.isActive : false
}
