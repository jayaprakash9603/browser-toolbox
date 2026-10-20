import type { InterceptorRuleType } from '@/core/interceptor'

export const RULE_TYPE_LABELS: Record<InterceptorRuleType, string> = {
  redirect: 'Redirect Request',
  replace: 'Replace Host / String',
  queryParam: 'Query Params',
  headers: 'Modify Headers',
  userAgent: 'User-Agent',
  cancel: 'Block / Cancel Request',
  mockApi: 'Mock API Response',
  mockGraphql: 'Mock GraphQL',
  modifyResponse: 'Modify Response Body',
  modifyRequestBody: 'Modify Request Body',
  statusCode: 'Override Status Code',
  delay: 'Delay Request',
  insertScript: 'Insert Script',
}

export const ALL_RULE_TYPES = Object.keys(RULE_TYPE_LABELS) as InterceptorRuleType[]

export function ruleTypeLabel(type: InterceptorRuleType): string {
  return RULE_TYPE_LABELS[type]
}

/** Requestly-style uppercase type column label. */
export function ruleTypeBadge(type: InterceptorRuleType): string {
  const map: Partial<Record<InterceptorRuleType, string>> = {
    redirect: 'REDIRECT',
    replace: 'REPLACE',
    queryParam: 'QUERY PARAM',
    headers: 'HEADERS',
    userAgent: 'USER AGENT',
    cancel: 'CANCEL REQUEST',
    mockApi: 'MOCK API',
    mockGraphql: 'MOCK GRAPHQL',
    modifyResponse: 'MODIFY RESPONSE',
    modifyRequestBody: 'MODIFY REQUEST',
    statusCode: 'STATUS CODE',
    delay: 'DELAY NETWORK',
    insertScript: 'INSERT SCRIPT',
  }
  return map[type] ?? type.toUpperCase()
}
