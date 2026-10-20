import { newRuleId, type InterceptorRule, type InterceptorRuleType } from '@/core/interceptor'

export function createDefaultRule(type: InterceptorRuleType = 'redirect'): InterceptorRule {
  const now = Date.now()
  const common = {
    id: newRuleId(),
    name: 'New rule',
    enabled: true,
    groupId: 'default',
    priority: 10,
    createdAt: now,
    updatedAt: now,
    source: { field: 'url' as const, operator: 'contains' as const, value: '' },
  }
  switch (type) {
    case 'redirect':
      return { ...common, type, destination: '' }
    case 'replace':
      return { ...common, type, from: '', to: '' }
    case 'queryParam':
      return { ...common, type, addOrReplace: [], remove: [] }
    case 'headers':
      return { ...common, type, request: [], response: [] }
    case 'userAgent':
      return { ...common, type, preset: 'chromeDesktop' }
    case 'cancel':
      return { ...common, type }
    case 'mockApi':
      return { ...common, type, status: 200, bodySource: 'static', body: '{}', contentType: 'application/json' }
    case 'mockGraphql':
      return { ...common, type, status: 200, bodySource: 'static', body: '{"data":{}}' }
    case 'modifyResponse':
      return { ...common, type, bodySource: 'static', body: '' }
    case 'modifyRequestBody':
      return { ...common, type, bodySource: 'static', body: '' }
    case 'statusCode':
      return { ...common, type, status: 404 }
    case 'delay':
      return { ...common, type, delayMs: 2000 }
    case 'insertScript':
      return { ...common, type, kind: 'js', timing: 'document_idle', scriptSource: 'inline', code: '' }
  }
}
