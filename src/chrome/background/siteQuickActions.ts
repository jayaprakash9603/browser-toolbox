import {
  getAdblockState,
  hostnameFromUrl,
  isBlockingActiveForUrl,
  toggleAllowlistHost,
} from '@/core/adblock'
import { readFontInspectorTab } from '@/core/design/fontInspectorState'
import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { STORAGE_KEYS } from '@/core/constants'
import { createLogger } from '@/core/logging'

import { pushFontInspectorToTab, resolveFontInspectorForTab, toggleFontInspectorForTab } from './fontInspector'

const logger = createLogger('site-quick-actions')

export const ADBLOCK_SITE_MENU_ID = 'toolbox.adblock.site'
export const FONT_INSPECTOR_MENU_ID = 'toolbox.font-inspector.toggle'

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
    id: FONT_INSPECTOR_MENU_ID,
    title: getChromeMessage('contextMenuEnableFontInspector'),
    contexts: ['page', 'frame'],
  })
}

export function applySiteQuickActionMenuLabels(
  tab: chrome.tabs.Tab | undefined,
  adblock: { enabled: boolean; blocking: boolean },
  fontInspectorOn: boolean,
): void {
  if (!chrome.contextMenus.update) return
  const show = isHttpUrl(tab?.url)
  void chrome.contextMenus.update(ADBLOCK_SITE_MENU_ID, {
    visible: show && adblock.enabled,
    title: adblock.blocking
      ? getChromeMessage('contextMenuPauseAdblock')
      : getChromeMessage('contextMenuResumeAdblock'),
  })
  void chrome.contextMenus.update(FONT_INSPECTOR_MENU_ID, {
    visible: show,
    title: fontInspectorOn
      ? getChromeMessage('contextMenuDisableFontInspector')
      : getChromeMessage('contextMenuEnableFontInspector'),
  })
}

export async function refreshSiteQuickActionMenus(tab?: chrome.tabs.Tab): Promise<void> {
  const show = isHttpUrl(tab?.url)
  const state = await getAdblockState()
  const blocking = show && state.enabled && isBlockingActiveForUrl(state, tab?.url)
  let fontInspectorOn = false
  if (tab?.id != null && show) {
    fontInspectorOn = await readFontInspectorTab(tab.id)
    void resolveFontInspectorForTab(tab.id)
      .then((enabled) => {
        if (enabled !== fontInspectorOn) {
          applySiteQuickActionMenuLabels(tab, { enabled: state.enabled, blocking }, enabled)
        }
      })
      .catch(() => undefined)
  }
  applySiteQuickActionMenuLabels(tab, { enabled: state.enabled, blocking }, fontInspectorOn)
}

export async function refreshSiteQuickActionMenusForActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  await refreshSiteQuickActionMenus(tab)
}

export async function handleSiteQuickActionClick(
  menuItemId: string,
  tab?: chrome.tabs.Tab,
): Promise<boolean> {
  if (menuItemId === ADBLOCK_SITE_MENU_ID && tab?.url) {
    const host = hostnameFromUrl(tab.url)
    if (!host) return true
    await toggleAllowlistHost(host)
    await refreshSiteQuickActionMenus(tab)
    return true
  }
  if (menuItemId === FONT_INSPECTOR_MENU_ID && tab?.id != null) {
    try {
      const enabled = await toggleFontInspectorForTab(tab.id)
      const state = await getAdblockState()
      applySiteQuickActionMenuLabels(
        tab,
        {
          enabled: state.enabled,
          blocking: isBlockingActiveForUrl(state, tab.url),
        },
        enabled,
      )
    } catch (error) {
      logger.warn('font inspector toggle failed', error)
    }
    return true
  }
  return false
}

export function isSiteQuickActionMenuItem(menuItemId: string): boolean {
  return menuItemId === ADBLOCK_SITE_MENU_ID || menuItemId === FONT_INSPECTOR_MENU_ID
}

let rebuildMenus: (() => Promise<void>) | null = null

export function bindSiteQuickActionMenuRebuild(fn: () => Promise<void>): void {
  rebuildMenus = fn
}

export function registerSiteQuickActionMenuSync(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.adblock]) {
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
