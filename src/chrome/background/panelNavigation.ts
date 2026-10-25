import { PANEL_OPEN_HOME_KEY, PANEL_ROUTE_INTENT_KEY } from '@/core/panel/navigationSession'

/** When the panel opens without an explicit tool route, the UI should land on Home. */
export function registerSidePanelNavigation(): void {
  if (!chrome.sidePanel?.onOpened) return

  chrome.sidePanel.onOpened.addListener((info) => {
    if (info.path && !info.path.includes('index.html')) return
    void (async () => {
      const stored = await chrome.storage.session.get(PANEL_ROUTE_INTENT_KEY)
      if (typeof stored[PANEL_ROUTE_INTENT_KEY] === 'string') return
      await chrome.storage.session.set({ [PANEL_OPEN_HOME_KEY]: true })
    })()
  })
}
