/** Full-page capture viewer inside the main toolbox app (hash route). */
export function captureViewerUrl(params: {
  session?: string
  history?: boolean
  options?: boolean
}): string {
  const q = new URLSearchParams()
  if (params.session) q.set('session', params.session)
  if (params.history) q.set('history', '1')
  if (params.options) q.set('options', '1')
  const query = q.toString()
  const hash = `/tools/screenshots/capture${query ? `?${query}` : ''}`
  return `${chrome.runtime.getURL('index.html')}#${hash}`
}

export function isCaptureViewerSearch(search: string): boolean {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return q.has('session') || q.get('history') === '1' || q.get('options') === '1'
}
