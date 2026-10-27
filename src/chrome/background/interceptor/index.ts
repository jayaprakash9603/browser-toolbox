import { STORAGE_KEYS } from '@/core/constants'
import {
  getInterceptorState,
  testRulesAgainstUrl,
  type InterceptorPageEvent,
} from '@/core/interceptor'
import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import type { ExtensionMessage } from '@/core/messaging/types'

import { clearTabBadge, incrementTabRuleCount } from './badge'
import { syncInterceptorContentScripts } from './contentScripts'
import { attachDeepIntercept, detachDeepIntercept, registerDeepInterceptListener } from './deepIntercept'
import { syncInterceptorDnrRules } from './dnr'
import {
  clearLog,
  connectNetlogPort,
  getLogForTab,
  initNetworkLog,
  invalidateCachedInterceptorState,
  mergePageEvent,
  refreshLogSize,
  updateNetlogListeners,
} from './networkLog'
import { syncInterceptorUserScripts } from './userScripts'

const logger = createLogger('interceptor')

async function fullSync(): Promise<void> {
  const state = await getInterceptorState()
  const errors = await syncInterceptorDnrRules()
  if (errors.length) logger.warn('DNR compile', errors)
  await syncInterceptorContentScripts(state)
  await syncInterceptorUserScripts()
  await refreshLogSize(state)
  invalidateCachedInterceptorState(state)
  await updateNetlogListeners(state)
}

export function registerInterceptor(): void {
  void initNetworkLog()
  registerDeepInterceptListener()
  chrome.permissions?.onAdded?.addListener(() => {
    registerDeepInterceptListener()
    void updateNetlogListeners()
  })

  chrome.runtime.onConnect.addListener((port) => connectNetlogPort(port))

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    const keys = [
      STORAGE_KEYS.interceptorRules,
      STORAGE_KEYS.interceptorSettings,
      STORAGE_KEYS.interceptorLibrary,
    ]
    if (keys.some((k) => k in changes)) void fullSync()
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    clearTabBadge(tabId)
  })

  registerMessageHandler('INTERCEPTOR_SYNC', async () => {
    await fullSync()
    return { ok: true }
  })

  registerMessageHandler('INTERCEPTOR_GET_LOG', async (message) => {
    const tabId = (message as Extract<ExtensionMessage, { type: 'INTERCEPTOR_GET_LOG' }>).tabId
    if (tabId != null) return getLogForTab(tabId)
    const all: Record<number, unknown> = {}
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id != null) all[tab.id] = getLogForTab(tab.id)
    }
    return all
  })

  registerMessageHandler('INTERCEPTOR_CLEAR_LOG', async (message) => {
    const tabId = (message as Extract<ExtensionMessage, { type: 'INTERCEPTOR_CLEAR_LOG' }>).tabId
    clearLog(tabId)
    return { ok: true }
  })

  registerMessageHandler('INTERCEPTOR_TEST_RULE', async (message) => {
    const m = message as Extract<ExtensionMessage, { type: 'INTERCEPTOR_TEST_RULE' }>
    const state = await getInterceptorState()
    return testRulesAgainstUrl(state.rules, m.url, m.pageUrl)
  })

  registerMessageHandler('INTERCEPTOR_PAGE_EVENT', async (message, sender) => {
    const m = message as Extract<ExtensionMessage, { type: 'INTERCEPTOR_PAGE_EVENT' }>
    const tabId = m.tabId ?? sender.tab?.id
    if (tabId == null) return
    const ev = m.event as InterceptorPageEvent
    incrementTabRuleCount(tabId)
    mergePageEvent(tabId, ev.url, {
      url: ev.url,
      method: ev.method,
      requestBody: ev.requestBody,
      responseBody: ev.responseBody,
      status: ev.status,
      appliedRuleIds: [ev.ruleId],
      ruleHits: [
        {
          ruleId: ev.ruleId,
          ruleName: ev.ruleName,
          ruleType: ev.ruleType,
          action: ev.kind,
        },
      ],
    })
    return { ok: true }
  })

  registerMessageHandler('INTERCEPTOR_DEEP_ATTACH', async (message) => {
    const tabId = (message as Extract<ExtensionMessage, { type: 'INTERCEPTOR_DEEP_ATTACH' }>).tabId
    return attachDeepIntercept(tabId)
  })

  registerMessageHandler('INTERCEPTOR_DEEP_DETACH', async (message) => {
    const tabId = (message as Extract<ExtensionMessage, { type: 'INTERCEPTOR_DEEP_DETACH' }>).tabId
    await detachDeepIntercept(tabId)
    return { ok: true }
  })

  void fullSync()
}
