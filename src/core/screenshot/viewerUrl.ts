/** What the editor does by itself as soon as a fresh capture is ready. */
export type CaptureAutoAction = 'copy' | 'save'

/** Full-page capture viewer inside the main toolbox app (hash route). */
export function captureViewerUrl(params: {
  session?: string
  history?: boolean
  options?: boolean
  auto?: CaptureAutoAction
}): string {
  const q = new URLSearchParams()
  if (params.session) q.set('session', params.session)
  if (params.history) q.set('history', '1')
  if (params.options) q.set('options', '1')
  if (params.auto) q.set('auto', params.auto)
  const query = q.toString()
  const hash = `/tools/screenshots/capture${query ? `?${query}` : ''}`
  return `${chrome.runtime.getURL('index.html')}#${hash}`
}

export function isCaptureViewerSearch(search: string): boolean {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return q.has('session') || q.get('history') === '1' || q.get('options') === '1'
}

export function captureAutoAction(params: URLSearchParams): CaptureAutoAction | null {
  const value = params.get('auto')
  return value === 'copy' || value === 'save' ? value : null
}

/** `hash` without the one-shot `auto` parameter, so reloading the editor doesn't copy or save again. */
export function withoutAutoAction(hash: string): string {
  const index = hash.indexOf('?')
  if (index === -1) return hash
  const query = new URLSearchParams(hash.slice(index + 1))
  query.delete('auto')
  const rest = query.toString()
  return rest ? `${hash.slice(0, index)}?${rest}` : hash.slice(0, index)
}
