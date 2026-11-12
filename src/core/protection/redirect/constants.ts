import { OPENED_TAB_GESTURE_MS } from '../openedTabs'
import type { RedirectProtectionSettings, RedirectRiskWeights } from './types'

export { OPENED_TAB_GESTURE_MS as REDIRECT_GESTURE_MS }

export const DEFAULT_SESSION_TTL_MS = 120_000
export const DEFAULT_MAX_REDIRECTS = 8
export const REDIRECT_CHAIN_WINDOW_MS = 30_000
export const MAX_REDIRECT_LOG_ENTRIES = 50

export const SESSION_STORAGE_KEY = 'protectionRedirectSessions'
export const GESTURE_SESSION_KEY = 'protectionRedirectGestures'
export const HOP_COUNT_SESSION_KEY = 'protectionRedirectHopCounts'
export const META_REFRESH_SESSION_KEY = 'protectionRedirectMetaRefresh'

export const DEFAULT_RISK_WEIGHTS: RedirectRiskWeights = {
  knownMalicious: 100,
  confirmedPhishing: 100,
  crossDomainUnrelated: 70,
  multipleUnexpected: 45,
  unknownJavascript: 40,
  unexpectedMetaRefresh: 40,
  verifiedPayment: 15,
  verifiedAuth: 15,
  sameOrigin: 5,
}

export const DEFAULT_REDIRECT_PROTECTION: RedirectProtectionSettings = {
  enabled: true,
  blockMalicious: true,
  detectAutomatic: true,
  detectJavascript: true,
  detectMetaRefresh: true,
  detectChains: true,
  allowPayment: true,
  allowAuth: true,
  allowBanking: true,
  unknownBehavior: 'warn',
  sessionTtlMs: DEFAULT_SESSION_TTL_MS,
  maxRedirects: DEFAULT_MAX_REDIRECTS,
  riskWeights: { ...DEFAULT_RISK_WEIGHTS },
}
