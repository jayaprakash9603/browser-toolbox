import { SUPPLEMENTAL_RULE_ID_BASE, SUPPLEMENTAL_RULE_ID_MAX } from '../constants'
import { compileDomainBlockRules } from './runtimeCompiler'

const PRIORITY = 1

export function isSupplementalRuleId(id: number): boolean {
  return id >= SUPPLEMENTAL_RULE_ID_BASE && id <= SUPPLEMENTAL_RULE_ID_MAX
}

export async function clearSupplementalRules(): Promise<void> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  const removeIds = existing.filter((rule) => isSupplementalRuleId(rule.id)).map((rule) => rule.id)
  if (!removeIds.length) return
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds })
}

export async function applySupplementalRules(
  lineSets: string[][],
  maxRules: number,
): Promise<{ applied: number; unsupported: number; domains: number }> {
  await clearSupplementalRules()
  const lines = lineSets.flat()
  const { rules, unsupported, domains } = compileDomainBlockRules(lines, SUPPLEMENTAL_RULE_ID_BASE, maxRules)
  if (!rules.length) return { applied: 0, unsupported, domains }
  const capped = rules.map((rule) => ({ ...rule, priority: PRIORITY }))
  await chrome.declarativeNetRequest.updateDynamicRules({ addRules: capped })
  return { applied: capped.length, unsupported, domains }
}
