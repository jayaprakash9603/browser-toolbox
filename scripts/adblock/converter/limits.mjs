/**
 * Chrome guarantees 30,000 enabled static rules per extension. Merged multi-domain rules count
 * as one rule each, so these budgets mostly go to path (urlFilter) rules.
 * Default-enabled rulesets (ads + privacy + youtube) must stay under 30,000 together.
 */
export const RULESET_RULE_BUDGET = {
  ads: 10_000,
  privacy: 15_000,
  annoyances: 4_900,
}
export const MAX_STATIC_RULES_PER_RULESET = 10_000
/** Highly generic selectors (no id/class key) are injected into every frame, so keep them few. */
export const MAX_HIGHLY_GENERIC = 2500

export function capRules(rules, max) {
  if (rules.length <= max) return { rules, dropped: 0 }
  return { rules: rules.slice(0, max), dropped: rules.length - max }
}
