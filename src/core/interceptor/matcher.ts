import type { InterceptorRule, RuleMatchContext, SourceCondition, TestRuleResult } from './types'

function fieldValue(url: string, field: SourceCondition['field']): string {
  try {
    const parsed = new URL(url)
    if (field === 'host') return parsed.host
    if (field === 'path') return `${parsed.pathname}${parsed.search}`
    return url
  } catch {
    return url
  }
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`, 'i')
}

export function matchSource(url: string, source: SourceCondition): boolean {
  const haystack = fieldValue(url, source.field)
  const needle = source.value
  if (!needle) return false
  switch (source.operator) {
    case 'equals':
      return haystack === needle || haystack.toLowerCase() === needle.toLowerCase()
    case 'contains':
      return haystack.toLowerCase().includes(needle.toLowerCase())
    case 'wildcard':
      return wildcardToRegExp(needle).test(haystack)
    case 'regex':
      try {
        return new RegExp(needle, 'i').test(haystack)
      } catch {
        return false
      }
    default:
      return false
  }
}

function pageDomainAllowed(pageUrl: string | undefined, domains: string[] | undefined): boolean {
  if (!domains?.length) return true
  if (!pageUrl) return true
  try {
    const host = new URL(pageUrl).hostname.replace(/^www\./, '').toLowerCase()
    return domains.some((d) => {
      const norm = d.replace(/^www\./, '').toLowerCase()
      return host === norm || host.endsWith(`.${norm}`)
    })
  } catch {
    return false
  }
}

function methodAllowed(method: string | undefined, methods: string[] | undefined): boolean {
  if (!methods?.length) return true
  if (!method) return true
  return methods.map((m) => m.toUpperCase()).includes(method.toUpperCase())
}

function resourceAllowed(type: string | undefined, types: string[] | undefined): boolean {
  if (!types?.length) return true
  if (!type) return true
  const norm = type === 'xmlhttprequest' ? 'xhr' : type
  return types.some((t) => t === type || (t === 'fetch' && norm === 'fetch'))
}

function payloadAllowed(body: string | undefined, key?: string, value?: string): boolean {
  if (!key) return true
  if (!body) return false
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>
    const actual = parsed[key]
    if (value === undefined || value === '') return actual !== undefined
    return String(actual) === value
  } catch {
    return body.includes(key) && (value ? body.includes(value) : true)
  }
}

export function matchRule(rule: InterceptorRule, ctx: RuleMatchContext): boolean {
  if (!rule.enabled) return false
  if (!matchSource(ctx.url, rule.source)) return false
  const f = rule.filters
  if (!pageDomainAllowed(ctx.pageUrl, f?.pageDomains)) return false
  if (!methodAllowed(ctx.method, f?.methods)) return false
  if (!resourceAllowed(ctx.resourceType, f?.resourceTypes)) return false
  if (!payloadAllowed(ctx.requestBody, f?.payloadKey, f?.payloadValue)) return false
  return true
}

export function matchRules(rules: InterceptorRule[], ctx: RuleMatchContext): InterceptorRule[] {
  return rules
    .filter((r) => matchRule(r, ctx))
    .sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt)
}

export function sourceToUrlFilter(source: SourceCondition): {
  urlFilter?: string
  regexFilter?: string
} {
  const v = source.value
  if (source.operator === 'regex' && source.field === 'url') {
    return { regexFilter: v }
  }
  if (source.field === 'host') {
    if (source.operator === 'equals') return { urlFilter: `||${v}^` }
    if (source.operator === 'contains') return { urlFilter: `*${v}*` }
    if (source.operator === 'wildcard') return { urlFilter: v }
  }
  if (source.field === 'path') {
    if (source.operator === 'equals') return { urlFilter: `|${v}|` }
    return { urlFilter: `*${v}*` }
  }
  if (source.operator === 'equals') return { urlFilter: `|${v}|` }
  if (source.operator === 'contains') return { urlFilter: `*${v}*` }
  if (source.operator === 'wildcard') return { urlFilter: v }
  if (source.operator === 'regex') return { regexFilter: v }
  return { urlFilter: `*${v}*` }
}

export function applyRedirectTransform(url: string, destination: string): string {
  if (destination.includes('$')) {
    try {
      const from = new URL(url)
      return destination
        .replace(/\$scheme/g, from.protocol.replace(':', ''))
        .replace(/\$host/g, from.host)
        .replace(/\$path/g, `${from.pathname}${from.search}`)
    } catch {
      return destination
    }
  }
  return destination
}

export function applyReplaceTransform(url: string, from: string, to: string): string | null {
  try {
    const re = new RegExp(from)
    if (!re.test(url)) return null
    return url.replace(re, to.replace(/\\(\d)/g, '$$$1'))
  } catch {
    return null
  }
}

export function testRulesAgainstUrl(
  rules: InterceptorRule[],
  testUrl: string,
  pageUrl?: string,
): TestRuleResult {
  const ctx: RuleMatchContext = { url: testUrl, pageUrl, method: 'GET' }
  const matched = matchRules(rules, ctx)
  let transformedUrl: string | undefined
  for (const rule of matched) {
    if (rule.type === 'redirect') {
      transformedUrl = applyRedirectTransform(testUrl, rule.destination)
      break
    }
    if (rule.type === 'replace') {
      const next = applyReplaceTransform(testUrl, rule.from, rule.to)
      if (next) {
        transformedUrl = next
        break
      }
    }
  }
  return {
    matches: matched.length > 0,
    transformedUrl,
    matchedRules: matched.map((r) => r.id),
  }
}
