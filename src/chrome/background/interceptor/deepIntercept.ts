import { getInterceptorState, matchRules, type InterceptorRule } from '@/core/interceptor'
import { createLogger } from '@/core/logging'

import { incrementTabRuleCount } from './badge'

const logger = createLogger('interceptor-deep')

const attachedTabs = new Set<number>()

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function libraryContent(rule: InterceptorRule, library: { id: string; content: string }[]): string | undefined {
  if (!('bodySource' in rule)) return undefined
  if (rule.bodySource === 'library' && 'libraryId' in rule && rule.libraryId) {
    return library.find((i) => i.id === rule.libraryId)?.content
  }
  return 'body' in rule ? rule.body : undefined
}

export async function attachDeepIntercept(tabId: number): Promise<string | null> {
  const state = await getInterceptorState()
  if (!state.settings.deepIntercept) {
    return 'Enable "Deep intercept" in the HTTP Interceptor Settings tab first'
  }
  if (attachedTabs.has(tabId)) return null
  try {
    await chrome.permissions.contains({ permissions: ['debugger'] }).then(async (has) => {
      if (!has) throw new Error('Grant the debugger permission from the Settings tab first')
    })
    await chrome.debugger.attach({ tabId }, '1.3')
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', {
      patterns: [{ urlPattern: '*', requestStage: 'Response' }],
    })
    attachedTabs.add(tabId)
    return null
  } catch (error) {
    logger.warn('debugger attach failed', error)
    return error instanceof Error ? error.message : 'Debugger attach failed'
  }
}

export async function detachDeepIntercept(tabId: number): Promise<void> {
  if (!attachedTabs.has(tabId)) return
  try {
    await chrome.debugger.detach({ tabId })
  } catch {
    /* already detached */
  }
  attachedTabs.delete(tabId)
}

interface Paused {
  requestId: string
  request: { url: string; method: string; postData?: string }
  responseStatusCode?: number
  responseHeaders?: { name: string; value: string }[]
}

async function handlePaused(tabId: number, paused: Paused): Promise<void> {
  const target = { tabId }
  const send = (method: string, params: Record<string, unknown>) =>
    chrome.debugger.sendCommand(target, method, params) as unknown as Promise<unknown>
  try {
    const state = await getInterceptorState()
    const matched = state.settings.paused
      ? []
      : matchRules(state.rules, {
          url: paused.request.url,
          method: paused.request.method,
          requestBody: paused.request.postData,
        })

    const delay = matched.find((r) => r.type === 'delay')
    if (delay?.type === 'delay' && delay.delayMs > 0) {
      await new Promise((r) => setTimeout(r, delay.delayMs))
      incrementTabRuleCount(tabId)
    }

    const mock = matched.find((r) => r.type === 'mockApi' || r.type === 'mockGraphql')
    const modify = matched.find((r) => r.type === 'modifyResponse')
    const statusRule = matched.find((r) => r.type === 'statusCode')

    if (!mock && !modify && !statusRule) {
      await send('Fetch.continueRequest', { requestId: paused.requestId })
      return
    }

    let status = paused.responseStatusCode ?? 200
    let headers = paused.responseHeaders ?? []
    let body: string | undefined

    if (mock && (mock.type === 'mockApi' || mock.type === 'mockGraphql')) {
      status = mock.status
      body = libraryContent(mock, state.library) ?? ''
      const contentType = mock.type === 'mockApi' ? (mock.contentType ?? 'application/json') : 'application/json'
      headers = [
        ...headers.filter((h) => !/^content-(type|length|encoding)$/i.test(h.name)),
        { name: 'Content-Type', value: contentType },
      ]
    } else {
      if (modify?.type === 'modifyResponse') {
        const next = libraryContent(modify, state.library)
        if (modify.status) status = modify.status
        if (next !== undefined) body = next
      }
      if (statusRule?.type === 'statusCode') status = statusRule.status
      if (body !== undefined) {
        headers = headers.filter((h) => !/^content-(length|encoding)$/i.test(h.name))
      }
    }

    if (body === undefined) {
      const original = (await send('Fetch.getResponseBody', { requestId: paused.requestId })) as {
        body: string
        base64Encoded: boolean
      }
      body = original.base64Encoded ? undefined : original.body
      await send('Fetch.fulfillRequest', {
        requestId: paused.requestId,
        responseCode: status,
        responseHeaders: headers,
        body: original.base64Encoded ? original.body : toBase64(body ?? ''),
      })
    } else {
      await send('Fetch.fulfillRequest', {
        requestId: paused.requestId,
        responseCode: status,
        responseHeaders: headers,
        body: toBase64(body),
      })
    }
    incrementTabRuleCount(tabId)
  } catch (error) {
    logger.warn('deep intercept failed', error)
    try {
      await send('Fetch.continueRequest', { requestId: paused.requestId })
    } catch {
      /* request already handled */
    }
  }
}

export function registerDeepInterceptListener(): void {
  chrome.debugger.onEvent.addListener((source, method, params) => {
    if (method !== 'Fetch.requestPaused') return
    const tabId = source.tabId
    if (tabId == null || !attachedTabs.has(tabId)) return
    void handlePaused(tabId, params as Paused)
  })

  chrome.debugger.onDetach.addListener((source) => {
    if (source.tabId != null) attachedTabs.delete(source.tabId)
  })
}
