export function isRestrictedCaptureUrl(url: string | undefined): boolean {
  if (!url) return true
  const lower = url.toLowerCase()
  if (lower.startsWith('chrome://') || lower.startsWith('chrome-extension://')) return true
  if (lower.startsWith('chrome-untrusted://') || lower.startsWith('devtools://')) return true
  if (lower.startsWith('view-source:')) return true
  if (lower.startsWith('edge://') || lower.startsWith('about:')) return true
  if (lower.includes('chrome.google.com/webstore')) return true
  if (/^https?:\/\/chromewebstore\.google\.com(\/|$)/.test(lower)) return true
  if (/^https?:\/\/microsoftedge\.microsoft\.com\/addons(\/|$)/.test(lower)) return true
  if (lower.endsWith('.pdf') || lower.includes('pdf-viewer')) return true
  return false
}
