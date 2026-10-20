import { getInterceptorState, type InterceptorRuleHit, type InterceptorRuleType } from '@/core/interceptor'

function hitAction(ruleType: InterceptorRuleType): string {
  switch (ruleType) {
    case 'cancel':
      return 'blocked'
    case 'redirect':
      return 'redirected'
    case 'replace':
      return 'replaced'
    case 'queryParam':
      return 'query'
    case 'headers':
      return 'headers'
    case 'userAgent':
      return 'userAgent'
    case 'delay':
      return 'delay'
    default:
      return 'matched'
  }
}

export function hitsWithActions(hits: InterceptorRuleHit[]): InterceptorRuleHit[] {
  return hits.map((h) => ({
    ...h,
    action: h.action && h.action !== 'matched' ? h.action : hitAction(h.ruleType as InterceptorRuleType),
  }))
}

export async function notifyTabRuleToast(
  tabId: number,
  url: string,
  hits: InterceptorRuleHit[],
): Promise<void> {
  if (tabId < 0) return
  const state = await getInterceptorState()
  if (!state.settings.showPageToast || state.settings.paused) return
  const enriched = hitsWithActions(hits)
  const notify = enriched.filter((h) => h.action && h.action !== 'matched')
  if (!notify.length) return
  const primary = notify[0]
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'INTERCEPTOR_RULE_TOAST',
      ruleName: primary.ruleName,
      ruleType: primary.ruleType,
      kind: primary.action,
      url,
    })
  } catch {
    /* tab may not have content script */
  }
}
