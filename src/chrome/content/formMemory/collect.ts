import type { MemoryFieldKind } from '@/core/form-memory/model'

import { forget, memo } from './cache'
import { EDITABLE_SELECTOR, MAX_EDITABLES, WIDGET_KIND, WIDGET_SELECTOR } from './constants'
import { eligible, isField, widgetOf, widgetType } from './detect'
import { isCheckable, rendered } from './dom'
import { groupLabel, labelsOf, ownLabel, radioLabel } from './labels'
import { stableId } from './text'
import type { Control, Entry, Widget } from './types'

/** Frames get their own address in field keys so their fields never collide with the page's. */
function framePrefix(): string {
  return window.top === window ? '' : `${location.host}${location.pathname}>`
}

function kindOf(el: Control): MemoryFieldKind {
  if (el instanceof HTMLSelectElement) return el.multiple ? 'multi' : 'select'
  if (el instanceof HTMLTextAreaElement) return 'textarea'
  const type = el.type.toLowerCase()
  if (type === 'checkbox') return 'checkbox'
  if (type === 'radio') return 'radio'
  if (type === 'file') return 'file'
  return 'text'
}

/** Styled checkboxes, file pickers and selects (chosen.js) hide the real control behind a face of their own. */
function onScreen(el: Element): boolean {
  if (rendered(el)) return true
  const reskinned = el instanceof HTMLSelectElement || isCheckable(el) || (el instanceof HTMLInputElement && el.type === 'file')
  if (!reskinned || !el.parentElement || !rendered(el.parentElement)) return false
  if (labelsOf(el).some(rendered)) return true
  return [el.nextElementSibling, el.previousElementSibling].some((face) => face && !isField(face) && rendered(face))
}

export const visible = (entry: Entry): boolean => (entry.widget ? rendered(entry.widget.host) : entry.els.some(onScreen))

function gather(root: Document | ShadowRoot, controls: Control[], widgets: Widget[]): void {
  root.querySelectorAll(`input, textarea, select, ${WIDGET_SELECTOR}`).forEach((el) => {
    if (eligible(el)) controls.push(el)
    else if (el instanceof HTMLElement) {
      const type = widgetType(el)
      if (type) widgets.push(widgetOf(el, type))
    }
  })
  root.querySelectorAll('*').forEach((el) => {
    if (el.shadowRoot) gather(el.shadowRoot, controls, widgets)
  })
}

/**
 * Every fillable field in this frame, hidden ones included, so the `#n` suffix that tells
 * same-named fields apart does not shift when a tab or step is shown.
 */
export function collect(): Entry[] {
  forget()
  memo.editablesAllowed = document.querySelectorAll(EDITABLE_SELECTOR).length <= MAX_EDITABLES
  const prefix = framePrefix()
  const controls: Control[] = []
  const widgets: Widget[] = []
  gather(document, controls, widgets)
  const entries: Entry[] = []
  const radios = new Map<string, Entry>()
  const used = new Map<string, number>()
  const add = (key: string, entry: Omit<Entry, 'key'>) => {
    const seen = used.get(key) ?? 0
    used.set(key, seen + 1)
    entries.push({ ...entry, key: seen > 0 ? `${key}#${seen + 1}` : key })
  }
  for (const el of controls) {
    const kind = kindOf(el)
    const base = el.name || stableId(el.id) || ownLabel(el) || kind
    if (kind === 'radio') {
      const groupKey = `${prefix}radio:${el.name || groupLabel(el) || base}`
      const group = radios.get(groupKey)
      if (group) {
        group.els.push(el)
        continue
      }
      const entry = { key: groupKey, kind, els: [el] }
      radios.set(groupKey, entry)
      entries.push(entry)
      continue
    }
    const value = kind === 'checkbox' && el.value && el.value !== 'on' ? `=${el.value}` : ''
    add(`${prefix}${kind}:${base}${value}`, { kind, els: [el] })
  }
  for (const widget of widgets) {
    const kind = WIDGET_KIND[widget.type]
    const entry = { key: '', kind, els: [], widget }
    const host = widget.host
    const named = host.getAttribute('name') || stableId(host.id)
    const base = named || (widget.type === 'radios' ? radioLabel(entry) : ownLabel(host)) || kind
    add(`${prefix}${kind}:${base}`, entry)
  }
  return entries
}
