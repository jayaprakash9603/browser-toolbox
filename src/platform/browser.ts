type SidebarAction = {
  open?: () => Promise<void>
  close?: () => Promise<void>
  onShown?: {
    addListener: (listener: (info: { windowId: number }) => void) => void
    removeListener?: (listener: (info: { windowId: number }) => void) => void
  }
}

export type ExtensionApi = typeof chrome & {
  browserAction?: typeof chrome.action
  sidebarAction?: SidebarAction
}

const scope = globalThis as typeof globalThis & {
  browser?: ExtensionApi
  chrome?: ExtensionApi
}

/** Prefer Firefox's promise-based namespace and fall back to Chromium's namespace. */
export function extensionApi(): ExtensionApi | undefined {
  return scope.browser ?? scope.chrome
}

export function isFirefoxRuntime(): boolean {
  const api = extensionApi()
  if (api?.sidebarAction) return true
  return typeof navigator !== 'undefined' && /\bFirefox\//.test(navigator.userAgent)
}

export function extensionManagementUrl(): string | null {
  const api = extensionApi()
  if (!api?.runtime?.id) return null
  return isFirefoxRuntime() ? 'about:addons' : `chrome://extensions/?id=${api.runtime.id}`
}

