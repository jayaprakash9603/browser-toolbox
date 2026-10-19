export {
  CONTENT_SCRIPT_IDS,
  DEFAULT_PROTECTION_STATE,
  emptyProtectionStats,
  MAX_RECENT_ENTRIES,
  PROTECTION_FILES,
  PROTECTION_RULES_VERSION_KEY,
  THREAT_RULE_ID_BASE,
} from './constants'
export { assessPage, BRAND_OFFICIAL, registrableDomain } from './heuristics'
export type { PageSignals, RiskLevel, RiskVerdict } from './heuristics'
export {
  addTrustedHost,
  getProtectionState,
  getProtectionStats,
  isTrustedHost,
  recordProtectionBlock,
  removeTrustedHost,
  resetProtectionStats,
  updateProtectionState,
} from './protectionService'
export {
  buildProceedOnceRule,
  buildThreatRules,
  buildTrustedAllowRules,
  isProtectionManagedRuleId,
  proceedOnceRuleId,
} from './rules'
export type {
  ProtectionBlockedCounts,
  ProtectionRecentEntry,
  ProtectionState,
  ProtectionStats,
  ThreatCategory,
  ThreatListCategory,
  ThreatsFile,
} from './types'
