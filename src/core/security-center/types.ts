export const SECURITY_CENTER_TABS = [
  'overview',
  'protection',
  'privacy',
  'trackers',
  'cookies',
  'website-audit',
  'network',
  'dns-and-ip',
  'fingerprint',
  'passwords',
  'data-breaches',
  'file-scanner',
  'url-scanner',
  'permissions',
  'security-logs',
  'settings',
] as const

export type SecurityCenterTab = (typeof SECURITY_CENTER_TABS)[number]

export const CHECK_RESULTS = ['passed', 'warning', 'failed', 'not_checked', 'not_available'] as const
export type CheckResult = (typeof CHECK_RESULTS)[number]

export const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const
export type SecuritySeverity = (typeof SEVERITIES)[number]

export const CHECK_CATEGORIES = [
  'connection',
  'protection',
  'privacy',
  'trackers',
  'headers',
  'resources',
  'permissions',
  'cookies',
] as const
export type CheckCategory = (typeof CHECK_CATEGORIES)[number]

export interface SecurityFinding {
  id: string
  name: string
  category: CheckCategory
  result: CheckResult
  severity: SecuritySeverity
  evidence: string
  timestamp: number
  recommendation: string
  availability: CheckResult
  explanation?: string
  source?: string
}

export type SecurityEventType =
  | 'tracker_detected'
  | 'tracker_blocked'
  | 'malicious_domain_blocked'
  | 'suspicious_url_warning'
  | 'dangerous_download_warning'
  | 'cookie_deleted'
  | 'security_audit_completed'
  | 'insecure_resource_observed'
  | 'permission_inspected'
  | 'protection_setting_changed'
  | 'allowlist_changed'
  | 'blocklist_changed'
  | 'https_upgrade'
  | 'protection_paused'
  | 'protection_resumed'

export type SecurityEventCategory =
  | 'protection'
  | 'privacy'
  | 'trackers'
  | 'cookies'
  | 'audit'
  | 'network'
  | 'settings'
  | 'permissions'

export interface SecurityEvent {
  id: string
  type: SecurityEventType
  category: SecurityEventCategory
  severity: SecuritySeverity
  domain?: string
  timestamp: number
  description: string
  evidence?: string
  action?: string
  source: string
}

export type TrackerCategory =
  | 'advertising'
  | 'analytics'
  | 'social'
  | 'fingerprinting'
  | 'session_recording'
  | 'marketing'
  | 'unknown'

export type TrackerStatus = 'blocked' | 'detected' | 'observed' | 'allowed' | 'unknown'

export type TrackerConfidence = 'high' | 'medium' | 'low'

export interface TrackerRecord {
  id: string
  domain: string
  category: TrackerCategory
  requestType: string
  thirdParty: boolean
  status: TrackerStatus
  timestamp: number
  matchedRule?: string
  initiator?: string
  confidence: TrackerConfidence
  source: string
  url?: string
  tabId?: number
}

export type NetworkResourceKind =
  | 'document'
  | 'xhr'
  | 'script'
  | 'stylesheet'
  | 'image'
  | 'font'
  | 'media'
  | 'other'
  | 'blocked'
  | 'failed'

export interface NetworkRequestRecord {
  id: string
  requestId: string
  tabId: number
  url: string
  hostname: string
  method: string
  status?: number
  resourceType: string
  kind: NetworkResourceKind
  timestamp: number
  completedAt?: number
  initiator?: string
  thirdParty: boolean
  trackerCategory?: TrackerCategory
  error?: string
  blocked: boolean
  requestHeaders?: { name: string; value?: string }[]
  responseHeaders?: { name: string; value?: string }[]
}

export interface CookieMetadata {
  name: string
  domain: string
  path: string
  expirationDate?: number
  session: boolean
  secure: boolean
  httpOnly: boolean
  sameSite: 'unspecified' | 'no_restriction' | 'lax' | 'strict' | string
  storeId: string
  hostOnly: boolean
  partitionKey?: { topLevelSite?: string }
  firstParty: boolean | null
  observations: string[]
}

export type ProtectionModuleId =
  | 'malware'
  | 'phishing'
  | 'redirects'
  | 'downloads'
  | 'thirdPartyScripts'
  | 'miners'
  | 'popups'
  | 'ads'
  | 'trackers'
  | 'mixedContent'
  | 'httpsUpgrade'
  | 'executables'

export type ProtectionPosture = 'balanced' | 'strict' | 'custom'

export interface ProtectionRule {
  id: string
  name: string
  category: ProtectionModuleId
  enabled: boolean
  source: 'builtin' | 'user' | 'list'
  version: string
  updatedAt: number
  pattern?: string
}

export type UrlScanState =
  | 'no_known_issue'
  | 'suspicious'
  | 'known_malicious'
  | 'unknown'
  | 'provider_unavailable'
  | 'not_checked'

export interface UrlScanFinding {
  id: string
  name: string
  severity: SecuritySeverity
  evidence: string
  recommendation: string
}

export interface URLScanResult {
  url: string
  domain: string
  state: UrlScanState
  findings: UrlScanFinding[]
  severity: SecuritySeverity
  provider?: string
  lookedUpAt?: number
  confidence: TrackerConfidence
  recommendations: string[]
}

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS'

export interface DNSRecord {
  type: DnsRecordType
  name: string
  data: string
  ttl?: number
}

export interface DnsLookupResult {
  query: string
  type: DnsRecordType
  records: DNSRecord[]
  provider: string
  timestamp: number
  error?: string
}

export type FingerprintClass = 'common' | 'potentially_identifying' | 'unavailable' | 'not_tested'

export interface FingerprintSignal {
  id: string
  name: string
  value: string
  classification: FingerprintClass
  explanation: string
  recommendation?: string
}

export type SitePermissionState = 'granted' | 'denied' | 'prompt' | 'not_supported'

export interface SitePermissionStatus {
  name: string
  permission: string
  state: SitePermissionState
  howToManage: string
}

export type ProviderKind = 'urlReputation' | 'breach' | 'dns' | 'ipReputation' | 'fileReputation'

export interface SecurityProviderConfig {
  kind: ProviderKind
  enabled: boolean
  endpoint?: string
  hasApiKey: boolean
}

export interface SecurityScanReport {
  id: string
  url: string
  domain: string
  https: boolean
  restricted: boolean
  timestamp: number
  score: number | null
  scoreExplanation: string
  findings: SecurityFinding[]
  completedChecks: number
  applicableChecks: number
  trackersBlocked: number
  trackersDetected: number
  thirdPartyCookies: number | null
  protectionEnabled: boolean
  adblockEnabled: boolean
}

export interface SecurityCenterSettings {
  version: 1
  posture: ProtectionPosture
  httpsUpgrade: boolean
  mixedContentWarnings: boolean
  notifications: boolean
  scanOnOpen: boolean
  eventRetention: number
  networkLogSize: number
  dnsProviderUrl: string
  dnsProviderName: string
  externalLookupConsent: boolean
  blocklist: string[]
  allowlist: string[]
  lastScanAt?: number
  lastScanDomain?: string
}

export interface SecurityProviderSecrets {
  version: 1
  breachApiKey?: string
  urlReputationApiKey?: string
  ipReputationApiKey?: string
  fileReputationApiKey?: string
  safeBrowsingApiKey?: string
}

export interface PauseSnapshot {
  until: number
  protectionEnabled: boolean
  adblockEnabled: boolean
}

export interface BreachLookupResult {
  state: 'not_configured' | 'in_progress' | 'results' | 'no_results' | 'rate_limited' | 'unavailable'
  provider: string
  lookedUpAt?: number
  accountHint?: string
  breaches: Array<{
    name: string
    domain?: string
    breachDate?: string
    dataClasses: string[]
    description?: string
  }>
  error?: string
}
