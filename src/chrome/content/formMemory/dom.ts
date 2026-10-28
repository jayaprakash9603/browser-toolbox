import { SENSITIVE, SENSITIVE_AUTO, SKIP_TYPES } from './constants'
import type { Control } from './types'

export function isSensitive(el: Element): boolean {
  if (SENSITIVE_AUTO.test((el.getAttribute('autocomplete') ?? '').toLowerCase())) return true
  return SENSITIVE.test(el.getAttribute('name') ?? '') || SENSITIVE.test(el.id)
}

export function isControl(el: unknown): el is Control {
  if (el instanceof HTMLInputElement) return !SKIP_TYPES.has((el.type || 'text').toLowerCase())
  return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
}

export function isCheckable(el: Element): boolean {
  if (el instanceof HTMLInputElement) return el.type === 'checkbox' || el.type === 'radio'
  return ['checkbox', 'switch', 'radio'].includes(el.getAttribute('role') ?? '')
}

export function isChecked(el: Element): boolean {
  return el instanceof HTMLInputElement ? el.checked : el.getAttribute('aria-checked') === 'true'
}

/** A text box whose value comes from a list or calendar the page opens for it. */
export function isPicker(el: Element): el is HTMLInputElement {
  if (!(el instanceof HTMLInputElement) || !isControl(el) || isCheckable(el) || el.type === 'file') return false
  const autocomplete = el.getAttribute('aria-autocomplete') ?? ''
  return (
    el.readOnly ||
    el.getAttribute('role') === 'combobox' ||
    el.hasAttribute('aria-haspopup') ||
    autocomplete === 'list' ||
    autocomplete === 'both'
  )
}

/** Date pickers often mark their input read-only so only the calendar can set it. */
export function writable(el: Control, allowReadOnly: boolean): boolean {
  if (el.disabled) return false
  return allowReadOnly || el instanceof HTMLSelectElement || !el.readOnly
}

export function shown(el: Element): boolean {
  for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
    if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') return false
    const style = getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return false
  }
  return true
}

/** Laid out on the page: not inside a hidden tab, collapsed section, template or closed dialog. */
export function rendered(el: Element): boolean {
  if (typeof el.checkVisibility !== 'function') return shown(el)
  if (!el.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true })) return false
  // Zero-sized or parked far off the page: honeypots and stashed copies of a field.
  const box = el.getBoundingClientRect()
  if (box.width === 0 && box.height === 0) return false
  return box.right + window.scrollX > 0 && box.bottom + window.scrollY > 0
}

export function hidden(el: Element): boolean {
  if (el.closest('[hidden], [aria-hidden="true"]')) return true
  const style = getComputedStyle(el)
  return style.display === 'none' || style.visibility === 'hidden'
}
