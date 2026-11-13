import { createLogger } from '@/core/logging'

const logger = createLogger('api-client-dnr')

export const API_CLIENT_DNR_RULE_ID = 91_103 as const

const RULE_PRIORITY = 2_000

export function buildApiClientBypassRules(
  extensionId: string,
): chrome.declarativeNetRequest.Rule[] {
  return [
    {
      id: API_CLIENT_DNR_RULE_ID,
      priority: RULE_PRIORITY,
      action: { type: 'allow' },
      condition: {
        initiatorDomains: [extensionId],
        resourceTypes: [
          'xmlhttprequest',
          'other',
        ] as chrome.declarativeNetRequest.ResourceType[],
      },
    },
  ]
}

export async function ensureApiClientDnrBypass(): Promise<void> {
  const dnr = globalThis.chrome?.declarativeNetRequest
  const extensionId = globalThis.chrome?.runtime?.id
  if (!dnr?.updateSessionRules || !extensionId) return
  try {
    await dnr.updateSessionRules({
      removeRuleIds: [API_CLIENT_DNR_RULE_ID],
      addRules: buildApiClientBypassRules(extensionId),
    })
  } catch (error) {
    logger.warn('api client DNR bypass failed', error)
  }
}
