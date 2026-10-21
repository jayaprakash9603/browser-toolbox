import { ALLOWLIST_RULE_ID_BASE, ALLOWLIST_RULE_PRIORITY } from '@/core/adblock'
import { normalizeHostname } from '@/core/adblock/hostname'
import { createLogger } from '@/core/logging'

import { reconcileDynamicRules } from '../scriptRegistry'

const logger = createLogger('adblock-allowlist')

export const ALLOWLIST_RULE_ID_MAX = ALLOWLIST_RULE_ID_BASE + 50_000

export function allowlistRuleIdForIndex(index: number): number {
  return ALLOWLIST_RULE_ID_BASE + index
}

export function isAdblockAllowlistRuleId(id: number): boolean {
  return id >= ALLOWLIST_RULE_ID_BASE && id < ALLOWLIST_RULE_ID_MAX
}

export function buildAllowlistRules(hosts: string[]): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = []
  const seen = new Set<string>()
  let index = 0
  for (const raw of hosts) {
    const host = normalizeHostname(raw)
    if (!host || seen.has(host)) continue
    seen.add(host)
    rules.push({
      id: allowlistRuleIdForIndex(index),
      priority: ALLOWLIST_RULE_PRIORITY,
      action: { type: 'allowAllRequests' },
      condition: {
        requestDomains: [host],
        resourceTypes: ['main_frame', 'sub_frame'],
      },
    })
    index += 1
  }
  return rules
}

export async function syncAllowlistRules(allowlist: string[]): Promise<void> {
  const addRules = buildAllowlistRules(allowlist)
  try {
    await reconcileDynamicRules(isAdblockAllowlistRuleId, addRules)
  } catch (error) {
    logger.warn('updateDynamicRules failed', error)
  }
}
