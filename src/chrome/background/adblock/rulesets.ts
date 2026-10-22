import {
  RULESET_IDS,
  RULESET_MANIFEST_IDS,
  type AdblockState,
  type RulesetId,
} from '@/core/adblock'
import { createLogger } from '@/core/logging'

const logger = createLogger('adblock-rulesets')

export function isRulesetOn(state: AdblockState, id: RulesetId): boolean {
  if (id === 'annoyances') return state.cookieBanners
  if (id === 'youtube') return state.youtubeEnabled && state.lists.youtube
  return state.lists[id]
}

export function enabledRulesetIds(state: AdblockState): string[] {
  if (!state.enabled) return []
  return RULESET_IDS.filter((id) => isRulesetOn(state, id)).map((id) => RULESET_MANIFEST_IDS[id])
}

export async function syncStaticRulesets(state: AdblockState): Promise<void> {
  const enable = enabledRulesetIds(state).sort()
  const disable = RULESET_IDS.map((id) => RULESET_MANIFEST_IDS[id])
    .filter((id) => !enable.includes(id))
    .sort()
  try {
    const getEnabled = chrome.declarativeNetRequest.getEnabledRulesets
    if (typeof getEnabled === 'function') {
      const current = await getEnabled()
      const currentSorted = [...current].sort()
      if (currentSorted.join('\n') === enable.join('\n')) return
    }
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enable,
      disableRulesetIds: disable,
    })
  } catch (error) {
    logger.warn('updateEnabledRulesets failed', error)
  }
}
