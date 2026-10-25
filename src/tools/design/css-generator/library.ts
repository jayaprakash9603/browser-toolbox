import { useCallback, useEffect, useState } from 'react'

import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'
import { GENERATOR_BY_ID } from './catalog'
import { GENERATOR_IDS, toCss, toSelector, uid, type CssResult, type GeneratorId } from './generators'

export interface SavedStyle {
  id: string
  name: string
  generator: GeneratorId
  state: unknown
  /** Class name without the leading dot. */
  className: string
  savedAt: number
}

export const MAX_SAVED = 100

/** Rebuilds a saved item; defaults fill in fields added after it was saved. */
export function buildSaved(item: Pick<SavedStyle, 'generator' | 'state'>): CssResult {
  const def = GENERATOR_BY_ID[item.generator]
  return def.build({ ...(def.defaults as object), ...(item.state as object) })
}

export function savedCss(item: SavedStyle): string {
  return toCss(buildSaved(item), toSelector(item.className))
}

const SHARED = /^@(keyframes|property)\s/

/** One stylesheet for every saved item, with keyframes and `@property` rules written once at the end. */
export function buildStylesheet(items: SavedStyle[]): string {
  const blocks: string[] = []
  const shared = new Set<string>()
  for (const item of items) {
    const result = buildSaved(item)
    const selector = toSelector(item.className)
    const own = [toCss({ decls: result.decls, rules: result.rules }, selector)]
    for (const chunk of result.extra?.split('\n\n') ?? []) {
      if (SHARED.test(chunk)) shared.add(chunk)
      else own.push(chunk.replaceAll('&', selector))
    }
    blocks.push(`/* ${item.name.replace(/\*\//g, '')} */\n${own.filter(Boolean).join('\n\n')}`)
  }
  return [...blocks, ...shared].join('\n\n')
}

/** Lower-case, dash-separated class name derived from a label. */
export function slugClass(label: string): string {
  return toSelector(label.toLowerCase()).slice(1)
}

function sanitize(value: unknown): SavedStyle[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is SavedStyle =>
      !!item && typeof item === 'object' && typeof item.id === 'string' && typeof item.name === 'string' && GENERATOR_IDS.includes(item.generator),
  )
}

export function useStyleLibrary() {
  const [items, setItems] = useState<SavedStyle[]>([])

  useEffect(() => {
    let active = true
    get<unknown>(STORAGE_KEYS.cssGeneratorLibrary)
      .then((stored) => {
        if (!active) return
        const loaded = sanitize(stored)
        setItems((current) => [...current, ...loaded.filter((item) => !current.some((c) => c.id === item.id))])
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const update = useCallback((change: (current: SavedStyle[]) => SavedStyle[]) => {
    setItems((current) => {
      const next = change(current)
      void set(STORAGE_KEYS.cssGeneratorLibrary, next).catch(() => {})
      return next
    })
  }, [])

  const add = useCallback(
    (entry: Omit<SavedStyle, 'id' | 'savedAt'>) => update((current) => [{ ...entry, id: uid(), savedAt: Date.now() }, ...current].slice(0, MAX_SAVED)),
    [update],
  )
  const edit = useCallback(
    (id: string, patch: Partial<Pick<SavedStyle, 'name' | 'className'>>) => update((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item))),
    [update],
  )
  const remove = useCallback((id: string) => update((current) => current.filter((item) => item.id !== id)), [update])

  return { items, add, edit, remove }
}
