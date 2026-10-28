import type { BugEnvironment, PageContext } from './report'

interface UaBrand {
  brand: string
  version: string
}

export interface UaHighEntropy {
  platform?: string
  platformVersion?: string
  fullVersionList?: UaBrand[]
}

interface UaData {
  getHighEntropyValues?: (hints: string[]) => Promise<UaHighEntropy>
}

interface PageMetrics {
  innerWidth: number
  innerHeight: number
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  language: string
  timezone: string
  userAgent: string
}

const BROWSER_PATTERNS: [RegExp, string][] = [
  [/Edg(?:e|A|iOS)?\/([\d.]+)/, 'Microsoft Edge'],
  [/OPR\/([\d.]+)/, 'Opera'],
  [/(?:Firefox|FxiOS)\/([\d.]+)/, 'Firefox'],
  [/(?:Chrome|CriOS)\/([\d.]+)/, 'Chrome'],
  [/Version\/([\d.]+).*Safari/, 'Safari'],
]

export function describeBrowser(userAgent: string): string {
  for (const [pattern, name] of BROWSER_PATTERNS) {
    const match = userAgent.match(pattern)
    if (match) return `${name} ${match[1].split('.')[0]}`
  }
  return 'Unknown browser'
}

export function describeOs(userAgent: string): string {
  const ios = userAgent.match(/(?:iPhone|iPad|iPod).*? OS ([\d_]+)/)
  if (ios) return `iOS ${ios[1].replace(/_/g, '.')}`
  const android = userAgent.match(/Android ([\d.]+)/)
  if (android) return `Android ${android[1]}`
  if (/Windows NT 10/.test(userAgent)) return 'Windows 10/11'
  if (/Windows/.test(userAgent)) return 'Windows'
  if (/CrOS/.test(userAgent)) return 'ChromeOS'
  if (/Mac OS X|Macintosh/.test(userAgent)) return 'macOS'
  if (/Linux/.test(userAgent)) return 'Linux'
  return 'Unknown OS'
}

const GENERIC_BRAND = /not.?a.?brand|chromium/i

/** Full browser version from client hints; the user-agent string only carries the major version. */
export function refineBrowser(values: UaHighEntropy, fallback: string): string {
  const brands = values.fullVersionList ?? []
  const brand =
    brands.find((item) => !GENERIC_BRAND.test(item.brand)) ??
    brands.find((item) => /chromium/i.test(item.brand))
  return brand ? `${brand.brand} ${brand.version}` : fallback
}

/** Windows 11 reports platform version 13 or higher; the user-agent string says 10 for both. */
export function refineOs(values: UaHighEntropy, fallback: string): string {
  const { platform, platformVersion } = values
  if (!platform) return fallback
  if (platform === 'Windows') {
    const major = Number(platformVersion?.split('.')[0])
    if (!Number.isFinite(major) || !platformVersion) return 'Windows'
    return major >= 13 ? 'Windows 11' : major > 0 ? 'Windows 10' : 'Windows'
  }
  return platformVersion ? `${platform} ${platformVersion}` : platform
}

const size = (width: number, height: number) => `${width} × ${height}`

async function readPageMetrics(tabId: number): Promise<PageMetrics | null> {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (): PageMetrics => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        pixelRatio: window.devicePixelRatio,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userAgent: navigator.userAgent,
      }),
    })
    return (injection?.result as PageMetrics | undefined) ?? null
  } catch {
    return null
  }
}

async function readClientHints(): Promise<UaHighEntropy | null> {
  const uaData = (navigator as Navigator & { userAgentData?: UaData }).userAgentData
  try {
    return (await uaData?.getHighEntropyValues?.(['platformVersion', 'fullVersionList'])) ?? null
  } catch {
    return null
  }
}

/**
 * Reads the environment from the page itself; chrome:// and Web Store pages can't be scripted,
 * so those fall back to the tab size and the panel's own browser values.
 */
export async function collectEnvironment(tab?: chrome.tabs.Tab): Promise<BugEnvironment> {
  const [metrics, hints] = await Promise.all([
    tab?.id != null ? readPageMetrics(tab.id) : Promise.resolve(null),
    readClientHints(),
  ])
  const userAgent = metrics?.userAgent ?? navigator.userAgent
  const browser = describeBrowser(userAgent)
  const os = describeOs(userAgent)
  const pixelRatio = metrics?.pixelRatio ?? window.devicePixelRatio
  return {
    browser: hints ? refineBrowser(hints, browser) : browser,
    os: hints ? refineOs(hints, os) : os,
    viewport: metrics
      ? size(metrics.innerWidth, metrics.innerHeight)
      : tab?.width && tab.height
        ? size(tab.width, tab.height)
        : '',
    screen: metrics
      ? size(metrics.screenWidth, metrics.screenHeight)
      : size(window.screen.width, window.screen.height),
    pixelRatio: String(Math.round(pixelRatio * 100) / 100),
    language: metrics?.language ?? navigator.language,
    timezone: metrics?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent,
  }
}

export function pageFromTab(tab: chrome.tabs.Tab | undefined): PageContext | null {
  if (!tab) return null
  return { title: tab.title ?? '', url: tab.url ?? '', favIconUrl: tab.favIconUrl }
}
