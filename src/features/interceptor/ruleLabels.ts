import type { InterceptorRuleType } from '@/core/interceptor'

const LABELS: Partial<Record<InterceptorRuleType, string>> = {
  redirect: 'Redirected',
  replace: 'URL replaced',
  queryParam: 'Query params changed',
  headers: 'Headers modified',
  userAgent: 'User-Agent changed',
  cancel: 'Blocked',
  delay: 'Delayed',
  mockApi: 'API mocked',
  mockGraphql: 'GraphQL mocked',
  modifyResponse: 'Response modified',
  modifyRequestBody: 'Request body modified',
  statusCode: 'Status code changed',
}

export function ruleActionLabel(type: string | undefined, kind?: string): string {
  if (kind === 'mock') return 'Mocked response'
  if (kind === 'response') return 'Response overridden'
  if (kind === 'delay') return 'Request delayed'
  if (kind === 'userAgent') return 'User-Agent set'
  if (type && LABELS[type as InterceptorRuleType]) return LABELS[type as InterceptorRuleType]!
  return 'Rule applied'
}
