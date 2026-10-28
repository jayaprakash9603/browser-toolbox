import type { MemoryField, MemoryValue } from '@/core/form-memory/model'

import { memo } from './cache'
import { firstNode } from './entry'
import { fieldLabel } from './labels'
import { labelKey } from './text'
import type { Entry } from './types'
import { currentValue } from './values'

/** How sure a shared value is to belong to a field; anything below `NAME` is no match. */
const SCORE = { NAME: 1, LABEL: 2, LABEL_AND_NAME: 3, AUTOCOMPLETE: 4 }

interface Identity {
  kind: Entry['kind']
  label: string
  /** `name` when it identifies this one field, not a name several fields share. */
  name: string
  auto: string
}

function identityOf(entry: Entry, labels: Map<Entry, string>): Identity {
  const el = firstNode(entry)
  const auto = (el.getAttribute('autocomplete') ?? '').toLowerCase()
  const name = (el.getAttribute('name') ?? '').toLowerCase()
  if (!labels.has(entry)) labels.set(entry, labelKey(fieldLabel(entry)))
  return {
    kind: entry.kind,
    label: labels.get(entry) ?? '',
    name: name && !memo.repeatedNames.has(el.getAttribute('name') ?? '') ? name : '',
    auto: /^(on|off)?$/.test(auto) ? '' : auto,
  }
}

function score(identity: Identity, field: MemoryField): number {
  if (field.kind !== identity.kind) return 0
  if (identity.auto && field.auto?.toLowerCase() === identity.auto) return SCORE.AUTOCOMPLETE
  const sameName = Boolean(identity.name && field.name?.toLowerCase() === identity.name)
  if (identity.label && labelKey(field.label) === identity.label) return sameName ? SCORE.LABEL_AND_NAME : SCORE.LABEL
  return sameName ? SCORE.NAME : 0
}

/** The position a saved key had among same-named fields: `text:Name#3` was the third. */
const occurrence = (key: string) => Number(/#(\d+)$/.exec(key)?.[1] ?? 1)

/**
 * Pairs this page's saved fields with its controls: by key first, then by label for keys that no
 * longer exist, because frameworks (JSF, ExtJS) regenerate names and ids on every visit.
 */
export function matchPage(entries: Entry[], fields: MemoryField[]): Map<string, Entry> {
  const byKey = new Map(entries.map((entry) => [entry.key, entry]))
  const matched = new Map<string, Entry>()
  const claimed = new Set<Entry>()
  const rest: MemoryField[] = []
  for (const field of fields) {
    const entry = byKey.get(field.key)
    if (entry && entry.kind === field.kind) {
      matched.set(field.key, entry)
      claimed.add(entry)
    } else rest.push(field)
  }
  if (rest.length === 0) return matched
  const labels = new Map<Entry, string>()
  const identities = new Map(entries.map((entry) => [entry, identityOf(entry, labels)]))
  for (const field of rest.sort((a, b) => occurrence(a.key) - occurrence(b.key))) {
    const label = labelKey(field.label)
    if (!label) continue
    const alike = entries.filter((entry) => {
      const identity = identities.get(entry)
      return identity?.kind === field.kind && identity.label === label
    })
    const byName = alike.find((entry) => !claimed.has(entry) && score(identities.get(entry)!, field) === SCORE.LABEL_AND_NAME)
    const byPosition = alike[occurrence(field.key) - 1]
    const entry = byName ?? (byPosition && !claimed.has(byPosition) ? byPosition : alike.find((item) => !claimed.has(item)))
    if (!entry) continue
    matched.set(field.key, entry)
    claimed.add(entry)
  }
  return matched
}

/** The global or other-page value that fits this field best: by autocomplete hint, label, then a distinctive name. */
export function sharedFor(entry: Entry, shared: MemoryField[], labels = new Map<Entry, string>()): MemoryField | undefined {
  const identity = identityOf(entry, labels)
  let best: MemoryField | undefined
  let bestScore = 0
  for (const field of shared) {
    const value = score(identity, field)
    if (value > bestScore) {
      best = field
      bestScore = value
    }
  }
  return best
}

function sameValue(a: MemoryValue, b: MemoryValue): boolean {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b)
  return typeof a === 'string' && typeof b === 'string' ? a.trim() === b.trim() : a === b
}

/**
 * What Clear may undo: this page's saved fields, and fields still holding the shared value that fits
 * them, so text the user typed into a field a global value merely fits is left alone.
 */
export function rememberedBy(entries: Entry[], fields: MemoryField[], shared: MemoryField[]): (entry: Entry) => boolean {
  const saved = new Set(matchPage(entries, fields).values())
  const labels = new Map<Entry, string>()
  return (entry) => {
    if (saved.has(entry)) return true
    const field = sharedFor(entry, shared, labels)
    return field !== undefined && sameValue(currentValue(entry).value, field.value)
  }
}
