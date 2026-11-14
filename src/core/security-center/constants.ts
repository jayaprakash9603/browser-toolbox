import type { SecurityCenterSettings } from './types'

export const SECURITY_CENTER_SETTINGS_VERSION = 1 as const

export const SECURITY_NETLOG_PORT = 'security-center-netlog'

export const PAUSE_ALARM_NAME = 'security-center-pause-restore'
export const PAUSE_DURATION_MS = 5 * 60 * 1000
export const PAUSE_SESSION_KEY = 'securityCenterPause'

export const MAX_EVENTS = 500
export const DEFAULT_EVENT_RETENTION = 500
export const DEFAULT_NETWORK_LOG_SIZE = 400

/** After interceptor's 3_000_000–4_000_000 range so protection sync cannot wipe these rules. */
export const HTTPS_UPGRADE_RULE_ID = 4_100_000
export const CSC_BLOCKLIST_RULE_ID_BASE = 4_101_000
export const CSC_BLOCKLIST_RULE_ID_MAX = 4_199_999
export const CSC_BLOCKLIST_PRIORITY = 180

export const DEFAULT_DNS_PROVIDER_URL = 'https://cloudflare-dns.com/dns-query'
export const DEFAULT_DNS_PROVIDER_NAME = 'Cloudflare'

export const DEFAULT_SECURITY_CENTER_SETTINGS: SecurityCenterSettings = {
  version: 1,
  posture: 'balanced',
  httpsUpgrade: false,
  mixedContentWarnings: true,
  notifications: false,
  scanOnOpen: false,
  eventRetention: DEFAULT_EVENT_RETENTION,
  networkLogSize: DEFAULT_NETWORK_LOG_SIZE,
  dnsProviderUrl: DEFAULT_DNS_PROVIDER_URL,
  dnsProviderName: DEFAULT_DNS_PROVIDER_NAME,
  externalLookupConsent: false,
  blocklist: [],
  allowlist: [],
}

export const AUTH_COOKIE_NAME_RE =
  /^(?:sid|session|sess|auth|token|jwt|access|refresh|csrf|xsrf|sso|login|remember)/i
