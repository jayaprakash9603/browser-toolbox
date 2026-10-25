export const SCRIPT_STUDIO_ROUTE = '/tools/sites/script-studio'

export function isUserScriptUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.pathname.endsWith('.user.js') || u.pathname.endsWith('.user.js/')
  } catch {
    return url.endsWith('.user.js')
  }
}

export function scriptStudioPageUrl(query = ''): string {
  return chrome.runtime.getURL(`index.html#${SCRIPT_STUDIO_ROUTE}${query}`)
}

export function openInstallReview(url: string): void {
  void chrome.tabs.create({ url: scriptStudioPageUrl(`?install=${encodeURIComponent(url)}`) })
}

export function registerUserScriptInstallDetection(): void {
  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return
    if (!isUserScriptUrl(details.url)) return
    if (details.url.startsWith(chrome.runtime.getURL(''))) return
    openInstallReview(details.url)
  })
}
