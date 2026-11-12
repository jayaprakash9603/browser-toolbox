import {
  getAdblockState,
  hostnameFromUrl,
  isBlockingActiveForUrl,
  toggleAllowlistHost,
} from '@/core/adblock'
import { ensureContentScriptInTab } from '@/chrome/contentScriptClient'
import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { STORAGE_KEYS } from '@/core/constants'
import { createLogger } from '@/core/logging'

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

export async function refreshSiteQuickActionMenus(tab?: chrome.tabs.Tab): Promise<void> {
  if (!chrome.contextMenus.update) return
  const url = tab?.url
  const show = isHttpUrl(url)
  const state = await getAdblockState()
  const blocking = show && state.enabled && isBlockingActiveForUrl(state, url)

  void chrome.contextMenus.update(ADBLOCK_SITE_MENU_ID, {
    visible: show && state.enabled,
    title: blocking
      ? getChromeMessage('contextMenuPauseAdblock')
      : getChromeMessage('contextMenuResumeAdblock'),
  })

  let fontInspectorOn = false
  if (tab?.id != null && show) {
    try {
      await ensureContentScriptInTab(tab.id)
      const res = (await chrome.tabs.sendMessage(tab.id, { type: 'FONT_INSPECTOR_GET' })) as
        | { ok?: boolean; data?: { enabled?: boolean } }
        | undefined
      fontInspectorOn = Boolean(res?.ok && res.data?.enabled)
    } catch {
      fontInspectorOn = false
    }
  }

  void chrome.contextMenus.update(FONT_INSPECTOR_MENU_ID, {
    visible: show,
    title: fontInspectorOn
      ? getChromeMessage('contextMenuDisableFontInspector')
      : getChromeMessage('contextMenuEnableFontInspector'),
  })
}

export async function handleSiteQuickActionClick(
  menuItemId: string,
  tab?: chrome.tabs.Tab,
): Promise<boolean> {
  if (menuItemId === ADBLOCK_SITE_MENU_ID && tab?.url) {
    const host = hostnameFromUrl(tab.url)
    if (!host) return true
    await toggleAllowlistHost(host)
    return true
  }
  if (menuItemId === FONT_INSPECTOR_MENU_ID && tab?.id != null) {
    try {
      await ensureContentScriptInTab(tab.id)
      const current = (await chrome.tabs.sendMessage(tab.id, { type: 'FONT_INSPECTOR_GET' })) as
        | { ok?: boolean; data?: { enabled?: boolean } }
        | undefined
      const enabled = !(current?.ok && current.data?.enabled)
      await chrome.tabs.sendMessage(tab.id, { type: 'FONT_INSPECTOR_TOGGLE', enabled })
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
    if (area === 'local' && changes[STORAGE_KEYS.adblock]) void rebuildMenus?.()
  })
}
