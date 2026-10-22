export const THREAT_LIST_CATEGORIES = ['phishing', 'malware', 'scam', 'miner'] as const

export type ThreatListCategory = (typeof THREAT_LIST_CATEGORIES)[number]

export const THREAT_CATEGORIES = [
  ...THREAT_LIST_CATEGORIES,
  'lookalike',
  'techscam',
  'clipboard',
  'notification',
  'download',
  'redirect',
] as const

export type ThreatCategory = (typeof THREAT_CATEGORIES)[number]

export interface ProtectionState {
  enabled: boolean
  phishing: boolean
  malware: boolean
  scams: boolean
  /** Block cryptocurrency mining scripts and pools. */
  miners: boolean
  lookalike: boolean
  /** Detect tech-support scam pages and break browser lockers (dialog loops, fullscreen, history traps). */
  scamGuard: boolean
  /** Stop pages putting hidden shell commands on the clipboard (ClickFix / fake CAPTCHA attacks). */
  clipboardGuard: boolean
  /** Deny notification permission requests that are not triggered by a click. */
  notificationGuard: boolean
  /** Cancel downloads from known-bad hosts and ask before automatic executable downloads. */
  downloadGuard: boolean
  /** Stop a tab a site opened from later switching to a different site on its own. */
  openedTabGuard: boolean
  trusted: string[]
}

export interface ThreatsFile {
  generated: string
  sources: { id: string; category: string; lines: number; license: string }[]
  counts: Record<ThreatListCategory, number> & { total: number }
  phishing: string[]
  malware: string[]
  scam: string[]
  miner?: string[]
}

export type ProtectionBlockedCounts = Record<ThreatCategory, number>

export interface ProtectionRecentEntry {
  host: string
  category: ThreatCategory
  at: number
}

export interface ProtectionStats {
  blocked: ProtectionBlockedCounts
  recent: ProtectionRecentEntry[]
  since: number
}
