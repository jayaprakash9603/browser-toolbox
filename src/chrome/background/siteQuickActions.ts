import {
  addAllowlistHost,
  getAdblockState,
  hostnameFromUrl,
  isBlockingActiveForUrl,
  removeAllowlistHost,
  updateAdblockState,
} from '@/core/adblock'
import {
  addTrustedHost,
  getProtectionState,
  isProtectionActiveForUrl,
  isTrustedHost,
  removeTrustedHost,
  updateProtectionState,
} from '@/core/protection'
import { readFontInspectorTab } from '@/core/design/fontInspectorState'
import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { STORAGE_KEYS } from '@/core/constants'
import { createLogger } from '@/core/logging'

import { resolveElementInspectorForTab, toggleElementInspectorForTab } from './elementInspector'
import { pushFontInspectorToTab, resolveFontInspectorForTab, toggleFontInspectorForTab } from './fontInspector'
import { readElementInspectorTab } from '@/core/design/elementInspectorState'

import { syncProtectionState } from './protection'

const logger = createLogger('site-quick-actions')

export const ADBLOCK_SITE_MENU_ID = 'toolbox.adblock.site'
export const PROTECTION_SITE_MENU_ID = 'toolbox.protection.site'
export const FONT_INSPECTOR_MENU_ID = 'toolbox.font-inspector.toggle'
export const ELEMENT_INSPECTOR_MENU_ID = 'toolbox.element-inspector.toggle'

function isHttpUrl(url?: string): boolean {
  if (!url) return false
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export function buildSiteQuickActionMenus(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): void {
  create({
    id: ADBLOCK_SITE_MENU_ID,
    title: getChromeMessage('contextMenuPauseAdblock'),
    contexts: ['page', 'frame'],
  })
  create({
    id: PROTECTION_SITE_MENU_ID,
    title: getChromeMessage('contextMenuPauseProtection'),
    contexts: ['page', 'frame', 'link'],
  })
  create({
    id: FONT_INSPECTOR_MENU_ID,
    title: getChromeMessage('contextMenuEnableFontInspector'),
    contexts: ['page', 'frame'],
  })
  create({
    id: ELEMENT_INSPECTOR_MENU_ID,
    title: getChromeMessage('contextMenuEnableElementInspector'),
    contexts: ['page', 'frame'],
  })
}

export function applySiteQuickActionMenuLabels(
  tab: chrome.tabs.Tab | undefined,
  adblock: { enabled: boolean; blocking: boolean },
  protection: { enabled: boolean; active: boolean },
  fontInspectorOn: boolean,
  elementInspectorOn: boolean,
): void {
  if (!chrome.contextMenus.update) return
  const show = isHttpUrl(tab?.url)
  void chrome.contextMenus.update(ADBLOCK_SITE_MENU_ID, {
    visible: show,
    title: adblock.blocking
      ? getChromeMessage('contextMenuPauseAdblock')
      : getChromeMessage('contextMenuResumeAdblock'),
  })
  void chrome.contextMenus.update(PROTECTION_SITE_MENU_ID, {
    visible: show && protection.enabled,
    title: protection.active
      ? getChromeMessage('contextMenuPauseProtection')
      : getChromeMessage('contextMenuResumeProtection'),
  })
  void chrome.contextMenus.update(FONT_INSPECTOR_MENU_ID, {
    visible: show,
    title: fontInspectorOn
      ? getChromeMessage('contextMenuDisableFontInspector')
      : getChromeMessage('contextMenuEnableFontInspector'),
  })
  void chrome.contextMenus.update(ELEMENT_INSPECTOR_MENU_ID, {
    visible: show,
    title: elementInspectorOn
      ? getChromeMessage('contextMenuDisableElementInspector')
      : getChromeMessage('contextMenuEnableElementInspector'),
  })
}

export async function refreshSiteQuickActionMenus(tab?: chrome.tabs.Tab): Promise<void> {
  const show = isHttpUrl(tab?.url)
  const state = await getAdblockState()
  const blocking = show && state.enabled && isBlockingActiveForUrl(state, tab?.url)
  const protectionState = await getProtectionState()
  const protectionActive = show && isProtectionActiveForUrl(protectionState, tab?.url)
  let fontInspectorOn = false
  let elementInspectorOn = false
  if (tab?.id != null && show) {
    fontInspectorOn = await readFontInspectorTab(tab.id)
    elementInspectorOn = await readElementInspectorTab(tab.id)
    void resolveFontInspectorForTab(tab.id)
      .then((enabled) => {
        if (enabled !== fontInspectorOn) {
          applySiteQuickActionMenuLabels(
            tab,
            { enabled: state.enabled, blocking },
            { enabled: protectionState.enabled, active: protectionActive },
            enabled,
            elementInspectorOn,
          )
        }
      })
      .catch(() => undefined)
    void resolveElementInspectorForTab(tab.id)
      .then((enabled) => {
        if (enabled !== elementInspectorOn) {
          applySiteQuickActionMenuLabels(
            tab,
            { enabled: state.enabled, blocking },
            { enabled: protectionState.enabled, active: protectionActive },
            fontInspectorOn,
            enabled,
          )
        }
      })
      .catch(() => undefined)
  }
  applySiteQuickActionMenuLabels(
    tab,
    { enabled: state.enabled, blocking },
    { enabled: protectionState.enabled, active: protectionActive },
    fontInspectorOn,
    elementInspectorOn,
  )
}

export async function refreshSiteQuickActionMenusForActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  await refreshSiteQuickActionMenus(tab)
}

export async function handleSiteQuickActionClick(
  menuItemId: string,
  tab?: chrome.tabs.Tab,
  _frameId = 0,
): Promise<boolean> {
  if (menuItemId === ADBLOCK_SITE_MENU_ID && tab?.url) {
    const host = hostnameFromUrl(tab.url)
    if (!host) return true
    const state = await getAdblockState()
    const blocking = state.enabled && isBlockingActiveForUrl(state, tab.url)
    if (blocking) {
      await addAllowlistHost(host)
    } else {
      if (!state.enabled) await updateAdblockState({ enabled: true })
      await removeAllowlistHost(host)
    }
    await refreshSiteQuickActionMenus(tab)
    return true
  }
  if (menuItemId === PROTECTION_SITE_MENU_ID && tab?.url) {
    const host = hostnameFromUrl(tab.url)
    if (!host) return true
    const state = await getProtectionState()
    const relaxed = isTrustedHost(state.trusted, tab.url)
    if (relaxed) {
      await removeTrustedHost(host)
    } else {
      if (!state.enabled) await updateProtectionState({ enabled: true })
      await addTrustedHost(host)
    }
    await syncProtectionState()
    await refreshSiteQuickActionMenus(tab)
    return true
  }
  if (menuItemId === FONT_INSPECTOR_MENU_ID && tab?.id != null) {
    try {
      const enabled = await toggleFontInspectorForTab(tab.id)
      const state = await getAdblockState()
      const protectionState = await getProtectionState()
      applySiteQuickActionMenuLabels(
        tab,
        {
          enabled: state.enabled,
          blocking: isBlockingActiveForUrl(state, tab.url),
        },
        {
          enabled: protectionState.enabled,
          active: isProtectionActiveForUrl(protectionState, tab.url),
        },
        enabled,
        await readElementInspectorTab(tab.id),
      )
    } catch (error) {
      logger.warn('font inspector toggle failed', error)
    }
    return true
  }
  if (menuItemId === ELEMENT_INSPECTOR_MENU_ID && tab?.id != null) {
    try {
      const enabled = await toggleElementInspectorForTab(tab.id)
      const state = await getAdblockState()
      const protectionState = await getProtectionState()
      applySiteQuickActionMenuLabels(
        tab,
        {
          enabled: state.enabled,
          blocking: isBlockingActiveForUrl(state, tab.url),
        },
        {
          enabled: protectionState.enabled,
          active: isProtectionActiveForUrl(protectionState, tab.url),
        },
        await readFontInspectorTab(tab.id),
        enabled,
      )
    } catch (error) {
      logger.warn('element inspector toggle failed', error)
    }
    return true
  }
  return false
}

export function isSiteQuickActionMenuItem(menuItemId: string): boolean {
  return (
    menuItemId === ADBLOCK_SITE_MENU_ID ||
    menuItemId === PROTECTION_SITE_MENU_ID ||
    menuItemId === FONT_INSPECTOR_MENU_ID ||
    menuItemId === ELEMENT_INSPECTOR_MENU_ID
  )
}

let rebuildMenus: (() => Promise<void>) | null = null

export function bindSiteQuickActionMenuRebuild(fn: () => Promise<void>): void {
  rebuildMenus = fn
}

export function registerSiteQuickActionMenuSync(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes[STORAGE_KEYS.adblock] || changes[STORAGE_KEYS.protection])) {
      void rebuildMenus?.()
      void refreshSiteQuickActionMenusForActiveTab()
    }
  })
  chrome.tabs.onActivated.addListener(() => {
    void refreshSiteQuickActionMenusForActiveTab()
  })
}

/** Explicit enable/disable from panel or elsewhere. */
export async function syncFontInspectorMenuAfterPanelChange(tabId: number, enabled: boolean): Promise<void> {
  await pushFontInspectorToTab(tabId, enabled)
  const tab = await chrome.tabs.get(tabId).catch(() => undefined)
  if (tab) await refreshSiteQuickActionMenus(tab)
}
