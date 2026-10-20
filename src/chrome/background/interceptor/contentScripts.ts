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

const logger = createLogger('interceptor-scripts')

const ALL_URLS = ['<all_urls>']

export async function pushPageConfigToTab(tabId: number): Promise<void> {
  const state = await getInterceptorState()
  const config = compilePageRules(state.rules, state.library, state.settings.paused, state.groups)
  await chrome.storage.session.set({ [INTERCEPTOR_PAGE_CONFIG_KEY]: config })
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'INTERCEPTOR_CONFIG',
      config,
      showToast: state.settings.showPageToast,
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

async function unregisterAll(): Promise<void> {
  const ids = Object.values(CONTENT_SCRIPT_IDS)
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts()
    const remove = registered.map((s) => s.id).filter((id) => ids.includes(id as typeof ids[number]))
    if (remove.length) await chrome.scripting.unregisterContentScripts({ ids: remove })
  } catch {
    /* none */
  }
}

function hasActiveRules(state: Awaited<ReturnType<typeof getInterceptorState>>): boolean {
  if (state.settings.paused) return false
  return state.rules.some((r) => isRuleActive(r, state.groups))
}

export async function syncInterceptorContentScripts(): Promise<void> {
  const state = await getInterceptorState()
  await unregisterAll()
  const pageRules = needsPageInterceptor(state.rules, state.settings.paused, state.groups)
  const toastBridge = state.settings.showPageToast && hasActiveRules(state)
  if (!pageRules && !toastBridge) return
  const base = { matches: ALL_URLS, runAt: 'document_start' as const }
  const scripts: chrome.scripting.RegisteredContentScript[] = [
    {
      ...base,
      id: CONTENT_SCRIPT_IDS.isolated,
      js: [INTERCEPTOR_FILES.isolatedJs],
      allFrames: true,
    },
  ]
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
    await chrome.scripting.registerContentScripts(scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id != null) await pushPageConfigToTab(tab.id)
  }
}
