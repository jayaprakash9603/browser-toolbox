import { extensionApi } from './browser'

export type PanelOpenTarget = {
  windowId?: number
  tabId?: number
}

export type PanelOpenedInfo = {
  path?: string
  windowId?: number
}

function extensionPageUrl(path = 'index.html'): string | null {
  const api = extensionApi()
  return api?.runtime?.getURL ? api.runtime.getURL(path) : null
}

async function openExtensionPage(target: PanelOpenTarget): Promise<boolean> {
  const api = extensionApi()
  const url = extensionPageUrl()
  if (!api?.tabs?.create || !url) return false

  await api.tabs.create({
    ...(target.windowId != null ? { windowId: target.windowId } : {}),
    url,
  })
  return true
}

/**
 * Opens the browser-native panel when available and falls back to an extension tab.
 * The fallback keeps commands useful on Firefox/Tor and Chromium derivatives without sidePanel.
 */
export async function openExtensionPanel(target: PanelOpenTarget = {}): Promise<boolean> {
  const api = extensionApi()
  if (!api) return false

  if (api.sidePanel?.open) {
    try {
      if (target.tabId != null) {
        await api.sidePanel.open({ tabId: target.tabId })
        return true
      }
      if (target.windowId != null) {
        await api.sidePanel.open({ windowId: target.windowId })
        return true
      }
      return false
    } catch {
      // Chromium: avoid opening a full extension tab when the side panel API exists but this call failed.
      return false
    }
  }

  if (api.sidebarAction?.open) {
    try {
      await api.sidebarAction.open()
      return true
    } catch {
      // Firefox can reject sidebarAction.open when the user gesture is gone.
    }
  }

  return openExtensionPage(target)
}

export async function configurePanelAction(): Promise<boolean> {
  const api = extensionApi()
  if (!api) return false

  if (api.sidePanel?.setPanelBehavior) {
    try {
      await api.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      return true
    } catch {
      // Some Chromium derivatives expose the API but reject the behavior setting.
      // Keep the toolbar action usable through the fallback listener below.
    }
  }

  if (api.action?.onClicked?.addListener) {
    api.action.onClicked.addListener((tab) => {
      void openExtensionPanel({ windowId: tab.windowId, tabId: tab.id })
    })
    return true
  }

  return false
}

export function onPanelOpened(listener: (info: PanelOpenedInfo) => void): boolean {
  const api = extensionApi()
  if (!api) return false

  if (api.sidePanel?.onOpened) {
    api.sidePanel.onOpened.addListener(listener)
    return true
  }

  if (api.sidebarAction?.onShown) {
    api.sidebarAction.onShown.addListener((info) => listener({ windowId: info.windowId }))
    return true
  }

  return false
}

