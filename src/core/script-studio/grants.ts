export type GrantInfo = {
  id: string
  summary: string
  risk: 'low' | 'medium' | 'high'
}

export const GM_GRANTS: GrantInfo[] = [
  { id: 'GM_addElement', summary: 'Insert DOM elements', risk: 'medium' },
  { id: 'GM_addStyle', summary: 'Inject CSS', risk: 'low' },
  { id: 'GM_download', summary: 'Download files', risk: 'high' },
  { id: 'GM_getResourceText', summary: 'Read @resource text', risk: 'low' },
  { id: 'GM_getResourceURL', summary: 'Read @resource blob URL', risk: 'low' },
  { id: 'GM_info', summary: 'Script metadata (always available)', risk: 'low' },
  { id: 'GM_log', summary: 'Console logging', risk: 'low' },
  { id: 'GM_notification', summary: 'Desktop notifications', risk: 'medium' },
  { id: 'GM_openInTab', summary: 'Open new tabs', risk: 'medium' },
  { id: 'GM_registerMenuCommand', summary: 'Add menu commands', risk: 'low' },
  { id: 'GM_setClipboard', summary: 'Write clipboard', risk: 'medium' },
  { id: 'GM_getTab', summary: 'Read tab state', risk: 'medium' },
  { id: 'GM_saveTab', summary: 'Persist tab state', risk: 'medium' },
  { id: 'GM_getTabs', summary: 'List saved tabs', risk: 'medium' },
  { id: 'GM_setValue', summary: 'Store script data', risk: 'low' },
  { id: 'GM_getValue', summary: 'Read script data', risk: 'low' },
  { id: 'GM_deleteValue', summary: 'Delete script data', risk: 'low' },
  { id: 'GM_listValues', summary: 'List stored keys', risk: 'low' },
  { id: 'GM_xmlhttpRequest', summary: 'Cross-origin HTTP', risk: 'high' },
  { id: 'GM_webRequest', summary: 'Block/redirect requests (limited)', risk: 'high' },
  { id: 'GM_cookie', summary: 'Read/write cookies', risk: 'high' },
  { id: 'GM_audio', summary: 'Mute tab audio', risk: 'low' },
  { id: 'unsafeWindow', summary: 'Access page JavaScript context', risk: 'high' },
  { id: 'window.close', summary: 'Close tab', risk: 'medium' },
  { id: 'window.focus', summary: 'Focus window', risk: 'low' },
  { id: 'window.onurlchange', summary: 'SPA URL change events', risk: 'low' },
  { id: 'none', summary: 'No sandbox — runs in page context', risk: 'high' },
]

export const GM_API_SNIPPETS: Record<string, string> = {
  'GM.setValue': "await GM.setValue('key', value)",
  'GM.getValue': "await GM.getValue('key', defaultValue)",
  'GM.xmlHttpRequest': `await GM.xmlHttpRequest({ method: 'GET', url: 'https://example.com' })`,
  'GM_addStyle': "GM_addStyle('body { }')",
  'GM_registerMenuCommand': "GM_registerMenuCommand('Label', () => { })",
}

export function normalizeGrants(grants: string[]): string[] {
  if (grants.some((g) => g.toLowerCase() === 'none')) return ['none']
  return [...new Set(grants.map((g) => g.trim()).filter(Boolean))]
}

export function usesSandbox(grants: string[]): boolean {
  const n = normalizeGrants(grants)
  if (n.includes('none')) return false
  return true
}

export function grantInfo(id: string): GrantInfo | undefined {
  return GM_GRANTS.find((g) => g.id === id || g.id.toLowerCase() === id.toLowerCase())
}
