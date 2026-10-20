export interface GraphqlPayload {
  operationName?: string
  query?: string
  variables?: Record<string, unknown>
}

export function parseGraphqlBody(body: string | undefined): GraphqlPayload | null {
  if (!body) return null
  try {
    const parsed = JSON.parse(body) as GraphqlPayload
    if (typeof parsed !== 'object' || parsed === null) return null
    return parsed
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
