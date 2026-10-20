import { newRuleId, upsertRule } from '@/core/interceptor'
import type { HeaderChange, InterceptorRule } from '@/core/interceptor'

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function base(name: string, url: string) {
  const now = Date.now()
  return {
    id: newRuleId(),
    name,
    enabled: true,
    groupId: 'default',
    priority: 20,
    createdAt: now,
    updatedAt: now,
    source: { field: 'url' as const, operator: 'equals' as const, value: url },
  }
}

export type QuickRuleKind =
  | 'redirect'
  | 'replaceHost'
  | 'replacePart'
  | 'delay'
  | 'cancel'
  | 'requestHeader'
  | 'responseHeader'
  | 'addQueryParam'
  | 'removeQueryParams'
  | 'editResponse'

export interface QuickRuleInput {
  url: string
  a?: string
  b?: string
  headerOp?: HeaderChange['operation']
  queryKeys?: string[]
  status?: number
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

export function buildQuickRule(kind: QuickRuleKind, input: QuickRuleInput): InterceptorRule {
  const { url } = input
  const a = input.a ?? ''
  const b = input.b ?? ''
  switch (kind) {
    case 'redirect':
      return { ...base(`Redirect ${hostOf(url)}`, url), type: 'redirect', destination: a }
    case 'replaceHost':
      return {
        ...base(`Replace host ${a}`, url),
        type: 'replace',
        from: `^(https?://)${escapeRegex(a)}(.*)$`,
        to: `\\1${b}\\2`,
        source: { field: 'host', operator: 'equals', value: a },
      }
    case 'replacePart':
      return {
        ...base('Replace part of URL', url),
        type: 'replace',
        from: `^(.*?)${escapeRegex(a)}(.*)$`,
        to: `\\1${b.replace(/\\/g, '\\\\')}\\2`,
        source: { field: 'url', operator: 'contains', value: a },
      }
    case 'delay':
      return { ...base(`Delay ${hostOf(url)}`, url), type: 'delay', delayMs: Number(a) || 1000 }
    case 'cancel':
      return { ...base(`Block ${hostOf(url)}`, url), type: 'cancel' }
    case 'requestHeader':
    case 'responseHeader': {
      const change: HeaderChange = {
        name: a,
        operation: input.headerOp ?? 'set',
        ...(input.headerOp === 'remove' ? {} : { value: b }),
      }
      return {
        ...base(`${kind === 'requestHeader' ? 'Request' : 'Response'} header ${a}`, url),
        type: 'headers',
        ...(kind === 'requestHeader' ? { request: [change] } : { response: [change] }),
      }
    }
    case 'addQueryParam':
      return {
        ...base(`Add query param ${a}`, url),
        type: 'queryParam',
        addOrReplace: [{ key: a, value: b }],
      }
    case 'removeQueryParams':
      return { ...base('Remove query params', url), type: 'queryParam', remove: input.queryKeys ?? [] }
    case 'editResponse':
      return {
        ...base(`Override response ${hostOf(url)}`, url),
        type: 'modifyResponse',
        status: input.status,
        bodySource: 'static',
        body: a,
      }
  }
}

export async function saveQuickRule(kind: QuickRuleKind, input: QuickRuleInput): Promise<InterceptorRule> {
  const rule = buildQuickRule(kind, input)
  await upsertRule(rule)
  return rule
}
