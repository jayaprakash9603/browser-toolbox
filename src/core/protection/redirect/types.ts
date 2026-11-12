export const REDIRECT_CLASSIFICATIONS = [
  'TRUSTED_REDIRECT',
  'NORMAL_REDIRECT',
  'SUSPICIOUS_REDIRECT',
  'MALICIOUS_REDIRECT',
  'UNKNOWN_REDIRECT',
] as const

export type RedirectClassification = (typeof REDIRECT_CLASSIFICATIONS)[number]

export const REDIRECT_RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const

export type RedirectRiskLevel = (typeof REDIRECT_RISK_LEVELS)[number]

export const REDIRECT_ACTIONS = ['allow', 'warn', 'block'] as const

export type RedirectAction = (typeof REDIRECT_ACTIONS)[number]

export const UNKNOWN_REDIRECT_BEHAVIORS = ['block', 'warn', 'allow'] as const

export type UnknownRedirectBehavior = (typeof UNKNOWN_REDIRECT_BEHAVIORS)[number]

export const WORKFLOW_KINDS = ['payment', 'auth', 'banking'] as const

export type WorkflowKind = (typeof WORKFLOW_KINDS)[number]

export interface WorkflowHostPolicy {
  host: string
  kind: WorkflowKind
  pathPrefix?: string
}

export interface RedirectRiskWeights {
  knownMalicious: number
  confirmedPhishing: number
  crossDomainUnrelated: number
  multipleUnexpected: number
  unknownJavascript: number
  unexpectedMetaRefresh: number
  verifiedPayment: number
  verifiedAuth: number
  sameOrigin: number
}

export interface RedirectProtectionSettings {
  enabled: boolean
  blockMalicious: boolean
  detectAutomatic: boolean
  detectJavascript: boolean
  detectMetaRefresh: boolean
  detectChains: boolean
  allowPayment: boolean
  allowAuth: boolean
  allowBanking: boolean
  unknownBehavior: UnknownRedirectBehavior
  sessionTtlMs: number
  maxRedirects: number
  riskWeights: RedirectRiskWeights
}

export interface RedirectSession {
  tabId: number
  openerTabId?: number
  initiatingHost: string
  initiatingSite: string
  kind: WorkflowKind
  createdAt: number
  expiresAt: number
  redirectCount: number
  chainHosts: string[]
}

export interface RedirectContext {
  sourceUrl?: string
  destUrl: string
  sourceHost: string | null
  destHost: string | null
  sourceSite: string | null
  destSite: string | null
  initiatingSite: string | null
  initiatingHost: string | null
  tabId: number
  openerTabId?: number
  transitionType?: string
  transitionQualifiers?: string[]
  metaRefresh: boolean
  lastGestureTabAt: number
  lastGestureOpenerAt: number
  now: number
  session: RedirectSession | null
  recentHopCount: number
  destThreatCategory: string | null
  isTrustedDest: boolean
  isOpenedTab: boolean
  workflowHosts: WorkflowHostPolicy[]
  settings: RedirectProtectionSettings
}

export interface RedirectVerdict {
  classification: RedirectClassification
  risk: RedirectRiskLevel
  score: number
  reasons: string[]
  action: RedirectAction
  startSession?: { kind: WorkflowKind; initiatingHost: string; initiatingSite: string }
  completeSession?: boolean
}

export interface RedirectLogEntry {
  id: string
  sourceHost: string
  destHost: string
  redirectType: string
  classification: RedirectClassification
  risk: RedirectRiskLevel
  score: number
  reasons: string[]
  action: RedirectAction
  tabId: number
  at: number
  falsePositive?: boolean
}
