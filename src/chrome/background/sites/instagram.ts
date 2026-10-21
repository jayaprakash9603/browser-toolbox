import {
  getInstagramEnhancerState,
  INSTAGRAM_GHOST_STORY_RULE_ID,
  isFeatureOn,
} from '@/core/sites/instagram'
import { STORAGE_KEYS } from '@/core/constants'

import { injectInstagramIntoOpenTabs, syncInstagramContentScripts } from './instagramContentScripts'

const GHOST_STORY_URL_FILTER =
  '*://*.instagram.com/api/v1/stories/reel/seen*'

async function syncGhostStoryRule(enabled: boolean): Promise<void> {
  const removeRuleIds = [INSTAGRAM_GHOST_STORY_RULE_ID]
  if (!enabled) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds })
    return
  }
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: [
      {
        id: INSTAGRAM_GHOST_STORY_RULE_ID,
        priority: 1,
        action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
        condition: {
          urlFilter: GHOST_STORY_URL_FILTER,
          resourceTypes: ['xmlhttprequest' as chrome.declarativeNetRequest.ResourceType],
        },
      },
    ],
  })
}

export async function syncInstagramEnhancerState(): Promise<void> {
  const state = await getInstagramEnhancerState()
  await syncInstagramContentScripts(state)
  await injectInstagramIntoOpenTabs(state)
  await syncGhostStoryRule(state.enabled && isFeatureOn(state.values, 'ghostStories'))
}

export function registerSitesInstagram(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.instagramEnhancer]) void syncInstagramEnhancerState()
  })
  void syncInstagramEnhancerState()
}
