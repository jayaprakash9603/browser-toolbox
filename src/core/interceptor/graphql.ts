export interface GraphqlPayload {
  operationName?: string
  query?: string
  variables?: Record<string, unknown>
}

const GRAPHQL_OP = /^\s*(query|mutation|subscription|fragment)\b/i
const GRAPHQL_SHORT = /^\s*{/

export function isGraphqlQueryString(query: string | undefined): boolean {
  if (!query) return false
  return GRAPHQL_OP.test(query) || GRAPHQL_SHORT.test(query)
}

export function graphqlOperationType(
  query: string | undefined,
): 'query' | 'mutation' | 'subscription' | undefined {
  if (!query) return undefined
  const match = query.match(/^\s*(query|mutation|subscription)\b/i)
  if (!match) return query.trimStart().startsWith('{') ? 'query' : undefined
  return match[1].toLowerCase() as 'query' | 'mutation' | 'subscription'
}

export function graphqlOperationNameFromQuery(query: string | undefined): string | undefined {
  if (!query) return undefined
  const match = query.match(/^\s*(?:query|mutation|subscription)\s+([A-Za-z_]\w*)/i)
  return match?.[1]
}

export function looksLikeGraphqlPath(pathname: string): boolean {
  return /(?:^|\/)(graphql|gql)(?:\/|$)/i.test(pathname)
}

/** True when JSON has a GraphQL `query` and/or `operationName` — not arbitrary objects. */
export function parseGraphqlBody(body: string | undefined): GraphqlPayload | null {
  if (!body) return null
  try {
    const parsed = JSON.parse(body) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const rec = parsed as Record<string, unknown>
    const query = typeof rec.query === 'string' ? rec.query : undefined
    const operationName = typeof rec.operationName === 'string' ? rec.operationName : undefined
    if (!query && !operationName) return null
    const variables =
      rec.variables && typeof rec.variables === 'object' && rec.variables !== null && !Array.isArray(rec.variables)
        ? (rec.variables as Record<string, unknown>)
        : undefined
    return { query, operationName, variables }
  } catch {
    return null
  }
}

export function matchGraphqlRule(
  body: string | undefined,
  operationName?: string,
  queryContains?: string,
): boolean {
  const gql = parseGraphqlBody(body)
  if (!gql) return false
  if (operationName && gql.operationName !== operationName) return false
  if (queryContains && !(gql.query ?? '').includes(queryContains)) return false
  return true
}
