import {
  ADBLOCK_FILES,
  CONTENT_SCRIPT_IDS,
  INJECTED_SESSION_KEY,
  isAllowlisted,
  YOUTUBE_MATCHES,
  type AdblockState,
} from '@/core/adblock'
import { createLogger } from '@/core/logging'

const logger = createLogger('adblock-scripts')

const ALL_URLS = ['<all_urls>']
const YOUTUBE_HOST_RE = /(^|\.)(youtube\.com|youtube-nocookie\.com)$/
const INJECT_CONCURRENCY = 4

function allowlistExcludePatterns(allowlist: string[]): string[] | undefined {
  if (!allowlist.length) return undefined
  return allowlist.map((host) => `*://*.${host.replace(/^www\./, '')}/*`)
}

export function buildContentScripts(state: AdblockState): chrome.scripting.RegisteredContentScript[] {
  if (!state.enabled) return []
  const excludeMatches = allowlistExcludePatterns(state.allowlist)
  const base = { excludeMatches, runAt: 'document_start' as const, allFrames: true }
  const scripts: chrome.scripting.RegisteredContentScript[] = []

  if (state.cosmeticEnabled) {
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.cosmetic,
      css: [ADBLOCK_FILES.genericCss],
      js: [ADBLOCK_FILES.cosmeticJs],
      matches: ALL_URLS,
    })
  }
  if (state.cookieBanners) {
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.cookies,
      css: [ADBLOCK_FILES.cookiesCss],
      js: [ADBLOCK_FILES.cookiesRejectJs],
      matches: ALL_URLS,
    })
  }
  if (state.distractions) {
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.distractions,
      css: [ADBLOCK_FILES.distractionsCss],
      matches: ALL_URLS,
    })
  }
  if (state.blockNotifications) {
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.notifications,
      js: [ADBLOCK_FILES.notificationsJs],
      matches: ALL_URLS,
      world: 'MAIN',
    })
  }
  if (state.blockPopups) {
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.popups,
      js: [ADBLOCK_FILES.popupsJs],
      matches: ALL_URLS,
      world: 'MAIN',
    })
  }
  if (state.youtubeEnabled && state.lists.youtube) {
    scripts.push({
      ...base,
      allFrames: false,
      id: CONTENT_SCRIPT_IDS.youtubeMain,
      js: [ADBLOCK_FILES.youtubeMainJs],
      matches: YOUTUBE_MATCHES,
      world: 'MAIN',
    })
    scripts.push({
      ...base,
      allFrames: false,
      id: CONTENT_SCRIPT_IDS.youtubeIsolated,
      js: [ADBLOCK_FILES.youtubeIsolatedJs],
      matches: YOUTUBE_MATCHES,
    })
  }
  return scripts
}

async function unregisterAll(): Promise<void> {
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts()
    const ours = new Set<string>(Object.values(CONTENT_SCRIPT_IDS))
    const ids = registered.map((script) => script.id).filter((id) => ours.has(id))
    if (ids.length) await chrome.scripting.unregisterContentScripts({ ids })
  } catch {
    try {
      await chrome.scripting.unregisterContentScripts({ ids: Object.values(CONTENT_SCRIPT_IDS) })
    } catch {
      /* nothing registered */
    }
  }
}

export async function syncContentScripts(state: AdblockState): Promise<void> {
  await unregisterAll()
  const scripts = buildContentScripts(state)
  if (!scripts.length) return
  try {
    await chrome.scripting.registerContentScripts(scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}

function sessionArea(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local
}

async function injectOneTab(tab: chrome.tabs.Tab, state: AdblockState): Promise<void> {
  if (tab.id == null || !tab.url || tab.discarded || isAllowlisted(state.allowlist, tab.url)) return
  const target = { tabId: tab.id, allFrames: true }
  try {
    const files: string[] = [ADBLOCK_FILES.genericCss]
    if (state.cookieBanners) files.push(ADBLOCK_FILES.cookiesCss)
    if (state.distractions) files.push(ADBLOCK_FILES.distractionsCss)
    if (state.cosmeticEnabled) {
      await chrome.scripting.insertCSS({ target, files })
      await chrome.scripting.executeScript({ target, files: [ADBLOCK_FILES.cosmeticJs] })
    }
    if (state.cookieBanners) {
      await chrome.scripting.executeScript({ target, files: [ADBLOCK_FILES.cookiesRejectJs] })
    }
    if (state.blockPopups) {
      await chrome.scripting.executeScript({ target, files: [ADBLOCK_FILES.popupsJs], world: 'MAIN' })
    }
    const host = new URL(tab.url).hostname
    if (state.youtubeEnabled && state.lists.youtube && YOUTUBE_HOST_RE.test(host)) {
      const ytTarget = { tabId: tab.id, allFrames: false }
      await chrome.scripting.executeScript({
        target: ytTarget,
        files: [ADBLOCK_FILES.youtubeMainJs],
        world: 'MAIN',
      })
      await chrome.scripting.executeScript({
        target: ytTarget,
        files: [ADBLOCK_FILES.youtubeIsolatedJs],
      })
    }
  } catch (error) {
    logger.debug('inject skipped', tab.url, error)
  }
}

async function runPool(tabs: chrome.tabs.Tab[], state: AdblockState): Promise<void> {
  let index = 0
  async function worker(): Promise<void> {
    while (index < tabs.length) {
      const tab = tabs[index++]
      await injectOneTab(tab, state)
    }
  }
  await Promise.all(Array.from({ length: INJECT_CONCURRENCY }, () => worker()))
}

/**
 * Registered scripts only run on future navigations, so tabs that were already
 * open (including background YouTube tabs) get the scripts injected once.
 */
/** Re-inject YouTube ad scripts into open tabs (registered scripts only run on the next navigation). */
export async function injectYoutubeOpenTabs(state: AdblockState): Promise<void> {
  if (!state.enabled || !state.youtubeEnabled || !state.lists.youtube) return
  const tabs = await chrome.tabs.query({
    url: ['*://*.youtube.com/*', '*://youtube.com/*', '*://*.youtube-nocookie.com/*'],
  })
  for (const tab of tabs) {
    if (tab.id == null || !tab.url || tab.discarded || isAllowlisted(state.allowlist, tab.url)) continue
    const target = { tabId: tab.id, allFrames: false }
    try {
      await chrome.scripting.executeScript({
        target,
        files: [ADBLOCK_FILES.youtubeMainJs],
        world: 'MAIN',
      })
      await chrome.scripting.executeScript({
        target,
        files: [ADBLOCK_FILES.youtubeIsolatedJs],
      })
    } catch (error) {
      logger.debug('youtube inject skipped', tab.url, error)
    }
  }
}

export async function injectIntoOpenTabs(state: AdblockState): Promise<void> {
  const area = sessionArea()
  if (!state.enabled) {
    await area.set({ [INJECTED_SESSION_KEY]: false })
    return
  }
  const flag = await area.get(INJECTED_SESSION_KEY)
  if (flag[INJECTED_SESSION_KEY]) return
  await area.set({ [INJECTED_SESSION_KEY]: true })

  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] })
  const eligible = tabs.filter((tab) => tab.id != null && tab.url && !tab.discarded)
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
  const activeId = active?.id
  const ordered = [
    ...eligible.filter((tab) => tab.id === activeId),
    ...eligible.filter((tab) => tab.id !== activeId),
  ]
  await runPool(ordered, state)
}
