export type RunAt =
  | 'document-start'
  | 'document-body'
  | 'document-end'
  | 'document-idle'
  | 'context-menu'

export type SandboxMode = 'raw' | 'JavaScript' | 'DOM'

export type RunIn = 'normal-tabs' | 'incognito-tabs' | `container-id-${number}`

export type AntifeatureType = 'ads' | 'tracking' | 'miner' | 'payment' | 'referral' | string

export type LocalizedString = Record<string, string>

export type ScriptResource = {
  name: string
  url: string
  integrity?: string
}

export type ParsedMetadata = {
  name: LocalizedString
  namespace: string
  version: string
  description: LocalizedString
  author?: string
  copyright?: string
  icon?: string
  icon64?: string
  grants: string[]
  requires: { url: string; integrity?: string }[]
  resources: ScriptResource[]
  includes: string[]
  matches: string[]
  excludes: string[]
  connects: string[]
  tags: string[]
  runAt: RunAt
  runIn: RunIn[]
  sandbox?: SandboxMode
  noframes?: boolean
  unwrap?: boolean
  updateUrl?: string
  downloadUrl?: string
  supportUrl?: string
  homepage?: string
  source?: string
  antifeatures: { type: AntifeatureType; text: LocalizedString }[]
  webRequestRules?: unknown
  /** Raw header lines for round-trip */
  rawLines: string[]
}

export type ScriptOverrides = {
  runAt?: RunAt
  runIn?: RunIn[]
  sandbox?: SandboxMode
  noframes?: boolean
  position?: number
  enabled?: boolean
  checkUpdates?: boolean
  note?: string
  tags?: string[]
  userMatches?: string[]
  userIncludes?: string[]
  userExcludes?: string[]
  keepOriginalMatches?: boolean
  keepOriginalIncludes?: boolean
  keepOriginalExcludes?: boolean
  userConnects?: string[]
  siteBlockers?: string[]
}

export type ScriptRecord = {
  id: string
  uuid: string
  enabled: boolean
  trashed: boolean
  trashedAt?: number
  position: number
  createdAt: number
  updatedAt: number
  lastCheckedAt?: number
  installUrl?: string
  overrides: ScriptOverrides
  /** Byte size of source (cached for list) */
  size: number
  /** Display name from metadata (default locale) */
  name: string
  version: string
}

export type ScriptStudioIndex = {
  globalEnabled: boolean
  scripts: ScriptRecord[]
  trashMode: 'enabled' | 'disabled' | 'clean-on-exit'
}

export type ConnectMode = 'prompt' | 'allowlist' | 'deny'

export type SriMode = 'off' | 'validate-if-given' | 'enforce'

export type BadgeMode = 'running-instances' | 'unique-running' | 'total-installed' | 'off'

export type ConfigMode = 'beginner' | 'advanced'

export type ScriptStudioSettings = {
  configMode: ConfigMode
  loggingLevel: 'debug' | 'info' | 'warn' | 'error'
  trashMode: ScriptStudioIndex['trashMode']
  autoRefreshOnDebug: boolean
  showGuideTips: boolean
  badgeMode: BadgeMode
  contextMenuEnabled: boolean
  scriptSearchEnabled: boolean
  updateIntervalHours: number
  checkDisabledScripts: boolean
  autoInstallUpdates: boolean
  hideUpdateNotificationSec: number
  externalsUpdateIntervalHours: number
  editorTheme: string
  editorKeymap: string
  editorIndent: number
  editorLint: boolean
  editorAutosave: boolean
  allowCookieAccess: boolean
  connectMode: ConnectMode
  sriMode: SriMode
  modifyCsp: 'yes' | 'remove' | 'no'
  allowedSandboxes: SandboxMode[]
  runOnFileUrls: boolean
  runInSubframes: boolean
  pageBlocklist: string[]
  downloadWhitelist: string[]
  downloadMode: 'native' | 'browser' | 'disabled'
  injectMode: 'content-script' | 'userscripts' | 'userscripts-dynamic'
  incognitoEnabled: boolean
  separateIncognitoStorage: boolean
}

export type ExternalCacheEntry = {
  url: string
  kind: 'require' | 'resource'
  name?: string
  content: string
  fetchedAt: number
  integrity?: string
  verified: boolean
}

export type BackupPayload = {
  version: 1
  exportedAt: number
  index: ScriptStudioIndex
  settings: ScriptStudioSettings
  scripts: { id: string; code: string; values: Record<string, unknown>; externals: ExternalCacheEntry[] }[]
}
