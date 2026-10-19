import { THREAT_CATEGORIES } from './types'
import type { ProtectionBlockedCounts, ProtectionState, ProtectionStats } from './types'

export const THREAT_RULE_ID_BASE = 2_000_000
export const TRUSTED_RULE_ID_BASE = 2_900_000
export const PROCEED_SESSION_RULE_ID_BASE = 2_950_000

export const THREAT_RULE_PRIORITY = 200
export const TRUSTED_RULE_PRIORITY = 300

export const DOMAINS_PER_RULE = 1000
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
