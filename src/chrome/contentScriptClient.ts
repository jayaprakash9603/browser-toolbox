import type { ExtensionResponse } from '@/core/messaging/types'

export class TabMessagingError extends Error {
  readonly code:
    | 'NO_TAB'
    | 'RESTRICTED_PAGE'
    | 'FILE_URL_ACCESS'
    | 'CONTENT_SCRIPT_UNAVAILABLE'
    | 'INJECT_FAILED'

  constructor(
    code: TabMessagingError['code'],
    message?: string,
  ) {
    super(message ?? code)
    this.code = code
    this.name = 'TabMessagingError'
  }
}

export function contentScriptBundlePath(): string | null {
  return chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0] ?? null
}

export async function pingContentScript(tabId: number): Promise<boolean> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, {
      type: 'CONTENT_SCRIPT_PING',
    })) as ExtensionResponse<{ ready: true }>
    return Boolean(response?.ok)
  } catch {
    return false
  }
}

export async function ensureContentScriptInTab(tabId: number): Promise<void> {
  if (await pingContentScript(tabId)) return

  const file = contentScriptBundlePath()
  if (!file) throw new TabMessagingError('CONTENT_SCRIPT_UNAVAILABLE')

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: [file] })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new TabMessagingError('INJECT_FAILED', detail)
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 40 + attempt * 25))
    if (await pingContentScript(tabId)) return
  }

  throw new TabMessagingError('CONTENT_SCRIPT_UNAVAILABLE')
}

export async function getActiveBrowserTab(): Promise<chrome.tabs.Tab | undefined> {
  try {
    const win = await chrome.windows.getLastFocused({ populate: true, windowTypes: ['normal'] })
    const tab = win.tabs?.find((t) => t.active)
    if (tab?.id != null) return tab
  } catch {
    /* fall through */
  }

  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] })
  const focused = windows.find((w) => w.focused)
  const focusedTab = focused?.tabs?.find((t) => t.active)
  if (focusedTab?.id != null) return focusedTab

  const [fallback] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  return fallback
}

export function classifyTabUrl(url?: string): TabMessagingError['code'] | null {
  if (!url) return 'NO_TAB'
  const lower = url.toLowerCase()
  if (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-untrusted://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('devtools://') ||
    lower.startsWith('about:') ||
    lower.includes('chrome.google.com/webstore')
  ) {
    return 'RESTRICTED_PAGE'
  }
  return null
}

export function isFileUrlTab(url?: string): boolean {
  return Boolean(url?.toLowerCase().startsWith('file:'))
}
