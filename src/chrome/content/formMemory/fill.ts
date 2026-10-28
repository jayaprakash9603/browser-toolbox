import type { MemoryField } from '@/core/form-memory/model'
import type { StoredFormFile } from '@/core/form-memory/files'

import { collect, visible } from './collect'
import { FILL_COLOR } from './constants'
import { choose } from './dropdown'
import { isChecked, isPicker, writable } from './dom'
import { writeEditable } from './editable'
import { fire, flash, press, setNative } from './events'
import { radioValue } from './labels'
import { matchPage, sharedFor } from './match'
import { clip, looksLikeDate, same } from './text'
import type { Control, Entry, Widget } from './types'
import { editableText, hasValue, shownText } from './values'

interface FillOptions {
  /** Replace values already on the page instead of only filling empty controls. */
  overwrite: boolean
  files?: Record<string, StoredFormFile>
}

function applyFiles(input: HTMLInputElement, field: MemoryField, { overwrite, files }: FillOptions): boolean {
  const stored = (Array.isArray(field.value) ? field.value : [])
    .map((id) => files?.[id])
    .filter((file): file is StoredFormFile => Boolean(file))
  if (stored.length === 0 || (!overwrite && (input.files?.length ?? 0) > 0)) return false
  const transfer = new DataTransfer()
  for (const file of input.multiple ? stored : stored.slice(0, 1)) {
    const bytes = Uint8Array.from(atob(file.data), (char) => char.charCodeAt(0))
    transfer.items.add(new File([bytes], file.name, { type: file.type }))
  }
  input.files = transfer.files
  fire(input)
  flash(input, FILL_COLOR)
  return true
}

async function applyWidget({ type, host, items }: Widget, field: MemoryField, overwrite: boolean): Promise<boolean> {
  if (host.getAttribute('aria-disabled') === 'true') return false
  if (type === 'check') {
    if (isChecked(host) === field.value) return false
    press(host)
    flash(host, FILL_COLOR)
    return true
  }
  if (type === 'radios') {
    const target = items.find((item) => radioValue(item) === field.value)
    if (!target || isChecked(target) || (!overwrite && items.some(isChecked))) return false
    press(target)
    flash(target, FILL_COLOR)
    return true
  }
  const value = typeof field.value === 'string' ? field.value : ''
  const current = type === 'combo' ? shownText(host) : editableText(host)
  if (same(current, value) || (!overwrite && current !== '')) return false
  if (type === 'editable') return writeEditable(host, value)
  if (!(await choose(host, value, () => same(shownText(host), value)))) return false
  flash(host, FILL_COLOR)
  return true
}

function applyRadio(entry: Entry, field: MemoryField, overwrite: boolean): boolean {
  const target = entry.els.find((radio) => radio.value === field.value) as HTMLInputElement | undefined
  if (!target || target.checked || !writable(target, true)) return false
  if (!overwrite && hasValue(entry)) return false
  target.click()
  flash(target, FILL_COLOR)
  return true
}

function applyCheckbox(input: HTMLInputElement, field: MemoryField): boolean {
  if (input.checked === field.value) return false
  input.click()
  flash(input, FILL_COLOR)
  return true
}

function applyMulti(select: HTMLSelectElement, field: MemoryField): boolean {
  const wanted = new Set(Array.isArray(field.value) ? field.value : [])
  let changed = false
  for (const option of select.options) {
    const next = wanted.has(option.value)
    if (option.selected !== next) {
      option.selected = next
      changed = true
    }
  }
  if (changed) {
    fire(select)
    flash(select, FILL_COLOR)
  }
  return changed
}

function applySelect(select: HTMLSelectElement, field: MemoryField): boolean {
  const options = [...select.options]
  const option =
    options.find((item) => item.value === field.value) ??
    (field.display ? options.find((item) => clip(item.text, 120) === field.display) : undefined)
  if (!option || select.value === option.value) return false
  setNative(select, 'value', option.value)
  fire(select)
  flash(select, FILL_COLOR)
  return true
}

async function applyText(el: Control, field: MemoryField, overwrite: boolean): Promise<boolean> {
  const value = typeof field.value === 'string' ? field.value : ''
  if (el.value === value) return false
  if (!overwrite && el.value.trim() !== '') return false
  // A read-only dropdown box only changes the page's model when one of its items is clicked.
  const picked = isPicker(el) && el.readOnly && !looksLikeDate(value) && (await choose(el, value, () => same(el.value, value)))
  if (!picked) {
    setNative(el, 'value', value)
    fire(el)
  }
  flash(el, FILL_COLOR)
  return true
}

async function apply(entry: Entry, field: MemoryField, options: FillOptions): Promise<boolean> {
  if (entry.kind !== field.kind) return false
  if (entry.widget) return applyWidget(entry.widget, field, options.overwrite)
  if (entry.kind === 'radio') return applyRadio(entry, field, options.overwrite)
  const el = entry.els[0]
  if (!writable(el, true)) return false
  if (entry.kind === 'file') return applyFiles(el as HTMLInputElement, field, options)
  if (entry.kind === 'checkbox') return applyCheckbox(el as HTMLInputElement, field)
  if (entry.kind === 'multi') return applyMulti(el as HTMLSelectElement, field)
  if (entry.kind === 'select') return applySelect(el as HTMLSelectElement, field)
  return applyText(el, field, options.overwrite)
}

/** One unusual widget must not stop the rest of the form from filling. */
async function applySafely(entry: Entry, field: MemoryField, options: FillOptions): Promise<boolean> {
  try {
    return await apply(entry, field, options)
  } catch {
    return false
  }
}

/**
 * A dependent list (a city list loaded after the country is picked) may not offer the saved
 * option yet, or may still be disabled; a later pass tries again.
 */
function awaitingOptions(entry: Entry, field: MemoryField): boolean {
  if (entry.widget) return entry.widget.type === 'combo' && shownText(entry.widget.host) === ''
  if (entry.kind !== 'select' && entry.kind !== 'multi') return false
  const select = entry.els[0] as HTMLSelectElement
  if (select.disabled) return true
  const offered = [...select.options]
  const wanted = Array.isArray(field.value) ? field.value : [String(field.value)]
  return wanted.some(
    (value) => !offered.some((option) => option.value === value || (field.display && clip(option.text, 120) === field.display)),
  )
}

/**
 * Fills visible fields from this page's saved values, then empty ones a shared value fits.
 * Keys in `done` are skipped and added to; fields on hidden screens, and lists whose options
 * have not loaded, stay out of it, so a later pass fills them once they are ready.
 */
export async function fillPass(
  fields: MemoryField[],
  shared: MemoryField[],
  options: FillOptions,
  done: Set<string>,
): Promise<number> {
  const entries = collect().filter(visible)
  const matched = matchPage(entries, fields)
  const claimed = new Set(matched.values())
  let filled = 0
  for (const field of fields) {
    const entry = matched.get(field.key)
    if (done.has(field.key) || !entry) continue
    const changed = await applySafely(entry, field, options)
    if (changed) filled += 1
    if (changed || !awaitingOptions(entry, field)) done.add(field.key)
  }
  const labels = new Map<Entry, string>()
  for (const entry of shared.length > 0 ? entries : []) {
    if (claimed.has(entry) || done.has(entry.key) || hasValue(entry)) continue
    const field = sharedFor(entry, shared, labels)
    if (!field) continue
    done.add(entry.key)
    if (await applySafely(entry, field, { ...options, overwrite: false })) filled += 1
  }
  return filled
}
