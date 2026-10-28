import { registerMessageHandler } from '@/core/messaging'

export const RV_FRAMING_RULE_IDS = [91_101, 91_102] as const
/** Above the ad-block allowlist so allowlisted sites still load in previews. */
const RULE_PRIORITY = 1_000

const STRIP_FRAME_BLOCKING_HEADERS: chrome.declarativeNetRequest.ModifyHeaderInfo[] = [
  { header: 'x-frame-options', operation: 'remove' },
  { header: 'content-security-policy', operation: 'remove' },
  { header: 'content-security-policy-report-only', operation: 'remove' },
  { header: 'cross-origin-embedder-policy', operation: 'remove' },
  { header: 'cross-origin-opener-policy', operation: 'remove' },
  { header: 'cross-origin-resource-policy', operation: 'remove' },
]

const ACTION: chrome.declarativeNetRequest.RuleAction = {
  type: 'modifyHeaders',
  responseHeaders: STRIP_FRAME_BLOCKING_HEADERS,
}

const SUB_FRAME = ['sub_frame'] as chrome.declarativeNetRequest.ResourceType[]

/** Session rules that let subframes in the side panel load sites that block embedding. */
export function buildResponsiveViewerFramingRules(): chrome.declarativeNetRequest.Rule[] {
  const extensionId = chrome.runtime.id
  return [
    {
      id: RV_FRAMING_RULE_IDS[0],
      priority: RULE_PRIORITY,
      action: ACTION,
      condition: { resourceTypes: SUB_FRAME, tabIds: [chrome.tabs.TAB_ID_NONE] },
    },
    {
      id: RV_FRAMING_RULE_IDS[1],
      priority: RULE_PRIORITY,
      action: ACTION,
      condition: { resourceTypes: SUB_FRAME, initiatorDomains: [extensionId] },
    },
  ]
}

async function applyFraming(allowed: boolean): Promise<boolean> {
  const dnr = globalThis.chrome?.declarativeNetRequest
  if (!dnr?.updateSessionRules || !globalThis.chrome?.runtime?.id) return false
  try {
    await dnr.updateSessionRules({
      removeRuleIds: [...RV_FRAMING_RULE_IDS],
      addRules: allowed ? buildResponsiveViewerFramingRules() : [],
    })
    return true
  } catch {
    return false
  }
}

let queue: Promise<unknown> = Promise.resolve()

function setFramingAllowedQueued(allowed: boolean): Promise<boolean> {
  const run = queue.then(() => applyFraming(allowed))
  queue = run
  return run
}

export function registerResponsiveViewerFraming(): void {
  registerMessageHandler('RV_FRAMING_SET', async (message) => {
    if (message.type !== 'RV_FRAMING_SET') return { applied: false }
    const applied = await setFramingAllowedQueued(message.allowed)
    return { applied }
  })
}
