import {
  ADBLOCK_FILES,
  CONTENT_SCRIPT_IDS,
  INJECTED_SESSION_KEY,
  isAllowlisted,
  YOUTUBE_MATCHES,
  type AdblockState,
} from '@/core/adblock'
import { createLogger } from '@/core/logging'

import { reconcileContentScripts } from '../scriptRegistry'
import { isRulesetOn } from './rulesets'

const logger = createLogger('adblock-scripts')
const OWNED_SCRIPT_IDS = Object.values(CONTENT_SCRIPT_IDS)
/** Same order as SCRIPTLET_RULESETS in the list build: it names the generated cfg files. */
const SCRIPTLET_RULESETS = ['ads', 'privacy', 'annoyances', 'youtube'] as const

const ALL_URLS = ['<all_urls>']
const YOUTUBE_HOST_RE = /(^|\.)(youtube\.com|youtube-nocookie\.com)$/
const INJECT_CONCURRENCY = 4

/** Hosts whose filters switch generic hiding off (`$generichide`) or all hiding (`$elemhide`). */
export interface CosmeticControls {
  generichide: string[]
  elemhide: string[]
}

const NO_CONTROLS: CosmeticControls = { generichide: [], elemhide: [] }
let controlsPromise: Promise<CosmeticControls> | null = null

function loadCosmeticControls(): Promise<CosmeticControls> {
  controlsPromise ??= fetch(chrome.runtime.getURL(ADBLOCK_FILES.cosmeticControls))
    .then((res) => res.json() as Promise<Partial<CosmeticControls>>)
    .then((data) => ({ generichide: data.generichide ?? [], elemhide: data.elemhide ?? [] }))
    .catch(() => NO_CONTROLS)
  return controlsPromise
}

function hostPatterns(hosts: string[]): string[] {
  return hosts.flatMap((host) => {
    const bare = host.replace(/^www\./, '')
    return [`*://${bare}/*`, `*://*.${bare}/*`]
  })
}

function allowlistExcludePatterns(allowlist: string[]): string[] | undefined {
  if (!allowlist.length) return undefined
  return allowlist.map((host) => `*://*.${host.replace(/^www\./, '')}/*`)
}

export function buildContentScripts(
  state: AdblockState,
  controls: CosmeticControls = NO_CONTROLS,
): chrome.scripting.RegisteredContentScript[] {
  if (!state.enabled) return []
  const excludeMatches = allowlistExcludePatterns(state.allowlist)
  const base = { excludeMatches, runAt: 'document_start' as const, allFrames: true }
  const scripts: chrome.scripting.RegisteredContentScript[] = []

  if (state.cosmeticEnabled) {
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.cosmetic,
      js: [ADBLOCK_FILES.cosmeticJs],
      matches: ALL_URLS,
    })
    const noGeneric = hostPatterns([...controls.generichide, ...controls.elemhide])
    const cssExcludes = [...(excludeMatches ?? []), ...noGeneric]
    scripts.push({
      ...base,
      excludeMatches: cssExcludes.length ? cssExcludes : undefined,
      id: CONTENT_SCRIPT_IDS.genericCss,
      css: [ADBLOCK_FILES.genericCss],
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
  const scriptletLists = SCRIPTLET_RULESETS.filter((id) => isRulesetOn(state, id))
  if (scriptletLists.length) {
    // Two registrations on every page instead of one per host: Chrome copies each script's match
    // patterns into every renderer, and tens of thousands of host patterns cost ~13 MB per tab.
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.scriptletsIsolated,
      js: [
        `${ADBLOCK_FILES.scriptletCfgDir}/${scriptletLists.join('-')}.js`,
        ADBLOCK_FILES.scriptletBloomJs,
        ADBLOCK_FILES.scriptletsIsolatedJs,
      ],
      matches: ALL_URLS,
    })
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.scriptletsMain,
      js: [ADBLOCK_FILES.scriptletsMainJs],
      matches: ALL_URLS,
      world: 'MAIN',
    })
  }
  if (state.youtubeEnabled && state.lists.youtube) {
    // Ad removal on YouTube is uBO's list scriptlets (the `youtube` scriptlet ruleset); this only
    // hides leftover ad slots.
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

export async function syncContentScripts(state: AdblockState): Promise<void> {
  const scripts = buildContentScripts(state, state.cosmeticEnabled ? await loadCosmeticControls() : NO_CONTROLS)
  try {
    await reconcileContentScripts(OWNED_SCRIPT_IDS, scripts)
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
    const controls = await loadCosmeticControls()
    const noGeneric = isAllowlisted([...controls.generichide, ...controls.elemhide], tab.url)
    const files: string[] = noGeneric ? [] : [ADBLOCK_FILES.genericCss]
    if (state.cookieBanners) files.push(ADBLOCK_FILES.cookiesCss)
    if (state.distractions) files.push(ADBLOCK_FILES.distractionsCss)
    if (state.cosmeticEnabled) {
      if (files.length) await chrome.scripting.insertCSS({ target, files })
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
