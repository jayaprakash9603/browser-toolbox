import { INTERCEPTOR_PAGE_CONFIG_KEY, PAGE_COMMAND_KEY, PAGE_MESSAGE_KEY } from '@/core/interceptor/constants'
import type { PageInterceptorRule } from '@/core/interceptor/types'

function loadConfig(): PageInterceptorRule[] {
  return []
}

let config: PageInterceptorRule[] = loadConfig()
let showToast = false

const TOAST_STACK = 'tbx-interceptor-toasts'

function toastActionLabel(kind: string, ruleType: string): string {
  if (kind === 'blocked') return 'Request blocked'
  if (kind === 'redirected') return 'Request redirected'
  if (kind === 'mock') return 'Mocked response'
  if (kind === 'response') return 'Response modified'
  if (kind === 'request') return 'Request modified'
  if (kind === 'delay') return 'Request delayed'
  if (ruleType === 'cancel') return 'Request blocked'
  return 'Rule applied'
}

function showRuleToast(payload: {
  ruleName?: string
  ruleType?: string
  kind?: string
  url: string
}): void {
  if (!showToast) return
  let stack = document.getElementById(TOAST_STACK)
  if (!stack) {
    stack = document.createElement('div')
    stack.id = TOAST_STACK
    stack.setAttribute(
      'style',
      'position:fixed;bottom:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;max-width:min(360px,calc(100vw - 32px));pointer-events:none',
    )
    document.documentElement.appendChild(stack)
  }
  const kind = payload.kind ?? 'matched'
  const ruleType = payload.ruleType ?? ''
  const accent = kind === 'blocked' || ruleType === 'cancel' ? '#ef4444' : '#3b82f6'
  const card = document.createElement('div')
  const short = payload.url.length > 56 ? `${payload.url.slice(0, 53)}…` : payload.url
  card.setAttribute(
    'style',
    `pointer-events:auto;padding:10px 12px;background:#0f172a;color:#f8fafc;font:12px/1.4 system-ui,sans-serif;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35);border-left:4px solid ${accent}`,
  )
  const title = toastActionLabel(kind, ruleType)
  const name = payload.ruleName || ruleType || 'Interceptor rule'
  card.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${accent}">Rule applied</span></div><div style="font-weight:600">${title}</div><div style="opacity:.9">${name}</div><div style="opacity:.65;margin-top:4px;word-break:break-all">${short}</div>`
  stack.appendChild(card)
  window.setTimeout(() => card.remove(), 4500)
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'INTERCEPTOR_CONFIG') {
    config = message.config as PageInterceptorRule[]
    showToast = Boolean(message.showToast)
    window.postMessage(
      { [PAGE_COMMAND_KEY]: 'config', config, showToast },
      window.location.origin || '*',
    )
  }
  if (message?.type === 'INTERCEPTOR_RULE_TOAST' && message.url) {
    showRuleToast({
      ruleName: message.ruleName as string | undefined,
      ruleType: message.ruleType as string | undefined,
      kind: message.kind as string | undefined,
      url: String(message.url),
    })
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
