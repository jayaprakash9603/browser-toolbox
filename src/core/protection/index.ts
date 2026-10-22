export {
  CONTENT_SCRIPT_IDS,
  DEFAULT_PROTECTION_STATE,
  DOWNLOAD_GESTURE_WINDOW_MS,
  emptyProtectionStats,
  MAX_RECENT_ENTRIES,
  PAGE_COMMAND_KEY,
  PAGE_MESSAGE_KEY,
  PROTECTION_FILES,
  PROTECTION_RULES_VERSION_KEY,
  SAFE_DOMAINS,
  THREAT_RULE_ID_BASE,
} from './constants'
export { assessDownload, downloadHost, fileExtension, isRiskyFile } from './downloads'
export type { DownloadSignals, DownloadVerdict } from './downloads'
export {
  assessPage,
  assessScamText,
  BRAND_OFFICIAL,
  looksLikeShellCommand,
  registrableDomain,
} from './heuristics'
export type { PageSignals, RiskLevel, RiskVerdict } from './heuristics'
export {
  addTrustedHost,
  getProtectionState,
  getProtectionStats,
  isThreatCategory,
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
  isSafeToBlock,
  proceedOnceRuleId,
} from './rules'
export { siteOfUrl } from './domain'
export {
  allowSite,
  OPENED_TAB_GESTURE_MS,
  openedTabRecord,
  shouldBlockOpenedTabNavigation,
} from './openedTabs'
export type { OpenedTabRecord } from './openedTabs'
export { THREAT_CATEGORIES, THREAT_LIST_CATEGORIES } from './types'
export type {
  ProtectionBlockedCounts,
  ProtectionRecentEntry,
  ProtectionState,
  ProtectionStats,
  ThreatCategory,
  ThreatListCategory,
  ThreatsFile,
} from './types'
