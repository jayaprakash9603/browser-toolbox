let nextRuleId = 1

export function resetRuleIdCounter(start = 1) {
  nextRuleId = start
}

export function networkFilterToDnrRule(filter, ruleIdStart) {
  if (ruleIdStart != null) nextRuleId = ruleIdStart
  const { host, opts, exception } = filter
  if (!host || (host.type !== 'domain' && host.type !== 'url')) return null

  const condition = host.type === 'domain' ? { requestDomains: [host.value] } : { urlFilter: host.value }

  if (opts.thirdParty === true) condition.domainType = 'thirdParty'
  if (opts.thirdParty === false) condition.domainType = 'firstParty'
  if (opts.domains.length) condition.initiatorDomains = opts.domains
  if (opts.excludedDomains.length) condition.excludedInitiatorDomains = opts.excludedDomains
  if (opts.resourceTypes.length) condition.resourceTypes = [...new Set(opts.resourceTypes)]

  return {
    id: nextRuleId++,
    priority: exception ? 2 : 1,
    action: exception ? { type: 'allow' } : { type: 'block' },
    condition,
  }
}

const MERGE_CHUNK = 500

function stableKey(rule, others) {
  const sorted = Object.fromEntries(
    Object.entries(others)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v]),
  )
  return `${rule.action.type}|${rule.priority}|${JSON.stringify(sorted)}`
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
    if (!requestDomains || requestDomains.length !== 1 || rule.condition.urlFilter) {
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
