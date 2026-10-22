let nextRuleId = 1

export function resetRuleIdCounter(start = 1) {
  nextRuleId = start
}

/**
 * Static rule priorities, all below the user allowlist (100). On a tie DNR prefers
 * allow > block > redirect > modifyHeaders, so a $removeparam (1) never un-blocks a request,
 * a $redirect (2) replaces a plain block, exceptions (3) beat both, and $important (4/6)
 * beats ordinary exceptions the way it does in uBO.
 */
export const PRIORITY = {
  block: 1,
  removeparam: 1,
  csp: 1,
  redirect: 2,
  allow: 3,
  importantBlock: 4,
  importantRedirect: 5,
  importantAllow: 6,
}

const ALL_TYPES_BUT_MAIN = [
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
]

/**
 * Pass `resolveRedirect(name)` to map uBO redirect resource names onto packaged files; an
 * unknown resource falls back to a plain block, which is what the filter asks for anyway.
 */
export function networkFilterToDnrRule(filter, ruleIdStart, resolveRedirect = () => null) {
  if (ruleIdStart != null) nextRuleId = ruleIdStart
  const { host, opts, exception } = filter
  if (!host) return null

  const condition = {}
  if (host.type === 'domain') condition.requestDomains = [host.value]
  else if (host.type === 'url') condition.urlFilter = host.value
  else if (host.type === 'regex') condition.regexFilter = host.value
  else if (host.type !== 'any') return null
  if ((host.type === 'url' || host.type === 'regex') && opts.matchCase) condition.isUrlFilterCaseSensitive = true

  if (opts.thirdParty === true) condition.domainType = 'thirdParty'
  if (opts.thirdParty === false) condition.domainType = 'firstParty'
  if (opts.domains.length) condition.initiatorDomains = [...new Set(opts.domains)]
  if (opts.excludedDomains.length) condition.excludedInitiatorDomains = [...new Set(opts.excludedDomains)]
  if (opts.requestDomains.length) {
    condition.requestDomains = [...new Set([...(condition.requestDomains ?? []), ...opts.requestDomains])]
  }
  if (opts.excludedRequestDomains.length) {
    condition.excludedRequestDomains = [...new Set(opts.excludedRequestDomains)]
  }
  if (opts.methods.length) condition.requestMethods = [...new Set(opts.methods)]
  if (opts.excludedMethods.length) condition.excludedRequestMethods = [...new Set(opts.excludedMethods)]

  const types = new Set(opts.resourceTypes)
  if (opts.document) types.add('main_frame')
  if (types.size) condition.resourceTypes = [...types]
  if (opts.excludedResourceTypes.length) {
    if (types.size) {
      condition.resourceTypes = condition.resourceTypes.filter((t) => !opts.excludedResourceTypes.includes(t))
      if (!condition.resourceTypes.length) return null
    } else {
      condition.excludedResourceTypes = [...new Set(opts.excludedResourceTypes)]
    }
  }

  /**
   * For a document request uBO's `domain=` names the page itself, while DNR's initiator is
   * whoever started the navigation, so the domains move to the request side.
   */
  const documentScoped = () => {
    if (condition.requestDomains || !condition.initiatorDomains) return
    condition.requestDomains = condition.initiatorDomains
    delete condition.initiatorDomains
    if (condition.excludedInitiatorDomains) {
      condition.excludedRequestDomains = [
        ...new Set([...(condition.excludedRequestDomains ?? []), ...condition.excludedInitiatorDomains]),
      ]
      delete condition.excludedInitiatorDomains
    }
  }
  const rule = (priority, action) => ({ id: nextRuleId++, priority, action, condition })
  const defaultTypes = (types) => {
    if (condition.resourceTypes) return
    const excluded = condition.excludedResourceTypes ?? []
    delete condition.excludedResourceTypes
    condition.resourceTypes = types.filter((t) => !excluded.includes(t))
  }

  if (exception) {
    // Exceptions to $csp/$redirect/$removeparam only switch off that modifier in uBO; an allow
    // rule would unblock the whole request, so they are not converted.
    if (opts.csp || opts.redirect || opts.removeparam) return null
    if (opts.document && host.type === 'domain' && !opts.resourceTypes.length) {
      condition.resourceTypes = ['main_frame', 'sub_frame']
      return rule(opts.important ? PRIORITY.importantAllow : PRIORITY.allow, { type: 'allowAllRequests' })
    }
    return rule(opts.important ? PRIORITY.importantAllow : PRIORITY.allow, { type: 'allow' })
  }

  if (opts.removeparam) {
    defaultTypes(['main_frame', 'sub_frame', 'xmlhttprequest'])
    if (!condition.resourceTypes.length) return null
    return rule(PRIORITY.removeparam, {
      type: 'redirect',
      redirect: { transform: { queryTransform: { removeParams: [opts.removeparam] } } },
    })
  }

  if (opts.csp) {
    defaultTypes(['main_frame', 'sub_frame'])
    if (!condition.resourceTypes.length) return null
    documentScoped()
    return rule(PRIORITY.csp, {
      type: 'modifyHeaders',
      responseHeaders: [{ header: 'content-security-policy', operation: 'append', value: opts.csp }],
    })
  }

  if (opts.redirect) {
    const path = resolveRedirect(opts.redirect)
    if (path) {
      defaultTypes(ALL_TYPES_BUT_MAIN)
      if (!condition.resourceTypes.length) return null
      return rule(opts.important ? PRIORITY.importantRedirect : PRIORITY.redirect, {
        type: 'redirect',
        redirect: { extensionPath: path },
      })
    }
  }

  if (opts.document && condition.resourceTypes.length === 1) documentScoped()
  return rule(opts.important ? PRIORITY.importantBlock : PRIORITY.block, { type: 'block' })
}

const MERGE_CHUNK = 500

function stableKey(rule, others) {
  const sorted = Object.fromEntries(
    Object.entries(others)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v]),
  )
  return `${JSON.stringify(rule.action)}|${rule.priority}|${JSON.stringify(sorted)}`
}

/**
 * Collapses single-domain rules that share every other condition into multi-domain rules.
 * Thousands of `||host^` filters become a handful of rules, which is what lets the static
 * rule budget cover the whole list instead of just its first N lines. Subdomains already
 * covered by a parent domain in the same group are dropped (DNR matches subdomains).
 * Rules with a urlFilter or a different shape are returned untouched, after the merged ones.
 */
export function mergeDomainRules(rules) {
  const groups = new Map()
  const rest = []
  for (const rule of rules) {
    const { requestDomains, ...others } = rule.condition
    if (
      !requestDomains ||
      requestDomains.length !== 1 ||
      rule.condition.urlFilter ||
      rule.condition.regexFilter
    ) {
      rest.push(rule)
      continue
    }
    const key = stableKey(rule, others)
    if (!groups.has(key)) groups.set(key, { template: rule, others, domains: new Set() })
    groups.get(key).domains.add(requestDomains[0])
  }

  const merged = []
  for (const { template, others, domains } of groups.values()) {
    const kept = [...domains].filter((domain) => {
      const parts = domain.split('.')
      for (let i = 1; i < parts.length - 1; i++) {
        if (domains.has(parts.slice(i).join('.'))) return false
      }
      return true
    })
    for (let i = 0; i < kept.length; i += MERGE_CHUNK) {
      merged.push({
        priority: template.priority,
        action: template.action,
        condition: { requestDomains: kept.slice(i, i + MERGE_CHUNK), ...others },
      })
    }
  }
  return { merged, rest }
}

/**
 * Third-party ad hosts YouTube's player calls out to. YouTube's own endpoints
 * (/pagead/, /get_midroll_) are deliberately not blocked: when the player still
 * expects an ad, a blocked first-party request stalls playback on a black screen.
 */
export function buildYoutubeHandRules(startId = 900_000) {
  resetRuleIdCounter(startId)
  const youtubeInitiators = ['youtube.com', 'youtube-nocookie.com']
  const domains = [
    'googleads.g.doubleclick.net',
    'pubads.g.doubleclick.net',
    'securepubads.g.doubleclick.net',
    'pagead2.googlesyndication.com',
    'googleadservices.com',
    'imasdk.googleapis.com',
    'adservice.google.com',
  ]
  return domains.map((domain) => ({
    id: nextRuleId++,
    priority: 1,
    action: { type: 'block' },
    condition: {
      requestDomains: [domain],
      initiatorDomains: youtubeInitiators,
      resourceTypes: ['script', 'xmlhttprequest', 'image', 'sub_frame', 'ping', 'media'],
    },
  }))
}
