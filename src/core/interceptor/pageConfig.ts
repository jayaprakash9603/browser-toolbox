import { isRuleActive } from './matcher'
import type {
  InterceptorRule,
  LibraryItem,
  PageInterceptorRule,
  RuleGroup,
} from './types'
import { PAGE_RULE_TYPES, USER_SCRIPT_RULE_TYPES } from './types'
import { ruleSources } from './matcher'

function resolveBody(
  bodySource: string,
  body?: string,
  libraryId?: string,
  library: LibraryItem[] = [],
): string | undefined {
  if (bodySource === 'static') return body
  if (bodySource === 'library' && libraryId) {
    return library.find((i) => i.id === libraryId)?.content
  }
  return body
}

export function compilePageRules(
  rules: InterceptorRule[],
  library: LibraryItem[],
  paused: boolean,
  groups: RuleGroup[] = [],
): PageInterceptorRule[] {
  if (paused) return []
  return rules
    .filter((r) => isRuleActive(r, groups) && PAGE_RULE_TYPES.includes(r.type))
    .sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt)
    .map((rule) => {
      const base = {
        id: rule.id,
        name: rule.name,
        type: rule.type,
        priority: rule.priority,
        sources: ruleSources(rule),
        filters: rule.filters,
        payload: {} as Record<string, unknown>,
      }
      switch (rule.type) {
        case 'mockApi':
          base.payload = {
            status: rule.status,
            body: resolveBody(rule.bodySource, rule.body, rule.libraryId, library),
            contentType: rule.contentType ?? 'application/json',
          }
          break
        case 'mockGraphql':
          base.payload = {
            operationName: rule.operationName,
            queryContains: rule.queryContains,
            status: rule.status,
            body: resolveBody(rule.bodySource, rule.body, rule.libraryId, library),
          }
          break
        case 'modifyResponse':
          base.payload = {
            status: rule.status,
            body: resolveBody(rule.bodySource, rule.body, rule.libraryId, library),
            bodySource: rule.bodySource,
          }
          break
        case 'modifyRequestBody':
          base.payload = {
            body: resolveBody(rule.bodySource, rule.body, rule.libraryId, library),
            bodySource: rule.bodySource,
          }
          break
        case 'statusCode':
          base.payload = { status: rule.status }
          break
        case 'delay':
          base.payload = { delayMs: rule.delayMs }
          break
        case 'userAgent':
          base.payload = {
            preset: rule.preset,
            customValue: rule.customValue,
          }
          break
        default:
          break
      }
      return base
    })
}

export function needsPageInterceptor(
  rules: InterceptorRule[],
  paused: boolean,
  groups: RuleGroup[] = [],
): boolean {
  if (paused) return false
  return rules.some((r) => isRuleActive(r, groups) && PAGE_RULE_TYPES.includes(r.type))
}

export function needsUserScripts(
  rules: InterceptorRule[],
  paused: boolean,
  groups: RuleGroup[] = [],
): boolean {
  if (paused) return false
  return rules.some((r) => isRuleActive(r, groups) && USER_SCRIPT_RULE_TYPES.includes(r.type))
}
