import type { FormMemoryPageScope } from './types'

export const pageScope = (): FormMemoryPageScope => window as unknown as FormMemoryPageScope

/** The value `select` held the first time the extension saw it on this page. */
export function initialValue(select: HTMLSelectElement): string {
  const scope = pageScope()
  const seen = (scope.__tbxFormMemoryInitial ??= new WeakMap())
  if (!seen.has(select)) seen.set(select, select.value)
  return seen.get(select) ?? select.value
}

/**
 * `click()` on a checkbox or radio makes the browser fire a trusted change event, so the watcher
 * is told to look away while the extension itself fills or clears.
 */
export async function quietly<T>(change: () => T | Promise<T>): Promise<T> {
  const scope = pageScope()
  scope.__tbxFormMemoryQuiet = (scope.__tbxFormMemoryQuiet ?? 0) + 1
  try {
    return await change()
  } finally {
    scope.__tbxFormMemoryQuiet = Math.max(0, (scope.__tbxFormMemoryQuiet ?? 1) - 1)
    // Watchers injected by an older build have no rebase.
    scope.__tbxFormMemory?.rebase?.()
  }
}
