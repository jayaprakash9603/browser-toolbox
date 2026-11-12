const SESSION_KEY = 'fontInspectorByTab'

function tabMap(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object') return {}
  return raw as Record<string, boolean>
}

export async function readFontInspectorTab(tabId: number): Promise<boolean> {
  const stored = await chrome.storage.session.get(SESSION_KEY)
  return Boolean(tabMap(stored[SESSION_KEY])[String(tabId)])
}

export async function writeFontInspectorTab(tabId: number, enabled: boolean): Promise<void> {
  const stored = await chrome.storage.session.get(SESSION_KEY)
  const next = { ...tabMap(stored[SESSION_KEY]), [String(tabId)]: enabled }
  await chrome.storage.session.set({ [SESSION_KEY]: next })
}

export async function clearFontInspectorTab(tabId: number): Promise<void> {
  const stored = await chrome.storage.session.get(SESSION_KEY)
  const next = { ...tabMap(stored[SESSION_KEY]) }
  delete next[String(tabId)]
  await chrome.storage.session.set({ [SESSION_KEY]: next })
}

export const FONT_INSPECTOR_SESSION_KEY = SESSION_KEY
