import type { CapturedField, CapturedFile } from '@/core/form-memory/model'
import { MAX_FILE_BYTES } from '@/core/form-memory/files'

import { MAX_FILES } from './constants'
import { isChecked } from './dom'
import { firstNode } from './entry'
import { fieldLabel, optionLabel, placeholderOf, radioValue } from './labels'
import { clip, same } from './text'
import type { Entry, FieldValue, Widget } from './types'

export function editableText(host: HTMLElement): string {
  return (typeof host.innerText === 'string' ? host.innerText : (host.textContent ?? '')).trim()
}

/** What a div dropdown shows, minus a placeholder such as "Select…". */
export function shownText(host: HTMLElement): string {
  const text = clip(host.textContent ?? '', 300)
  const placeholder = placeholderOf(host) || clip(host.querySelector('[class*="placeholder" i]')?.textContent ?? '')
  return placeholder && same(text, placeholder) ? '' : text
}

export function widgetValue({ type, host, items }: Widget): FieldValue {
  if (type === 'check') return { value: isChecked(host) }
  if (type === 'radios') {
    const checked = items.find(isChecked)
    return { value: checked ? radioValue(checked) : '', display: checked ? optionLabel(checked) : undefined }
  }
  return { value: type === 'combo' ? shownText(host) : editableText(host) }
}

function currentValue(entry: Entry): FieldValue {
  if (entry.widget) return widgetValue(entry.widget)
  const el = entry.els[0]
  if (entry.kind === 'radio') {
    const checked = entry.els.find(isChecked)
    return { value: checked?.value ?? '', display: checked ? optionLabel(checked) : undefined }
  }
  if (entry.kind === 'checkbox') return { value: (el as HTMLInputElement).checked }
  if (entry.kind === 'file') {
    const names = [...((el as HTMLInputElement).files ?? [])].map((file) => file.name)
    return { value: names, display: names.join(', ') || undefined }
  }
  if (entry.kind === 'multi') {
    const options = [...(el as HTMLSelectElement).selectedOptions]
    return { value: options.map((option) => option.value), display: options.map((option) => clip(option.text, 60)).join(', ') }
  }
  if (entry.kind === 'select') {
    const option = (el as HTMLSelectElement).selectedOptions[0]
    return { value: (el as HTMLSelectElement).value, display: option ? clip(option.text, 120) : undefined }
  }
  return { value: el.value }
}

export function hasValue(entry: Entry): boolean {
  if (entry.widget) {
    if (entry.widget.type === 'check') return isChecked(entry.widget.host)
    if (entry.widget.type === 'radios') return entry.widget.items.some(isChecked)
    return widgetValue(entry.widget).value !== ''
  }
  const el = entry.els[0]
  if (entry.kind === 'text' || entry.kind === 'textarea') return el.value.trim() !== ''
  if (entry.kind === 'checkbox') return (el as HTMLInputElement).checked
  if (entry.kind === 'radio') return entry.els.some(isChecked)
  if (entry.kind === 'file') return ((el as HTMLInputElement).files?.length ?? 0) > 0
  return false
}

function read(entry: Entry): CapturedField {
  const el = firstNode(entry)
  return {
    key: entry.key,
    kind: entry.kind,
    name: el.getAttribute('name') || undefined,
    auto: el.getAttribute('autocomplete') || undefined,
    inputType: el instanceof HTMLInputElement ? el.type : undefined,
    label: fieldLabel(entry),
    ...currentValue(entry),
  }
}

async function encodeFiles(input: HTMLInputElement): Promise<CapturedFile[]> {
  const out: CapturedFile[] = []
  for (const file of [...(input.files ?? [])].slice(0, MAX_FILES)) {
    if (file.size > MAX_FILE_BYTES) continue
    const bytes = new Uint8Array(await file.arrayBuffer())
    let binary = ''
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
    }
    out.push({ name: file.name, type: file.type, size: file.size, data: btoa(binary) })
  }
  return out
}

/** What each entry holds now, in the shape the background stores; picked files come with their contents. */
export async function capture(entries: Entry[]): Promise<CapturedField[]> {
  return Promise.all(
    entries.map(async (entry) => {
      const field = read(entry)
      if (entry.kind !== 'file' || entry.widget) return field
      const files = await encodeFiles(entry.els[0] as HTMLInputElement)
      return { ...field, value: files.map((file) => file.name), files }
    }),
  )
}
