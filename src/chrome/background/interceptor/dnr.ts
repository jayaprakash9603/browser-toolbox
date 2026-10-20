import {
  INTERCEPTOR_RULE_ID_BASE,
  INTERCEPTOR_RULE_ID_MAX,
  compileRulesToDnr,
  getInterceptorState,
  isInterceptorRuleId,
} from '@/core/interceptor'
import { createLogger } from '@/core/logging'

const logger = createLogger('interceptor-dnr')

export async function syncInterceptorDnrRules(): Promise<string[]> {
  const state = await getInterceptorState()
  const { rules, errors } = compileRulesToDnr(
    state.settings.paused ? [] : state.rules,
    INTERCEPTOR_RULE_ID_BASE,
  )
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = existing
    .filter((rule) => isInterceptorRuleId(rule.id, INTERCEPTOR_RULE_ID_BASE, INTERCEPTOR_RULE_ID_MAX))
    .map((rule) => rule.id)
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: rules,
    })
  } catch (error) {
    logger.warn('updateDynamicRules failed', error)
    errors.push(error instanceof Error ? error.message : 'DNR sync failed')
  }
  return errors
}
