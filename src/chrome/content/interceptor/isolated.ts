import { INTERCEPTOR_PAGE_CONFIG_KEY, PAGE_COMMAND_KEY, PAGE_MESSAGE_KEY } from '@/core/interceptor/constants'
import type { PageInterceptorRule } from '@/core/interceptor/types'

function loadConfig(): PageInterceptorRule[] {
  return []
}

let config: PageInterceptorRule[] = loadConfig()
let showToast = false

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'INTERCEPTOR_CONFIG') {
    config = message.config as PageInterceptorRule[]
    showToast = Boolean(message.showToast)
    window.postMessage(
      { [PAGE_COMMAND_KEY]: 'config', config, showToast },
      window.location.origin || '*',
    )
  }
})

void chrome.storage.session.get(INTERCEPTOR_PAGE_CONFIG_KEY).then((session) => {
  const stored = session[INTERCEPTOR_PAGE_CONFIG_KEY] as PageInterceptorRule[] | undefined
  if (stored?.length) {
    config = stored
    window.postMessage(
      { [PAGE_COMMAND_KEY]: 'config', config, showToast },
      window.location.origin || '*',
    )
  }
})

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  const data = event.data as Record<string, unknown> | null
  if (!data || typeof data !== 'object' || !data[PAGE_MESSAGE_KEY]) return
  const payload = data[PAGE_MESSAGE_KEY] as Record<string, unknown>
  void chrome.runtime.sendMessage({
    type: 'INTERCEPTOR_PAGE_EVENT',
    event: payload,
  })
})
