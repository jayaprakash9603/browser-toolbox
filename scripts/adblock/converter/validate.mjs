import { normalizeDomain, toRegexFilter } from './parseFilter.mjs'

const RESOURCE_TYPES = new Set([
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
])
const METHODS = new Set(['connect', 'delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'other'])
const ACTIONS = new Set(['block', 'allow', 'allowAllRequests', 'redirect', 'upgradeScheme', 'modifyHeaders'])
const HEADER_OPS = new Set(['append', 'set', 'remove'])
const DOMAIN_KEYS = ['requestDomains', 'excludedRequestDomains', 'initiatorDomains', 'excludedInitiatorDomains']

/** Chrome refuses to load a static ruleset with more regex rules than this. */
export const MAX_REGEX_RULES_PER_RULESET = 1000

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0
}

/**
 * Mirrors the checks Chrome applies when loading a static ruleset (one bad rule makes the
 * whole ruleset fail to load), plus a guard against catch-all rules. Returns null when the
 * rule is valid, otherwise a short reason.
 */
export function validateDnrRule(rule) {
  if (!Number.isInteger(rule.id) || rule.id < 1) return 'bad id'
  if (!Number.isInteger(rule.priority) || rule.priority < 1) return 'bad priority'
  const { action, condition } = rule
  if (!action || !ACTIONS.has(action.type)) return 'bad action'
  if (!condition || typeof condition !== 'object') return 'no condition'

  if (condition.urlFilter != null) {
    if (condition.regexFilter != null) return 'urlFilter and regexFilter'
    const f = condition.urlFilter
    if (typeof f !== 'string' || !f || /[^\x20-\x7e]/.test(f) || f.startsWith('||*')) return 'bad urlFilter'
  }
  if (condition.regexFilter != null && toRegexFilter(condition.regexFilter) !== condition.regexFilter) {
    return 'bad regexFilter'
  }

  if (condition.resourceTypes && condition.excludedResourceTypes) return 'both resource type lists'
  for (const key of ['resourceTypes', 'excludedResourceTypes']) {
    if (condition[key] == null) continue
    if (!nonEmptyArray(condition[key]) || !condition[key].every((t) => RESOURCE_TYPES.has(t))) {
      return `bad ${key}`
    }
  }
  if (condition.requestMethods && condition.excludedRequestMethods) return 'both method lists'
  for (const key of ['requestMethods', 'excludedRequestMethods']) {
    if (condition[key] == null) continue
    if (!nonEmptyArray(condition[key]) || !condition[key].every((m) => METHODS.has(m))) return `bad ${key}`
  }
  for (const key of DOMAIN_KEYS) {
    if (condition[key] == null) continue
    if (!nonEmptyArray(condition[key]) || !condition[key].every((d) => normalizeDomain(d, true) === d)) {
      return `bad ${key}`
    }
  }
  if (condition.domainType != null && !['firstParty', 'thirdParty'].includes(condition.domainType)) {
    return 'bad domainType'
  }

  const narrowed =
    condition.urlFilter ||
    condition.regexFilter ||
    condition.requestDomains ||
    condition.initiatorDomains
  if (!narrowed) return 'matches everything'

  if (action.type === 'allowAllRequests') {
    const types = condition.resourceTypes ?? []
    if (!types.length || !types.every((t) => t === 'main_frame' || t === 'sub_frame')) {
      return 'allowAllRequests needs frame types'
    }
  }
  if (action.type === 'redirect') {
    const r = action.redirect ?? {}
    const targets = ['extensionPath', 'transform', 'url', 'regexSubstitution'].filter((k) => r[k] != null)
    if (targets.length !== 1) return 'bad redirect'
    if (r.extensionPath != null && !String(r.extensionPath).startsWith('/')) return 'bad extensionPath'
    if (r.regexSubstitution != null && condition.regexFilter == null) return 'regexSubstitution needs regex'
  }
  if (action.type === 'modifyHeaders') {
    const headers = [...(action.requestHeaders ?? []), ...(action.responseHeaders ?? [])]
    if (!headers.length) return 'no headers'
    for (const h of headers) {
      if (!h.header || !HEADER_OPS.has(h.operation)) return 'bad header'
      if (h.operation !== 'remove' && typeof h.value !== 'string') return 'header needs value'
    }
  }
  return null
}

/** Drops invalid rules and regex rules beyond Chrome's per-ruleset cap; returns counts per reason. */
export function validateRuleset(rules) {
  const valid = []
  const rejected = {}
  let regexCount = 0
  for (const rule of rules) {
    let reason = validateDnrRule(rule)
    if (!reason && rule.condition.regexFilter != null) {
      if (regexCount >= MAX_REGEX_RULES_PER_RULESET) reason = 'regex cap'
      else regexCount++
    }
    if (reason) rejected[reason] = (rejected[reason] ?? 0) + 1
    else valid.push(rule)
  }
  return { rules: valid, rejected }
}
