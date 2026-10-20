import { INTERCEPTOR_RULE_PRIORITY, USER_AGENT_PRESETS } from './constants'
import { isRuleActive, ruleSources, sourceToUrlFilter } from './matcher'
import type {
  HeadersRule,
  HttpMethod,
  InterceptorRule,
  QueryParamRule,
  ReplaceRule,
  RuleGroup,
  SourceCondition,
  UserAgentRule,
} from './types'
import { DNR_RULE_TYPES } from './types'

export interface DnrCompileResult {
  rules: chrome.declarativeNetRequest.Rule[]
  regexCount: number
  errors: string[]
}

export function interceptorRuleIdForIndex(index: number, base: number): number {
  return base + index
}

export function isInterceptorRuleId(id: number, base: number, max: number): boolean {
  return id >= base && id < max
}

type DnrHttpMethod = 'connect' | 'delete' | 'get' | 'head' | 'options' | 'other' | 'patch' | 'post' | 'put'

const DNR_HTTP_METHODS: Record<HttpMethod, DnrHttpMethod> = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
  HEAD: 'head',
  OPTIONS: 'options',
}

function conditionFromSource(
  rule: InterceptorRule,
  source: SourceCondition,
): chrome.declarativeNetRequest.RuleCondition | null {
  const filter = sourceToUrlFilter(source)
  if (!filter.urlFilter && !filter.regexFilter) return null
  const condition: chrome.declarativeNetRequest.RuleCondition = {
    ...(filter.urlFilter ? { urlFilter: filter.urlFilter } : { regexFilter: filter.regexFilter! }),
    resourceTypes: rule.filters?.resourceTypes?.length
      ? (rule.filters.resourceTypes.filter((t) => t !== 'fetch') as chrome.declarativeNetRequest.ResourceType[])
      : undefined,
    initiatorDomains: rule.filters?.pageDomains?.map((d) => d.replace(/^www\./, '')),
    requestMethods: rule.filters?.methods?.map((method) => DNR_HTTP_METHODS[method]),
  }
  return condition
}

function headerOps(
  changes: HeadersRule['request'],
): chrome.declarativeNetRequest.ModifyHeaderInfo[] {
  if (!changes?.length) return []
  return changes.map((c) => ({
    header: c.name,
    operation: c.operation,
    ...(c.value !== undefined ? { value: c.value } : {}),
  }))
}

function buildAction(rule: InterceptorRule): chrome.declarativeNetRequest.RuleAction | null {
  switch (rule.type) {
    case 'redirect':
      return {
        type: 'redirect',
        redirect: { url: rule.destination },
      }
    case 'replace':
      return {
        type: 'redirect',
        redirect: {
          regexSubstitution: (rule as ReplaceRule).to,
        },
      }
    case 'queryParam': {
      const q = rule as QueryParamRule
      return {
        type: 'redirect',
        redirect: {
          transform: {
            queryTransform: {
              addOrReplaceParams: q.addOrReplace,
              removeParams: q.remove,
            },
          },
        },
      }
    }
    case 'headers': {
      const h = rule as HeadersRule
      return {
        type: 'modifyHeaders',
        requestHeaders: headerOps(h.request),
        responseHeaders: headerOps(h.response),
      }
    }
    case 'userAgent': {
      const ua = rule as UserAgentRule
      const value =
        ua.preset && ua.preset !== 'custom'
          ? USER_AGENT_PRESETS[ua.preset]
          : (ua.customValue ?? USER_AGENT_PRESETS.chromeDesktop)
      return {
        type: 'modifyHeaders',
        requestHeaders: [{ header: 'User-Agent', operation: 'set', value }],
      }
    }
    case 'cancel':
      return { type: 'block' }
    default:
      return null
  }
}

export function compileRulesToDnr(
  rules: InterceptorRule[],
  idBase: number,
  groups: RuleGroup[] = [],
): DnrCompileResult {
  const errors: string[] = []
  const dnrRules: chrome.declarativeNetRequest.Rule[] = []
  let regexCount = 0
  let index = 0

  const enabled = rules
    .filter((r) => r.enabled && DNR_RULE_TYPES.includes(r.type))
    .sort((a, b) => b.priority - a.priority)

  for (const rule of enabled) {
    if (groups.length && !isRuleActive(rule, groups)) continue
    const action = buildAction(rule)
    if (!action) {
      errors.push(`Rule "${rule.name}" could not compile to DNR`)
      continue
    }
    for (const source of ruleSources(rule)) {
      const condition = conditionFromSource(rule, source)
      if (!condition) {
        errors.push(`Rule "${rule.name}" has an invalid source condition`)
        continue
      }
      if (condition.regexFilter) regexCount += 1
      if (rule.type === 'replace') {
        const rep = rule as ReplaceRule
        condition.regexFilter = rep.from
        delete (condition as { urlFilter?: string }).urlFilter
        regexCount += 1
      }
      dnrRules.push({
        id: interceptorRuleIdForIndex(index, idBase),
        priority: INTERCEPTOR_RULE_PRIORITY + Math.min(rule.priority, 50),
        condition,
        action,
      })
      index += 1
    }
  }

  if (regexCount > 1000) {
    errors.push(`Too many regex rules (${regexCount}); Chrome limit is 1000`)
  }
  if (dnrRules.length > 5000) {
    errors.push(`Too many dynamic rules (${dnrRules.length}); Chrome limit is 5000`)
  }

  return { rules: dnrRules, regexCount, errors }
}
