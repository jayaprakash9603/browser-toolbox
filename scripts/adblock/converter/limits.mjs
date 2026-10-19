/** Chrome guarantees 30,000 enabled static rules per extension; split that budget per ruleset. */
export const RULESET_RULE_BUDGET = {
  ads: 16_000,
  privacy: 12_000,
  annoyances: 1_800,
}
export const MAX_STATIC_RULES_PER_RULESET = 16_000
export const MAX_COSMETIC_GENERIC = 6000
export const MAX_COSMETIC_SPECIFIC_HOSTS = 4000

export function capRules(rules, max) {
  if (rules.length <= max) return { rules, dropped: 0 }
  return { rules: rules.slice(0, max), dropped: rules.length - max }
}
