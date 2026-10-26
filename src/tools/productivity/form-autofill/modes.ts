export const AUTOFILL_MODE_IDS = ['suggest', 'review', 'trusted'] as const
export type AutofillModeId = (typeof AUTOFILL_MODE_IDS)[number]

export function isAutofillMode(value: unknown): value is AutofillModeId {
  return typeof value === 'string' && (AUTOFILL_MODE_IDS as readonly string[]).includes(value)
}
