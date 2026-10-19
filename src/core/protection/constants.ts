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
  lookalike: true,
  trusted: [],
}

const EMPTY_BLOCKED: ProtectionBlockedCounts = {
  phishing: 0,
  malware: 0,
  scam: 0,
  lookalike: 0,
}

export function emptyProtectionStats(): ProtectionStats {
  return { blocked: { ...EMPTY_BLOCKED }, recent: [], since: Date.now() }
}

export const CONTENT_SCRIPT_IDS = {
  heuristics: 'protection-heuristics',
} as const

export const PROTECTION_FILES = {
  threatsJson: 'protection/threats.json',
  heuristicsJs: 'protection/scripts/heuristics.js',
  blockedHtml: 'blocked.html',
} as const
