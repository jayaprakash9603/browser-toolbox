export const THREAT_CATEGORIES = ['phishing', 'malware', 'scam', 'lookalike'] as const

export type ThreatCategory = (typeof THREAT_CATEGORIES)[number]

export type ThreatListCategory = 'phishing' | 'malware' | 'scam'

export interface ProtectionState {
  enabled: boolean
  phishing: boolean
  malware: boolean
  scams: boolean
  lookalike: boolean
  trusted: string[]
}

export interface ThreatsFile {
  generated: string
  sources: { id: string; category: string; lines: number; license: string }[]
  counts: { phishing: number; malware: number; scam: number; total: number }
  phishing: string[]
  malware: string[]
  scam: string[]
}

export interface ProtectionBlockedCounts {
  phishing: number
  malware: number
  scam: number
  lookalike: number
}

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
