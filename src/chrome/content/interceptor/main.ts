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
  if (!matchSource(url, rule.source)) return false
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
const queue: Array<() => void> = []

function flushQueue(): void {
  while (queue.length) queue.shift()?.()
}

function relay(kind: string, ruleId: string, url: string, method: string, extra: Record<string, unknown>) {
  window.postMessage(
    {
      [PAGE_MESSAGE_KEY]: { kind, ruleId, url, method, ...extra },
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
      if (rule.type === 'userAgent') applyUserAgent(rule)
      if (rule.type === 'modifyRequestBody' && body) {
        const fn = rule.payload.functionBody as string | undefined
        if (fn) {
          try {
            const runner = new Function('body', 'url', 'method', fn) as (
              b: string,
              u: string,
              m: string,
            ) => string
            body = runner(body, url, method)
          } catch {
            /* ignore */
          }
        } else if (rule.payload.body) body = String(rule.payload.body)
      }
      if (rule.type === 'delay') {
        const ms = Number(rule.payload.delayMs) || 0
        if (ms > 0) await new Promise((r) => setTimeout(r, ms))
      }
      if (rule.type === 'mockApi' || rule.type === 'mockGraphql') {
        const status = Number(rule.payload.status) || 200
        const responseBody = String(rule.payload.body ?? '')
        relay('mock', rule.id, url, method, { responseBody, status })
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
        relay('response', rule.id, url, method, { status })
        return new Response(response.body, { status, headers: response.headers })
      }
      if (rule.type === 'modifyResponse') {
        const text = await response.clone().text()
        let next = text
        const fn = rule.payload.functionBody as string | undefined
        if (fn) {
          try {
            const runner = new Function('body', 'url', 'method', fn) as (
              b: string,
              u: string,
              m: string,
            ) => string
            next = runner(text, url, method)
          } catch {
            next = text
          }
        } else if (rule.payload.body) next = String(rule.payload.body)
        const status = Number(rule.payload.status) || response.status
        relay('response', rule.id, url, method, { responseBody: next, status })
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
      relay('mock', mock.id, url, method, { responseBody, status })
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
  if (!data || data[PAGE_COMMAND_KEY] !== 'config') return
  rules = (data.config as PageInterceptorRule[]) ?? []
  flushQueue()
  if (data.showToast && rules.length) {
    const el = document.createElement('div')
    el.textContent = `HTTP Interceptor: ${rules.length} page rule(s) active`
    el.setAttribute(
      'style',
      'position:fixed;bottom:12px;right:12px;z-index:2147483647;padding:8px 12px;background:#1e293b;color:#fff;font:12px system-ui;border-radius:8px;opacity:0.9',
    )
    document.documentElement.appendChild(el)
    window.setTimeout(() => el.remove(), 4000)
  }
})
