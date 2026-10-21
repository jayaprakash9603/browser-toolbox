import {
  INTERCEPTOR_RULE_ID_BASE,
  INTERCEPTOR_RULE_ID_MAX,
  compileRulesToDnr,
  getInterceptorState,
  isInterceptorRuleId,
} from '@/core/interceptor'
import { createLogger } from '@/core/logging'

import { reconcileDynamicRules } from '../scriptRegistry'

const logger = createLogger('interceptor-dnr')

export async function syncInterceptorDnrRules(): Promise<string[]> {
  const state = await getInterceptorState()
  const { rules, errors } = compileRulesToDnr(
    state.settings.paused ? [] : state.rules,
    INTERCEPTOR_RULE_ID_BASE,
    state.groups,
  )
  try {
    await reconcileDynamicRules(
      (id) => isInterceptorRuleId(id, INTERCEPTOR_RULE_ID_BASE, INTERCEPTOR_RULE_ID_MAX),
      rules,
    )
  } catch (error) {
    logger.warn('updateDynamicRules failed', error)
    errors.push(error instanceof Error ? error.message : 'DNR sync failed')
  }
  return errors
}
