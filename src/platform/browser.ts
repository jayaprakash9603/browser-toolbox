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

/** Edge's user-agent token is `Edg`, including Edge, Edge Android, and Edge iOS. */
function isEdgeUserAgent(userAgent: string): boolean {
  return /Edg(?:e|A|iOS)?\//.test(userAgent)
}

export function isEdgeRuntime(): boolean {
  if (typeof navigator === 'undefined') return false
  if (isEdgeUserAgent(navigator.userAgent)) return true
  const brands = (
    navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }
  ).userAgentData?.brands
  return Boolean(brands?.some((item) => /microsoft edge/i.test(item.brand)))
}

export function extensionManagementUrl(): string | null {
  const api = extensionApi()
  if (!api?.runtime?.id) return null
  return isFirefoxRuntime() ? 'about:addons' : `chrome://extensions/?id=${api.runtime.id}`
}

