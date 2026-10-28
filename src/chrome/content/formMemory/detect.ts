import { memo } from './cache'
import { ANY_FIELD, EDITABLE_SELECTOR, FIELD_SELECTOR, IGNORE_SELECTOR, POPUP_SELECTOR } from './constants'
import { isControl, isPicker, isSensitive } from './dom'
import { quote } from './text'
import type { Control, Widget, WidgetType } from './types'

/** A month grid: 28 or more day numbers in cells of their own. */
function holdsCalendar(node: Element): boolean {
  const cached = memo.calendar.get(node)
  if (cached !== undefined) return cached
  const days = new Set<number>()
  for (const cell of node.querySelectorAll('td, a, button, span, div, [role=gridcell]')) {
    if (cell.childElementCount > 1) continue
    const text = (cell.textContent ?? '').trim()
    const day = /^\d{1,2}$/.test(text) ? Number(text) : 0
    if (day >= 1 && day <= 31) days.add(day)
  }
  const found = days.size >= 28
  memo.calendar.set(node, found)
  return found
}

function controlledElsewhere(node: Element, el: Element): boolean {
  if (!node.id) return false
  const id = quote(node.id)
  const owner = document.querySelector(`[aria-controls~="${id}"], [aria-owns~="${id}"]`)
  return Boolean(owner && owner !== el && !owner.contains(el))
}

/**
 * The search box inside a dropdown and the month and year selects of a calendar serve another
 * control; they are never what the user wants remembered, and never a field of their own.
 */
function auxiliary(el: Element): boolean {
  const cached = memo.aux.get(el)
  if (cached !== undefined) return cached
  let found = Boolean(el.closest(POPUP_SELECTOR))
  let node = el.parentElement
  for (let depth = 0; !found && node && node !== document.body && depth < 6; depth += 1, node = node.parentElement) {
    // A dropdown panel usually sits right after the box that opens it.
    for (let sibling = node.previousElementSibling, steps = 0; sibling && steps < 6; sibling = sibling.previousElementSibling, steps += 1) {
      if (isPicker(sibling)) found = true
    }
    if (controlledElsewhere(node, el)) found = true
    if (depth < 4 && node.querySelectorAll(FIELD_SELECTOR).length <= 4 && holdsCalendar(node)) found = true
  }
  memo.aux.set(el, found)
  return found
}

export function eligible(el: unknown): el is Control {
  if (!isControl(el)) return false
  if (el.closest(IGNORE_SELECTOR)) return false
  // Hidden proxy inputs behind styled widgets (MUI, Headless UI) mirror a value the widget owns.
  if (el instanceof HTMLInputElement && el.getAttribute('aria-hidden') === 'true') return false
  return !isSensitive(el) && !auxiliary(el)
}

/** A styled shell around a hidden select or picker input (select2, Headless UI) repeats that control. */
function mirrorsNative(el: Element): boolean {
  let node = el.parentElement
  for (let depth = 0; node && node !== document.body && depth < 3; depth += 1, node = node.parentElement) {
    for (const control of node.querySelectorAll('select, input')) {
      if (control instanceof HTMLSelectElement || isPicker(control)) return true
    }
  }
  return false
}

function detectWidget(el: Element): WidgetType | null {
  if (!(el instanceof HTMLElement) || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return null
  if (el instanceof HTMLSelectElement || el.closest(IGNORE_SELECTOR) || isSensitive(el)) return null
  if (el.matches(EDITABLE_SELECTOR)) {
    return memo.editablesAllowed && !el.parentElement?.closest(EDITABLE_SELECTOR) ? 'editable' : null
  }
  if (el.closest(`${EDITABLE_SELECTOR}, ${POPUP_SELECTOR}`)) return null
  // A role on a wrapper around a real control (ARIA 1.1 combobox) describes that control.
  if (el.querySelector(FIELD_SELECTOR)) return null
  const role = el.getAttribute('role')
  if (role === 'checkbox' || role === 'switch') return 'check'
  if (role === 'radiogroup') return el.querySelector('[role=radio]') ? 'radios' : null
  if (role === 'combobox' || el.getAttribute('aria-haspopup') === 'listbox') return mirrorsNative(el) ? null : 'combo'
  return null
}

export function widgetType(el: Element): WidgetType | null {
  if (!memo.widget.has(el)) memo.widget.set(el, detectWidget(el))
  return memo.widget.get(el) ?? null
}

export function widgetOf(host: HTMLElement, type: WidgetType): Widget {
  return { type, host, items: type === 'radios' ? [...host.querySelectorAll<HTMLElement>('[role=radio]')] : [] }
}

/** Anything a caption search must not reach across. */
export function isField(el: Element): boolean {
  return (el.matches(FIELD_SELECTOR) && !auxiliary(el)) || widgetType(el) !== null
}

export function fieldsWithin(container: Element, own: Element[]): boolean {
  for (const el of container.querySelectorAll(ANY_FIELD)) {
    if (!own.includes(el) && isField(el)) return true
  }
  return false
}
