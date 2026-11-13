const TOOL_PATH = '/tools/design/responsive-viewer'

export function isSimulatorStudioSearch(search: string): boolean {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return query.get('studio') === '1'
}

export function simulatorStudioHash(params: { url?: string; device?: string } = {}): string {
  const query = new URLSearchParams()
  query.set('studio', '1')
  if (params.url) query.set('url', params.url)
  if (params.device) query.set('device', params.device)
  return `${TOOL_PATH}?${query.toString()}`
}

export function simulatorStudioUrl(params: { url?: string; device?: string } = {}): string {
  const base = typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('index.html') : 'index.html'
  return `${base}#${simulatorStudioHash(params)}`
}

export function studioParamsFromSearch(search: string): { url: string | null; device: string | null } {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const url = query.get('url')
  const device = query.get('device')
  return { url: url && url.trim() ? url : null, device: device && device.trim() ? device : null }
}

export function openSimulatorStudio(params: { url?: string; device?: string } = {}): void {
  const url = simulatorStudioUrl(params)
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url })
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
