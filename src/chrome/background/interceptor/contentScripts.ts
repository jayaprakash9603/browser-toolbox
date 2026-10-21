import {
  CONTENT_SCRIPT_IDS,
  INTERCEPTOR_FILES,
  INTERCEPTOR_PAGE_CONFIG_KEY,
  compilePageRules,
  getInterceptorState,
  isRuleActive,
  needsPageInterceptor,
} from '@/core/interceptor'
import { createLogger } from '@/core/logging'

import { reconcileContentScripts } from '../scriptRegistry'

const logger = createLogger('interceptor-scripts')
const OWNED_SCRIPT_IDS = Object.values(CONTENT_SCRIPT_IDS)

const ALL_URLS = ['<all_urls>']

let lastPushedConfigJson = ''

export async function pushPageConfigToTab(
  tabId: number,
  state?: Awaited<ReturnType<typeof getInterceptorState>>,
): Promise<void> {
  const resolved = state ?? await getInterceptorState()
  const config = compilePageRules(resolved.rules, resolved.library, resolved.settings.paused, resolved.groups)
  const configJson = JSON.stringify(config)
  if (configJson !== lastPushedConfigJson) {
    lastPushedConfigJson = configJson
    await chrome.storage.session.set({ [INTERCEPTOR_PAGE_CONFIG_KEY]: config })
  }
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'INTERCEPTOR_CONFIG',
      config,
      showToast: resolved.settings.showPageToast,
    })
  } catch {
    /* tab may not have script yet */
  }
}

export function buildInterceptorContentScripts(): chrome.scripting.RegisteredContentScript[] {
  const base = { matches: ALL_URLS, runAt: 'document_start' as const }
  return [
    {
      ...base,
      id: CONTENT_SCRIPT_IDS.isolated,
      js: [INTERCEPTOR_FILES.isolatedJs],
      allFrames: true,
    },
    {
      ...base,
      id: CONTENT_SCRIPT_IDS.main,
      js: [INTERCEPTOR_FILES.mainJs],
      allFrames: true,
      world: 'MAIN',
    },
  ]
}

function hasActiveRules(state: Awaited<ReturnType<typeof getInterceptorState>>): boolean {
  if (state.settings.paused) return false
  return state.rules.some((r) => isRuleActive(r, state.groups))
}

export async function syncInterceptorContentScripts(
  state?: Awaited<ReturnType<typeof getInterceptorState>>,
): Promise<void> {
  const resolved = state ?? await getInterceptorState()
  const pageRules = needsPageInterceptor(resolved.rules, resolved.settings.paused, resolved.groups)
  const toastBridge = resolved.settings.showPageToast && hasActiveRules(resolved)
  const base = { matches: ALL_URLS, runAt: 'document_start' as const }
  const scripts: chrome.scripting.RegisteredContentScript[] = []
  if (pageRules || toastBridge) {
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.isolated,
      js: [INTERCEPTOR_FILES.isolatedJs],
      allFrames: true,
    })
  }
  if (pageRules) {
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.main,
      js: [INTERCEPTOR_FILES.mainJs],
      allFrames: true,
      world: 'MAIN',
    })
  }
  try {
    await reconcileContentScripts(OWNED_SCRIPT_IDS, scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
  if (!pageRules && !toastBridge) return
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id != null) await pushPageConfigToTab(tab.id, resolved)
  }
}
