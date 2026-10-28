import type { MemoryField } from '@/core/form-memory/model'

import { collect, visible } from './collect'
import { CLEAR_COLOR } from './constants'
import { isChecked, writable } from './dom'
import { writeEditable } from './editable'
import { fire, flash, press, setNative } from './events'
import { rememberedBy } from './match'
import { initialValue } from './scope'
import type { Entry, Widget } from './types'
import { editableText, hasValue } from './values'

function clearWidget({ type, host }: Widget): boolean {
  if (type === 'check' && isChecked(host)) {
    press(host)
    flash(host, CLEAR_COLOR)
    return true
  }
  return type === 'editable' && editableText(host) !== '' && writeEditable(host, '')
}

function clearRadios(entry: Entry, remembered: boolean): boolean {
  const checked = entry.els.filter((radio) => isChecked(radio) && writable(radio, remembered))
  for (const radio of checked) {
    setNative(radio, 'checked', false)
    fire(radio)
    flash(radio, CLEAR_COLOR)
  }
  return checked.length > 0
}

/** Back to the empty choice, else to what the page showed before anything was filled. */
function clearSelect(select: HTMLSelectElement): boolean {
  const options = [...select.options]
  const initial = initialValue(select)
  const blank =
    options.find((item) => item.value === '') ??
    (initial !== select.value ? options.find((item) => item.value === initial) : undefined) ??
    options.find((item) => item.defaultSelected) ??
    options[0]
  if (!blank || select.value === blank.value) return false
  setNative(select, 'value', blank.value)
  fire(select)
  flash(select, CLEAR_COLOR)
  return true
}

function clearMulti(select: HTMLSelectElement): boolean {
  if (select.selectedOptions.length === 0) return false
  for (const option of select.options) option.selected = false
  fire(select)
  flash(select, CLEAR_COLOR)
  return true
}

/** Read-only controls and div widgets are only cleared when they hold a remembered value. */
export function clearEntry(entry: Entry, remembered: boolean): boolean {
  if (entry.widget) return remembered && clearWidget(entry.widget)
  if (entry.kind === 'radio') return clearRadios(entry, remembered)
  const el = entry.els[0]
  if (!writable(el, remembered)) return false
  if (entry.kind === 'checkbox') {
    const input = el as HTMLInputElement
    if (!input.checked) return false
    input.click()
    flash(input, CLEAR_COLOR)
    return true
  }
  if (entry.kind === 'multi') return clearMulti(el as HTMLSelectElement)
  if (entry.kind === 'select') return clearSelect(el as HTMLSelectElement)
  if (entry.kind === 'file' && !hasValue(entry)) return false
  if (el.value === '') return false
  setNative(el, 'value', '')
  fire(el)
  flash(el, CLEAR_COLOR)
  return true
}

/** Empties the visible fields holding remembered values and returns how many changed. */
export function clearPass(fields: MemoryField[], shared: MemoryField[]): number {
  const entries = collect().filter(visible)
  const remembered = rememberedBy(entries, fields, shared)
  return entries.filter((entry) => remembered(entry) && clearEntry(entry, true)).length
}
