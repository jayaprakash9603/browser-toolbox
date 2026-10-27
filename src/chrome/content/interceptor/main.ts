import { PAGE_COMMAND_KEY, PAGE_MESSAGE_KEY, USER_AGENT_PRESETS } from '@/core/interceptor/constants'
import type { PageInterceptorRule, SourceCondition } from '@/core/interceptor/types'

function matchSource(url: string, source: SourceCondition): boolean {
  try {
    const parsed = new URL(url)
    const hay =
      source.field === 'host'
        ? parsed.host
        : source.field === 'path'
          ? `${parsed.pathname}${parsed.search}`
          : url
    const needle = source.value
    if (!needle) return false
    switch (source.operator) {
      case 'equals':
        return hay.toLowerCase() === needle.toLowerCase()
      case 'contains':
        return hay.toLowerCase().includes(needle.toLowerCase())
      case 'wildcard': {
        const escaped = needle.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
        return new RegExp(`^${escaped}$`, 'i').test(hay)
      }
      case 'regex':
        return new RegExp(needle, 'i').test(hay)
      default:
        return false
    }
  } catch {
    return false
  }
}

function matchRule(rule: PageInterceptorRule, url: string, method: string, body?: string): boolean {
  if (!rule.sources.some((s) => matchSource(url, s))) return false
  const f = rule.filters
  if (
    f?.methods?.length &&
    !f.methods.map((m: string) => m.toUpperCase()).includes(method.toUpperCase())
  ) {
    return false
  }
  if (f?.payloadKey && body) {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>
      if (f.payloadValue && String(parsed[f.payloadKey]) !== f.payloadValue) return false
    } catch {
      if (!body.includes(f.payloadKey)) return false
    }
  }
  if (rule.type === 'mockGraphql') {
    const op = rule.payload.operationName as string | undefined
    const q = rule.payload.queryContains as string | undefined
    if (body) {
      try {
        const gql = JSON.parse(body) as { operationName?: string; query?: string }
        if (op && gql.operationName !== op) return false
        if (q && !(gql.query ?? '').includes(q)) return false
      } catch {
        return false
      }
    }
  }
  return true
}

let rules: PageInterceptorRule[] = []
let showToast = false
const queue: Array<() => void> = []
const TOAST_STACK = 'tbx-interceptor-toasts'

function flushQueue(): void {
  while (queue.length) queue.shift()?.()
}

function actionLabel(kind: string, ruleType: string): string {
  if (kind === 'mock') return 'Mocked response'
  if (kind === 'response') return 'Response modified'
  if (kind === 'request') return 'Request modified'
  if (kind === 'delay') return 'Request delayed'
  if (kind === 'userAgent') return 'User-Agent changed'
  if (kind === 'blocked' || ruleType === 'cancel') return 'Request blocked'
  return 'Rule applied'
}

function showRuleToastPayload(
  url: string,
  kind: string,
  ruleName: string,
  ruleType: string,
): void {
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
  const card = document.createElement('div')
  const short = url.length > 56 ? `${url.slice(0, 53)}…` : url
  const accent = kind === 'blocked' || ruleType === 'cancel' ? '#ef4444' : '#3b82f6'
  card.setAttribute(
    'style',
    `pointer-events:auto;padding:10px 12px;background:#0f172a;color:#f8fafc;font:12px/1.4 system-ui,sans-serif;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35);border-left:4px solid ${accent}`,
  )
  const title = actionLabel(kind, ruleType)
  card.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${accent}">Rule applied</span></div><div style="font-weight:600">${title}</div><div style="opacity:.9">${ruleName || ruleType}</div><div style="opacity:.65;margin-top:4px;word-break:break-all">${short}</div>`
  stack.appendChild(card)
  window.setTimeout(() => card.remove(), 4500)
}

function showRuleToast(rule: PageInterceptorRule, kind: string, url: string): void {
  showRuleToastPayload(url, kind, rule.name || rule.type, rule.type)
}

function relay(kind: string, rule: PageInterceptorRule, url: string, method: string, extra: Record<string, unknown>) {
  showRuleToast(rule, kind, url)
  window.postMessage(
    {
      [PAGE_MESSAGE_KEY]: {
        kind,
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type,
        url,
        method,
        ...extra,
      },
    },
    window.location.origin || '*',
  )
}

function applyUserAgent(rule: PageInterceptorRule): void {
  const preset = rule.payload.preset as string | undefined
  const custom = rule.payload.customValue as string | undefined
  const ua =
    preset && preset !== 'custom' && preset in USER_AGENT_PRESETS
      ? USER_AGENT_PRESETS[preset]
      : custom
  if (!ua) return
  try {
    Object.defineProperty(navigator, 'userAgent', { get: () => ua, configurable: true })
  } catch {
    /* ignore */
  }
}

function installFetch(): void {
  const native = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    let body = init?.body ? String(init.body) : undefined

    const matched = [...rules]
      .filter((r) => matchRule(r, url, method, body))
      .sort((a, b) => b.priority - a.priority)

    for (const rule of matched) {
      if (rule.type === 'userAgent') {
        applyUserAgent(rule)
        relay('userAgent', rule, url, method, {})
      }
      if (rule.type === 'modifyRequestBody' && body) {
        if (rule.payload.body) body = String(rule.payload.body)
        relay('request', rule, url, method, { requestBody: body })
      }
      if (rule.type === 'delay') {
        const ms = Number(rule.payload.delayMs) || 0
        if (ms > 0) {
          relay('delay', rule, url, method, { delayMs: ms })
          await new Promise((r) => setTimeout(r, ms))
        }
      }
      if (rule.type === 'mockApi' || rule.type === 'mockGraphql') {
        const status = Number(rule.payload.status) || 200
        const responseBody = String(rule.payload.body ?? '')
        relay('mock', rule, url, method, { responseBody, status })
        return new Response(responseBody, {
          status,
          headers: { 'Content-Type': String(rule.payload.contentType ?? 'application/json') },
        })
      }
    }

    const response = await native(input, init)
    for (const rule of matched) {
      if (rule.type === 'statusCode') {
        const status = Number(rule.payload.status) || response.status
        relay('response', rule, url, method, { status })
        return new Response(response.body, { status, headers: response.headers })
      }
      if (rule.type === 'modifyResponse') {
        let next = await response.clone().text()
        if (rule.payload.body) next = String(rule.payload.body)
        const status = Number(rule.payload.status) || response.status
        relay('response', rule, url, method, { responseBody: next, status })
        return new Response(next, { status, headers: response.headers })
      }
    }
    return response
  }
}

function installXhr(): void {
  const XHR = XMLHttpRequest
  const open = XHR.prototype.open
  const send = XHR.prototype.send

  XHR.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    ;(this as XMLHttpRequest & { __tbxUrl?: string; __tbxMethod?: string }).__tbxUrl =
      typeof url === 'string' ? url : url.href
    ;(this as XMLHttpRequest & { __tbxMethod?: string }).__tbxMethod = method
    return (open as (this: XMLHttpRequest, ...args: unknown[]) => void).apply(this, [
      method,
      url,
      ...rest,
    ])
  }

  XHR.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const url = (this as XMLHttpRequest & { __tbxUrl?: string }).__tbxUrl ?? ''
    const method = (this as XMLHttpRequest & { __tbxMethod?: string }).__tbxMethod ?? 'GET'
    const bodyStr = body ? String(body) : undefined
    const matched = [...rules]
      .filter((r) => matchRule(r, url, method, bodyStr))
      .sort((a, b) => b.priority - a.priority)

    const mock = matched.find((r) => r.type === 'mockApi' || r.type === 'mockGraphql')
    if (mock) {
      const status = Number(mock.payload.status) || 200
      const responseBody = String(mock.payload.body ?? '')
      Object.defineProperty(this, 'readyState', { value: 4 })
      Object.defineProperty(this, 'status', { value: status })
      Object.defineProperty(this, 'responseText', { value: responseBody })
      Object.defineProperty(this, 'response', { value: responseBody })
      relay('mock', mock, url, method, { responseBody, status })
      this.dispatchEvent(new Event('readystatechange'))
      this.dispatchEvent(new Event('load'))
      return
    }
    return send.call(this, body)
  }
}

installFetch()
installXhr()

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  const data = event.data as Record<string, unknown> | null
  if (!data || typeof data[PAGE_COMMAND_KEY] !== 'string') return
  if (data[PAGE_COMMAND_KEY] === 'toast') {
    const p = data.payload as { ruleName?: string; ruleType?: string; kind?: string; url: string }
    if (p?.url) showRuleToastPayload(p.url, p.kind ?? 'matched', p.ruleName ?? '', p.ruleType ?? '')
    return
  }
  if (data[PAGE_COMMAND_KEY] !== 'config') return
  rules = (data.config as PageInterceptorRule[]) ?? []
  showToast = Boolean(data.showToast)
  flushQueue()
  if (showToast && rules.length) {
    const boot = document.createElement('div')
    boot.textContent = `HTTP Interceptor enabled · ${rules.length} page rule(s) active`
    boot.setAttribute(
      'style',
      'position:fixed;bottom:16px;right:16px;z-index:2147483646;padding:8px 12px;background:#1e293b;color:#fff;font:12px system-ui;border-radius:8px;opacity:0.92',
    )
    document.documentElement.appendChild(boot)
    window.setTimeout(() => boot.remove(), 3500)
  }
})
