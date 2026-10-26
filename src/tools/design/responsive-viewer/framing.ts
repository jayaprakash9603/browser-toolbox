const RULE_IDS = [91_101, 91_102]
/** Above the ad-block allowlist so allowlisted sites still load in previews. */
const RULE_PRIORITY = 1_000

const ACTION: chrome.declarativeNetRequest.RuleAction = {
  type: 'modifyHeaders',
  responseHeaders: [
    { header: 'x-frame-options', operation: 'remove' },
    { header: 'content-security-policy', operation: 'remove' },
  ],
}

const SUB_FRAME = ['sub_frame'] as chrome.declarativeNetRequest.ResourceType[]

/**
 * Lets pages that send X-Frame-Options or CSP frame-ancestors render in the viewer's iframes.
 * Scoped to frames outside browser tabs (the side panel) and frames the extension itself opens,
 * so regular browsing keeps every header.
 */
function framingRules(): chrome.declarativeNetRequest.Rule[] {
  return [
    {
      id: RULE_IDS[0],
      priority: RULE_PRIORITY,
      action: ACTION,
      condition: { resourceTypes: SUB_FRAME, tabIds: [chrome.tabs.TAB_ID_NONE] },
    },
    {
      id: RULE_IDS[1],
      priority: RULE_PRIORITY,
      action: ACTION,
      condition: { resourceTypes: SUB_FRAME, initiatorDomains: [chrome.runtime.id] },
    },
  ]
}

async function applyFraming(allowed: boolean): Promise<boolean> {
  const dnr = globalThis.chrome?.declarativeNetRequest
  if (!dnr?.updateSessionRules || !globalThis.chrome?.runtime?.id) return false
  try {
    await dnr.updateSessionRules({ removeRuleIds: RULE_IDS, addRules: allowed ? framingRules() : [] })
    return true
  } catch {
    return false
  }
}

let queue: Promise<unknown> = Promise.resolve()

/**
 * Updates are serialized so a quick unmount/remount (or toggle) always ends in the last requested state.
 * Resolves false when the rules could not be changed (no extension context or API error).
 */
export function setFramingAllowed(allowed: boolean): Promise<boolean> {
  const run = queue.then(() => applyFraming(allowed))
  queue = run
  return run
}
