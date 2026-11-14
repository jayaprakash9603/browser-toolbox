import { extensionApi } from '@/platform/browser'

/** Opens PDF Toolkit in a full browser tab with the same deep link as the current view. */
export function openPdfToolkitTab(hashRoute: string): void {
  const api = extensionApi()
  if (!api?.tabs?.create || !api.runtime?.getURL) {
    window.open(`${window.location.origin}${window.location.pathname}#${hashRoute}`, '_blank', 'noopener,noreferrer')
    return
  }
  void api.tabs.create({
    url: api.runtime.getURL(`index.html#${hashRoute}`),
    active: true,
  })
}