import { getInterceptorState, matchRules } from '@/core/interceptor'
import { createLogger } from '@/core/logging'

const logger = createLogger('interceptor-deep')

const attachedTabs = new Set<number>()

export async function attachDeepIntercept(tabId: number): Promise<string | null> {
  const state = await getInterceptorState()
  if (!state.settings.deepIntercept) {
    return 'Enable Deep intercept in HTTP Interceptor settings first'
  }
  if (attachedTabs.has(tabId)) return null
  try {
    await chrome.debugger.attach({ tabId }, '1.3')
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', {
      patterns: [{ urlPattern: '*' }],
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

export function registerDeepInterceptListener(): void {
  chrome.debugger.onEvent.addListener(async (source, method, params) => {
    if (method !== 'Fetch.requestPaused') return
    const tabId = source.tabId
    if (tabId == null || !attachedTabs.has(tabId)) return
    const paused = params as {
      requestId: string
      request: { url: string; method: string }
    }
    const state = await getInterceptorState()
    const matched = matchRules(state.rules, {
      url: paused.request.url,
      method: paused.request.method,
    })
    const delayRule = matched.find((r: { type: string }) => r.type === 'delay')
    if (delayRule?.type === 'delay' && delayRule.delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayRule.delayMs))
    }
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
        requestId: paused.requestId,
      })
    } catch (error) {
      logger.warn('continueRequest failed', error)
    }
  })

  chrome.debugger.onDetach.addListener((source) => {
    if (source.tabId != null) attachedTabs.delete(source.tabId)
  })
}
