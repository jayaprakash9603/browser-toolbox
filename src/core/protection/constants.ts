import { THREAT_CATEGORIES } from './types'
import type { ProtectionBlockedCounts, ProtectionState, ProtectionStats } from './types'

export const THREAT_RULE_ID_BASE = 2_000_000
export const TRUSTED_RULE_ID_BASE = 2_900_000
export const PROCEED_SESSION_RULE_ID_BASE = 2_950_000

export const THREAT_RULE_PRIORITY = 200
export const TRUSTED_RULE_PRIORITY = 300

export const DOMAINS_PER_RULE = 1000

/**
 * Sites (and all their subdomains) that list blocking and the download guard never touch.
 * Hosting platforms whose customer subdomains are often abused (github.io, pages.dev, ...) are
 * deliberately absent.
 */
export const SAFE_DOMAINS = [
  'google.com',
  'googleapis.com',
  'gstatic.com',
  'youtube.com',
  'ytimg.com',
  'gmail.com',
  'bing.com',
  'duckduckgo.com',
  'yahoo.com',
  'microsoft.com',
  'microsoftonline.com',
  'live.com',
  'outlook.com',
  'office.com',
  'apple.com',
  'icloud.com',
  'amazon.com',
  'facebook.com',
  'instagram.com',
  'whatsapp.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'wikipedia.org',
  'github.com',
  'githubusercontent.com',
  'stackoverflow.com',
  'reddit.com',
  'paypal.com',
  'cloudflare.com',
  'chatgpt.com',
  'openai.com',
  'netflix.com',
  'zoom.us',
  'mozilla.org',
]
export const MAX_RECENT_ENTRIES = 20

export const PROTECTION_RULES_VERSION_KEY = 'protectionRulesVersion'

export const DEFAULT_PROTECTION_STATE: ProtectionState = {
  enabled: true,
  phishing: true,
  malware: true,
  scams: true,
  miners: true,
  lookalike: true,
  scamGuard: true,
  clipboardGuard: true,
  notificationGuard: true,
  downloadGuard: true,
  openedTabGuard: true,
  trusted: [],
}

export function emptyProtectionStats(): ProtectionStats {
  const blocked = Object.fromEntries(THREAT_CATEGORIES.map((c) => [c, 0])) as ProtectionBlockedCounts
  return { blocked, recent: [], since: Date.now() }
}

export const CONTENT_SCRIPT_IDS = {
  heuristics: 'protection-heuristics',
  scamGuard: 'protection-guard-scam',
  clipboardGuard: 'protection-guard-clipboard',
  notificationGuard: 'protection-guard-notify',
} as const

export const PROTECTION_FILES = {
  threatsJson: 'protection/threats.json',
  heuristicsJs: 'protection/scripts/heuristics.js',
  scamGuardJs: 'protection/scripts/guard-scam.js',
  clipboardGuardJs: 'protection/scripts/guard-clipboard.js',
  notificationGuardJs: 'protection/scripts/guard-notify.js',
  blockedHtml: 'blocked.html',
} as const

/** Message key the page-world guards use to talk to the isolated protection script. */
export const PAGE_MESSAGE_KEY = '__toolboxProtection'
/** Message key the isolated script uses to command the page-world guards. */
export const PAGE_COMMAND_KEY = '__toolboxProtectionCmd'

/** How long after a click or key press a download still counts as user-initiated. */
export const DOWNLOAD_GESTURE_WINDOW_MS = 10_000
