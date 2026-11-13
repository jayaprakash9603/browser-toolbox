import {
  graphqlOperationNameFromQuery,
  graphqlOperationType,
  isGraphqlQueryString,
  looksLikeGraphqlPath,
  parseGraphqlBody,
} from './graphql'
import { MAX_ENDPOINT_OCCURRENCES } from './constants'
import { headerValue, mimeFromHeaders } from './apiSensitive'
import type {
  ApiEndpoint,
  ApiFinderFilter,
  ApiFinderStats,
  ApiKind,
  CaptureRecord,
  ClassifiedApi,
  EndpointOccurrence,
  GraphQLMetadata,
} from './apiFinderTypes'

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MONGO_ID = /^[0-9a-f]{24}$/i
const LONG_HEX = /^[0-9a-f]{8,}$/i
const NUMERIC_ID = /^\d+$/
const STATIC_EXT =
  /\.(?:png|jpe?g|gif|webp|svg|ico|css|js|mjs|map|woff2?|ttf|eot|mp4|webm|mp3|wav|ogg|pdf|woff)(?:$|\?)/i

const API_PATH = /(?:^|\/)(api|graphql|gql|rest|rpc|v\d+)(?:\/|$)/i

export function looksLikeApiCaptureTarget(url: string, contentType?: string, method = 'GET'): boolean {
  const mime = contentType?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (isJsonMime(mime) || isXmlMime(mime) || mime.includes('graphql')) return true
  try {
    const parsed = new URL(url)
    if (looksLikeGraphqlPath(parsed.pathname) || API_PATH.test(parsed.pathname)) return true
  } catch {
    /* ignore */
  }
  return method !== 'GET' && method !== 'HEAD'
}

function isJsonMime(mime: string): boolean {
  return mime.includes('json') || mime.endsWith('+json')
}

function isXmlMime(mime: string): boolean {
  return mime.includes('xml') || mime.endsWith('+xml')
}

function isFormMime(mime: string): boolean {
  return mime.includes('application/x-www-form-urlencoded') || mime.includes('multipart/form-data')
}

export function queryShapeFromUrl(url: string): string {
  try {
    const keys = [...new URL(url).searchParams.keys()]
    return [...new Set(keys)].sort().join('&')
  } catch {
    return ''
  }
}

export function normalizeRoutePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '') || '/'
  return trimmed
    .split('/')
    .map((segment) => {
      if (!segment) return segment
      const decoded = safeDecode(segment)
      if (UUID.test(decoded) || MONGO_ID.test(decoded) || NUMERIC_ID.test(decoded) || LONG_HEX.test(decoded)) {
        return ':id'
      }
      return segment
    })
    .join('/')
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isStaticAsset(record: CaptureRecord, pathname: string): boolean {
  const type = (record.resourceType ?? '').toLowerCase()
  if (['image', 'stylesheet', 'font', 'media', 'ping', 'csp_report'].includes(type)) return true
  if (type === 'script' || type === 'main_frame' || type === 'sub_frame' || type === 'document') {
    const mime = (record.mimeType ?? mimeFromHeaders(record.responseHeaders) ?? '').toLowerCase()
    if (isJsonMime(mime) || isXmlMime(mime) || mime.includes('graphql')) return false
    if (type === 'script') return true
    if ((type === 'main_frame' || type === 'sub_frame' || type === 'document') && !isJsonMime(mime) && !isXmlMime(mime)) {
      return true
    }
  }
  if (STATIC_EXT.test(pathname) || pathname.endsWith('/favicon.ico')) return true
  return false
}

function detectGraphql(record: CaptureRecord, pathname: string, mime: string): GraphQLMetadata | undefined {
  const gql = parseGraphqlBody(record.requestBody)
  const pathLooks = looksLikeGraphqlPath(pathname)
  const mimeLooks = mime.includes('graphql')
  if (!gql && !mimeLooks) return undefined
  if (gql?.query && isGraphqlQueryString(gql.query)) {
    return {
      query: gql.query,
      operationName: gql.operationName ?? graphqlOperationNameFromQuery(gql.query),
      operationType: graphqlOperationType(gql.query),
      variables: gql.variables,
    }
  }
  if (mimeLooks || (pathLooks && gql)) {
    return {
      query: gql?.query,
      operationName: gql?.operationName ?? graphqlOperationNameFromQuery(gql?.query),
      operationType: graphqlOperationType(gql?.query),
      variables: gql?.variables,
    }
  }
  return undefined
}

export function classifyCapture(record: CaptureRecord): ClassifiedApi | null {
  let parsed: URL
  try {
    parsed = new URL(record.url)
  } catch {
    return null
  }
  parsed.hash = ''
  const pathname = parsed.pathname || '/'
  if (isStaticAsset(record, pathname)) return null

  const type = (record.resourceType ?? '').toLowerCase()
  const reqMime = mimeFromHeaders(record.requestHeaders) ?? ''
  const resMime = (record.mimeType ?? mimeFromHeaders(record.responseHeaders) ?? '').toLowerCase()
  const mime = resMime || reqMime
  const graphql = detectGraphql(record, pathname, mime)
  const isFetch = type === 'xmlhttprequest' || type === 'xhr' || type === 'fetch' || type === 'fetch/xhr'
  const isWs = type === 'websocket' || type === 'web_socket'
  const pathLooksApi = API_PATH.test(pathname) || looksLikeGraphqlPath(pathname)
  const bodyLooksJson = Boolean(record.requestBody?.trim().startsWith('{') || record.requestBody?.trim().startsWith('['))
  const bodyLooksXml = Boolean(record.requestBody?.trim().startsWith('<'))

  let kind: ApiKind
  if (isWs) kind = 'websocket'
  else if (graphql) kind = 'graphql'
  else if (isXmlMime(mime) || bodyLooksXml) kind = 'xml'
  else if (isJsonMime(mime) || bodyLooksJson) kind = 'json'
  else if (isFormMime(reqMime)) kind = 'form'
  else if (isFetch && (mime.startsWith('text/') || !mime)) kind = mime.startsWith('text/') ? 'text' : 'rest'
  else if (pathLooksApi) kind = 'rest'
  else if (isFetch) kind = 'rest'
  else return null

  if (kind === 'rest' && (isJsonMime(mime) || bodyLooksJson)) kind = 'json'

  return {
    include: true,
    kind,
    origin: parsed.origin,
    host: parsed.host,
    path: pathname.replace(/\/+$/, '') || '/',
    routeTemplate: normalizeRoutePath(pathname),
    queryShape: queryShapeFromUrl(record.url),
    graphql,
  }
}

export function endpointId(
  method: string,
  origin: string,
  routeTemplate: string,
  graphqlOperation?: string,
): string {
  return [method.toUpperCase(), origin, routeTemplate, graphqlOperation ?? ''].join('|')
}

export function ingestCapture(store: Map<string, ApiEndpoint>, record: CaptureRecord): ApiEndpoint | null {
  const classified = classifyCapture(record)
  if (!classified) return null
  const method = record.method.toUpperCase()
  const id = endpointId(method, classified.origin, classified.routeTemplate, classified.graphql?.operationName)
  const timestamp = record.startedAt ?? Date.now()
  const isError = Boolean(record.error) || (record.status != null && record.status >= 400)
  const occurrence: EndpointOccurrence = {
    id: record.id,
    url: record.url,
    status: record.status,
    durationMs: record.durationMs,
    timestamp,
    queryShape: classified.queryShape,
  }
  const existing = store.get(id)
  if (!existing) {
    const created: ApiEndpoint = {
      id,
      method,
      origin: classified.origin,
      host: classified.host,
      path: classified.path,
      routeTemplate: classified.routeTemplate,
      kind: classified.kind,
      graphqlOperation: classified.graphql?.operationName,
      graphqlOperationType: classified.graphql?.operationType,
      queryShapes: classified.queryShape ? [classified.queryShape] : [],
      callCount: 1,
      lastStatus: record.status,
      lastDurationMs: record.durationMs,
      firstSeen: timestamp,
      lastSeen: timestamp,
      errorCount: isError ? 1 : 0,
      lastUrl: record.url,
      sampleOccurrenceId: record.id,
      occurrences: [occurrence],
    }
    store.set(id, created)
    return created
  }
  existing.callCount += 1
  existing.lastSeen = timestamp
  existing.lastStatus = record.status
  existing.lastDurationMs = record.durationMs
  existing.lastUrl = record.url
  existing.sampleOccurrenceId = record.id
  if (classified.kind !== 'unknown') existing.kind = classified.kind
  if (classified.graphql?.operationName) existing.graphqlOperation = classified.graphql.operationName
  if (classified.graphql?.operationType) existing.graphqlOperationType = classified.graphql.operationType
  if (isError) existing.errorCount += 1
  if (classified.queryShape && !existing.queryShapes.includes(classified.queryShape)) {
    existing.queryShapes.push(classified.queryShape)
  }
  existing.occurrences = [occurrence, ...existing.occurrences.filter((row) => row.id !== occurrence.id)].slice(
    0,
    MAX_ENDPOINT_OCCURRENCES,
  )
  store.set(id, existing)
  return existing
}

export function aggregateEndpoints(records: CaptureRecord[]): ApiEndpoint[] {
  const store = new Map<string, ApiEndpoint>()
  for (const record of records) ingestCapture(store, record)
  return [...store.values()].sort((a, b) => b.lastSeen - a.lastSeen)
}

export function finderStats(endpoints: ApiEndpoint[]): ApiFinderStats {
  const routes = new Set<string>()
  const domains = new Set<string>()
  let getCount = 0
  let postCount = 0
  let errorCount = 0
  for (const endpoint of endpoints) {
    routes.add(`${endpoint.origin}${endpoint.routeTemplate}`)
    domains.add(endpoint.host)
    if (endpoint.method === 'GET') getCount += 1
    if (endpoint.method === 'POST') postCount += 1
    errorCount += endpoint.errorCount
  }
  return {
    endpoints: endpoints.length,
    uniqueRoutes: routes.size,
    getCount,
    postCount,
    errorCount,
    domains: domains.size,
  }
}

export function matchesFinderFilter(
  endpoint: ApiEndpoint,
  filters: Set<ApiFinderFilter>,
  currentHost?: string,
): boolean {
  if (filters.size === 0) return true
  const methodFilters = [...filters].filter((item) => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(item))
  if (methodFilters.length && !methodFilters.includes(endpoint.method as ApiFinderFilter)) return false
  if (filters.has('2xx') && !(endpoint.lastStatus != null && endpoint.lastStatus >= 200 && endpoint.lastStatus < 300)) {
    return false
  }
  if (filters.has('3xx') && !(endpoint.lastStatus != null && endpoint.lastStatus >= 300 && endpoint.lastStatus < 400)) {
    return false
  }
  if (filters.has('4xx') && !(endpoint.lastStatus != null && endpoint.lastStatus >= 400 && endpoint.lastStatus < 500)) {
    return false
  }
  if (filters.has('5xx') && !(endpoint.lastStatus != null && endpoint.lastStatus >= 500)) return false
  if (filters.has('failed') && endpoint.errorCount === 0 && !(endpoint.lastStatus != null && endpoint.lastStatus >= 400)) {
    return false
  }
  if (filters.has('json') && endpoint.kind !== 'json') return false
  if (filters.has('graphql') && endpoint.kind !== 'graphql') return false
  if (filters.has('xml') && endpoint.kind !== 'xml') return false
  if (filters.has('rest') && endpoint.kind !== 'rest' && endpoint.kind !== 'json') return false
  if (filters.has('currentDomain') && currentHost && endpoint.host !== currentHost) return false
  return true
}

export function matchesFinderQuery(endpoint: ApiEndpoint, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    endpoint.lastUrl.toLowerCase().includes(q) ||
    endpoint.routeTemplate.toLowerCase().includes(q) ||
    endpoint.host.toLowerCase().includes(q) ||
    endpoint.method.toLowerCase().includes(q) ||
    (endpoint.graphqlOperation ?? '').toLowerCase().includes(q) ||
    String(endpoint.lastStatus ?? '').includes(q)
  )
}

export function pathParamsFromTemplate(template: string, actualPath: string): { name: string; value: string }[] {
  const templateParts = template.split('/')
  const actualParts = (actualPath.replace(/\/+$/, '') || '/').split('/')
  const params: { name: string; value: string }[] = []
  for (let i = 0; i < templateParts.length; i += 1) {
    const part = templateParts[i]
    if (part.startsWith(':')) params.push({ name: part.slice(1) || 'id', value: actualParts[i] ?? '' })
  }
  return params
}

export function statusClassKind(status?: number): 'ok' | 'redirect' | 'client' | 'server' | 'unknown' {
  if (status == null) return 'unknown'
  if (status >= 500) return 'server'
  if (status >= 400) return 'client'
  if (status >= 300) return 'redirect'
  if (status >= 200) return 'ok'
  return 'unknown'
}

export { headerValue }
