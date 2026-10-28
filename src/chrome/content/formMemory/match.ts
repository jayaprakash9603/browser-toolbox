import type { MemoryField } from '@/core/form-memory/model'

import { firstNode } from './entry'
import { fieldLabel } from './labels'
import { norm } from './text'
import type { Entry } from './types'

/** A global or other-page value that fits this field, matched by autocomplete hint, name or label. */
export function sharedFor(entry: Entry, shared: MemoryField[]): MemoryField | undefined {
  const el = firstNode(entry)
  const auto = (el.getAttribute('autocomplete') ?? '').toLowerCase()
  const usefulAuto = auto && !/^(on|off)$/.test(auto) ? auto : ''
  const name = (el.getAttribute('name') ?? '').toLowerCase()
  const label = norm(fieldLabel(entry))
  return shared.find(
    (field) =>
      field.kind === entry.kind &&
      ((usefulAuto && field.auto?.toLowerCase() === usefulAuto) ||
        (name && field.name?.toLowerCase() === name) ||
        (label && norm(field.label) === label)),
  )
}

/** Clear only undoes what the extension knows: this page's saved fields and fields a shared value fits. */
export function rememberedBy(fields: MemoryField[], shared: MemoryField[]): (entry: Entry) => boolean {
  const saved = new Set(fields.map((field) => field.key))
  return (entry) => saved.has(entry.key) || sharedFor(entry, shared) !== undefined
}
