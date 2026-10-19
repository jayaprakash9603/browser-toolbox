let nextRuleId = 1

export function resetRuleIdCounter(start = 1) {
  nextRuleId = start
}

export function networkFilterToDnrRule(filter, ruleIdStart) {
  if (ruleIdStart != null) nextRuleId = ruleIdStart
  const { host, opts, exception } = filter
  if (!host || host.type !== 'domain') return null

  const condition = { requestDomains: [host.value] }

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
    'pagead2.googlesyndication.com',
    'googleadservices.com',
    'imasdk.googleapis.com',
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
