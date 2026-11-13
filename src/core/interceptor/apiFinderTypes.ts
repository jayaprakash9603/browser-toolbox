export type ApiKind = 'rest' | 'graphql' | 'json' | 'xml' | 'form' | 'text' | 'websocket' | 'unknown'

export type CaptureStatus = 'capturing' | 'paused' | 'permissionRequired' | 'unsupported' | 'error'

export type ExplorerBodyMode = 'none' | 'json' | 'text' | 'urlencoded' | 'formdata'

export type ExplorerAuth =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apiKey'; key: string; value: string; in: 'header' | 'query' }
  | { type: 'custom'; header: string; value: string }

export interface ApiTiming {
  dnsMs?: number
  connectMs?: number
  tlsMs?: number
  sendMs?: number
  waitMs?: number
  receiveMs?: number
  blockedMs?: number
  totalMs?: number
}

export interface GraphQLMetadata {
  operationName?: string
  operationType?: 'query' | 'mutation' | 'subscription'
  query?: string
  variables?: Record<string, unknown>
  errors?: unknown
}

export interface CaptureRecord {
  id: string
  method: string
  url: string
  status?: number
  resourceType?: string
  requestHeaders?: { name: string; value?: string }[]
  responseHeaders?: { name: string; value?: string }[]
  requestBody?: string
  responseBody?: string
  durationMs?: number
  size?: number
  startedAt?: number
  error?: string
  mimeType?: string
  timing?: ApiTiming
}

export interface ClassifiedApi {
  include: boolean
  kind: ApiKind
  origin: string
  host: string
  path: string
  routeTemplate: string
  queryShape: string
  graphql?: GraphQLMetadata
}

export interface EndpointOccurrence {
  id: string
  url: string
  status?: number
  durationMs?: number
  timestamp: number
  queryShape: string
}

export interface ApiEndpoint {
  id: string
  method: string
  origin: string
  host: string
  path: string
  routeTemplate: string
  kind: ApiKind
  graphqlOperation?: string
  graphqlOperationType?: GraphQLMetadata['operationType']
  queryShapes: string[]
  callCount: number
  lastStatus?: number
  lastDurationMs?: number
  firstSeen: number
  lastSeen: number
  errorCount: number
  lastUrl: string
  sampleOccurrenceId: string
  occurrences: EndpointOccurrence[]
}

export interface ApiFinderStats {
  endpoints: number
  uniqueRoutes: number
  getCount: number
  postCount: number
  errorCount: number
  domains: number
}

export interface ExplorerKv {
  id: string
  enabled: boolean
  key: string
  value: string
  description?: string
}

export interface ExplorerDraft {
  id: string
  sourceOccurrenceId?: string
  name?: string
  method: string
  url: string
  params: ExplorerKv[]
  headers: ExplorerKv[]
  auth: ExplorerAuth
  bodyMode: ExplorerBodyMode
  bodyText: string
  formFields: ExplorerKv[]
  cookies: ExplorerKv[]
  sendCookies: boolean
  timeoutMs: number
  notes?: string
  tags?: string[]
}

export interface SavedApiRequest {
  id: string
  collectionId: string
  name: string
  description?: string
  tags: string[]
  notes?: string
  draft: ExplorerDraft
  createdAt: number
  updatedAt: number
}

export interface ApiCollection {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  requestIds: string[]
}

export interface ApiWorkspaceState {
  collections: ApiCollection[]
  requests: SavedApiRequest[]
}

export type ApiExecutionResult = 'ok' | 'error' | 'blocked' | 'permission'

export interface ApiExecutionHistory {
  id: string
  at: number
  method: string
  url: string
  status?: number
  statusText?: string
  durationMs?: number
  sizeBytes?: number
  result: ApiExecutionResult
  error?: string
  draft: ExplorerDraft
}

export const API_FINDER_FILTERS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  '2xx',
  '3xx',
  '4xx',
  '5xx',
  'json',
  'graphql',
  'xml',
  'rest',
  'failed',
  'currentDomain',
] as const

export type ApiFinderFilter = (typeof API_FINDER_FILTERS)[number]
