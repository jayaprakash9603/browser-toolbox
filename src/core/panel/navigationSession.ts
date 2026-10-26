/** Session keys coordinating side-panel entry routes (background ↔ panel). */

export const PANEL_ROUTE_INTENT_KEY = 'toolbox.routeIntent'
export const PANEL_OPEN_HOME_KEY = 'toolbox.openHomeOnPanel'
export const PANEL_OPEN_COMMAND_PALETTE_KEY = 'toolbox.openCommandPalette'

let sidePanelCheck: Promise<boolean> | null = null

/** `index.html` also runs in normal tabs; panel-entry routing must never move those. */
export function isSidePanelDocument(): Promise<boolean> {
  sidePanelCheck ??= (async () => {
    if (!chrome.tabs?.getCurrent) return false
    try {
      return !(await chrome.tabs.getCurrent())
    } catch {
      return false
    }
  })()
  return sidePanelCheck
}

export async function setPanelRouteIntent(route: string): Promise<void> {
  if (!chrome.storage?.session) return
  await chrome.storage.session.set({ [PANEL_ROUTE_INTENT_KEY]: route })
}

export async function consumePanelRouteIntent(): Promise<string | null> {
  if (!chrome.storage?.session) return null
  const stored = await chrome.storage.session.get(PANEL_ROUTE_INTENT_KEY)
  const route = stored[PANEL_ROUTE_INTENT_KEY]
  if (typeof route === 'string' && route.startsWith('/')) {
    await chrome.storage.session.remove(PANEL_ROUTE_INTENT_KEY)
    return route
  }
  return null
}

export async function consumeOpenHomeOnPanel(): Promise<boolean> {
  if (!chrome.storage?.session) return false
  const stored = await chrome.storage.session.get(PANEL_OPEN_HOME_KEY)
  if (!stored[PANEL_OPEN_HOME_KEY]) return false
  await chrome.storage.session.remove(PANEL_OPEN_HOME_KEY)
  return true
}

export async function requestOpenCommandPalette(): Promise<void> {
  if (!chrome.storage?.session) return
  await chrome.storage.session.set({ [PANEL_OPEN_COMMAND_PALETTE_KEY]: true })
}

export async function consumeOpenCommandPalette(): Promise<boolean> {
  if (!chrome.storage?.session) return false
  const stored = await chrome.storage.session.get(PANEL_OPEN_COMMAND_PALETTE_KEY)
  if (!stored[PANEL_OPEN_COMMAND_PALETTE_KEY]) return false
  await chrome.storage.session.remove(PANEL_OPEN_COMMAND_PALETTE_KEY)
  return true
}
