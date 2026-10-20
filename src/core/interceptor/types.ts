export type MatchOperator = 'equals' | 'contains' | 'wildcard' | 'regex'
export type SourceField = 'url' | 'host' | 'path'

export interface SourceCondition {
  field: SourceField
  operator: MatchOperator
  value: string
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export type ResourceTypeFilter =
  | 'main_frame'
  | 'sub_frame'
  | 'stylesheet'
  | 'script'
  | 'image'
  | 'font'
  | 'xmlhttprequest'
  | 'fetch'
  | 'ping'
  | 'media'
  | 'websocket'
  | 'other'

export interface RuleFilters {
  pageDomains?: string[]
  resourceTypes?: ResourceTypeFilter[]
  methods?: HttpMethod[]
  payloadKey?: string
  payloadValue?: string
}

export type HeaderOperation = 'set' | 'remove' | 'append'

export interface HeaderChange {
  name: string
  operation: HeaderOperation
  value?: string
}

export type BodySourceKind = 'static' | 'library' | 'function'

export interface InterceptorRuleBase {
  id: string
  name: string
  enabled: boolean
  pinned?: boolean
  groupId: string
  priority: number
  createdAt: number
  updatedAt: number
  source: SourceCondition
  filters?: RuleFilters
}

export interface RedirectRule extends InterceptorRuleBase {
  type: 'redirect'
  destination: string
}

export interface ReplaceRule extends InterceptorRuleBase {
  type: 'replace'
  /** Regex replacement applied to the full URL (regexSubstitution). */
  from: string
  to: string
}

export interface QueryParamRule extends InterceptorRuleBase {
  type: 'queryParam'
  addOrReplace?: { key: string; value: string }[]
  remove?: string[]
}

export interface HeadersRule extends InterceptorRuleBase {
  type: 'headers'
  request?: HeaderChange[]
  response?: HeaderChange[]
}

export interface UserAgentRule extends InterceptorRuleBase {
  type: 'userAgent'
  preset?: keyof typeof import('./constants').USER_AGENT_PRESETS | 'custom'
  customValue?: string
}

export interface CancelRule extends InterceptorRuleBase {
  type: 'cancel'
}

export interface MockApiRule extends InterceptorRuleBase {
  type: 'mockApi'
  status: number
  bodySource: BodySourceKind
  body?: string
  libraryId?: string
  contentType?: string
}

export interface MockGraphqlRule extends InterceptorRuleBase {
  type: 'mockGraphql'
  operationName?: string
  queryContains?: string
  status: number
  bodySource: BodySourceKind
  body?: string
  libraryId?: string
}

export interface ModifyResponseRule extends InterceptorRuleBase {
  type: 'modifyResponse'
  status?: number
  bodySource: BodySourceKind
  body?: string
  libraryId?: string
  functionBody?: string
}

export interface ModifyRequestBodyRule extends InterceptorRuleBase {
  type: 'modifyRequestBody'
  bodySource: BodySourceKind
  body?: string
  libraryId?: string
  functionBody?: string
}

export interface StatusCodeRule extends InterceptorRuleBase {
  type: 'statusCode'
  status: number
}

export interface DelayRule extends InterceptorRuleBase {
  type: 'delay'
  delayMs: number
}

export type InsertScriptTiming = 'document_start' | 'document_idle'
export type InsertScriptKind = 'js' | 'css'

export interface InsertScriptRule extends InterceptorRuleBase {
  type: 'insertScript'
  kind: InsertScriptKind
  timing: InsertScriptTiming
  scriptSource: 'inline' | 'library' | 'url'
  code?: string
  libraryId?: string
  url?: string
}

export type InterceptorRule =
  | RedirectRule
  | ReplaceRule
  | QueryParamRule
  | HeadersRule
  | UserAgentRule
  | CancelRule
  | MockApiRule
  | MockGraphqlRule
  | ModifyResponseRule
  | ModifyRequestBodyRule
  | StatusCodeRule
  | DelayRule
  | InsertScriptRule

export type InterceptorRuleType = InterceptorRule['type']

export const DNR_RULE_TYPES: InterceptorRuleType[] = [
  'redirect',
  'replace',
  'queryParam',
  'headers',
  'userAgent',
  'cancel',
]

export const PAGE_RULE_TYPES: InterceptorRuleType[] = [
  'mockApi',
  'mockGraphql',
  'modifyResponse',
  'modifyRequestBody',
  'statusCode',
  'delay',
  'userAgent',
]

export const USER_SCRIPT_RULE_TYPES: InterceptorRuleType[] = ['insertScript']

export interface RuleGroup {
  id: string
  name: string
  collapsed?: boolean
  order: number
}

export type LibraryItemKind = 'json' | 'js' | 'css' | 'html' | 'text'

export interface LibraryItem {
  id: string
  name: string
  kind: LibraryItemKind
  content: string
  updatedAt: number
}

export interface InterceptorSettings {
  paused: boolean
  logSize: number
  deepIntercept: boolean
  showPageToast: boolean
  userScriptsEnabled: boolean
}

export interface InterceptorState {
  rules: InterceptorRule[]
  groups: RuleGroup[]
  library: LibraryItem[]
  settings: InterceptorSettings
}

export interface RuleMatchContext {
  url: string
  method?: string
  pageUrl?: string
  resourceType?: string
  requestBody?: string
}

export interface TestRuleResult {
  matches: boolean
  transformedUrl?: string
  matchedRules: string[]
}

export interface NetLogHeader {
  name: string
  value?: string
}

export interface NetLogEntry {
  id: string
  tabId: number
  requestId: string
  startedAt: number
  completedAt?: number
  method: string
  url: string
  status?: number
  resourceType?: string
  requestHeaders?: NetLogHeader[]
  responseHeaders?: NetLogHeader[]
  requestBody?: string
  responseBody?: string
  size?: number
  durationMs?: number
  error?: string
  appliedRuleIds: string[]
  modified: boolean
  fromPageScript?: boolean
  /** Final URL after redirect/replace (DNR). */
  effectiveUrl?: string
  ruleHits?: InterceptorRuleHit[]
}

export interface InterceptorRuleHit {
  ruleId: string
  ruleName?: string
  ruleType?: string
  action?: string
}

export interface PageInterceptorRule {
  id: string
  name: string
  type: InterceptorRuleType
  priority: number
  source: SourceCondition
  filters?: RuleFilters
  payload: Record<string, unknown>
}

export interface InterceptorPageEvent {
  kind: 'request' | 'response' | 'mock' | 'delay' | 'userAgent'
  ruleId: string
  ruleName?: string
  ruleType?: string
  url: string
  method: string
  requestBody?: string
  responseBody?: string
  status?: number
}
