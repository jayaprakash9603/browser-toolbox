import { hasCapability } from '@/platform/capabilities'
import { extensionApi, isFirefoxRuntime } from '@/platform/browser'

export type AdblockRuntimeKind = 'desktop_chromium' | 'desktop_firefox' | 'mobile_firefox' | 'other'

export type NetworkStatsMode = 'feedback' | 'reconcile' | 'unavailable'

export interface AdblockRuntimeProfile {
  kind: AdblockRuntimeKind
  isMobile: boolean
  isFirefox: boolean
  supportsLiveNetworkStats: boolean
  supportsActionBadge: boolean
  prefersTopFrameMainScripts: boolean
  networkStatsMode: NetworkStatsMode
  dynamicRuleBudget: number
}

const DEFAULT_DYNAMIC_BUDGET = 4900

function isAndroidUserAgent(userAgent: string): boolean {
  return /Android/i.test(userAgent)
}

function resolveKind(isFirefox: boolean, isMobile: boolean): AdblockRuntimeKind {
  if (isFirefox && isMobile) return 'mobile_firefox'
  if (isFirefox) return 'desktop_firefox'
  if (isMobile) return 'other'
  return 'desktop_chromium'
}

/**
 * Capability and platform profile for ad-block sync, stats, and content-script registration.
 * Uses runtime APIs and user agent — not build-time `BUILD_TARGET` alone (same XPI on Fenix and desktop).
 */
export function getAdblockRuntimeProfile(): AdblockRuntimeProfile {
  const isFirefox = isFirefoxRuntime()
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isMobile = isAndroidUserAgent(userAgent) && isFirefox
  const kind = resolveKind(isFirefox, isMobile)
  const supportsLiveNetworkStats = hasCapability('declarativeNetRequestFeedback')
  const supportsActionBadge = Boolean(extensionApi()?.action?.setBadgeText && !isFirefox)
  const networkStatsMode: NetworkStatsMode = supportsLiveNetworkStats
    ? 'feedback'
    : extensionApi()?.declarativeNetRequest?.getMatchedRules
      ? 'reconcile'
      : 'unavailable'
  const prefersTopFrameMainScripts = kind === 'mobile_firefox'

  return {
    kind,
    isMobile,
    isFirefox,
    supportsLiveNetworkStats,
    supportsActionBadge,
    prefersTopFrameMainScripts,
    networkStatsMode,
    dynamicRuleBudget: DEFAULT_DYNAMIC_BUDGET,
  }
}

export function shouldReconcileNetworkOnTabComplete(profile: AdblockRuntimeProfile): boolean {
  return profile.networkStatsMode === 'reconcile'
}
