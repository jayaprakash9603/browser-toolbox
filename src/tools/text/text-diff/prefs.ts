import { useCallback, useEffect, useState } from 'react'

import { DEFAULT_RULES, type DiffRules, type InlineGranularity, type ViewFilter } from '@/core/engines/diff'

export type DiffLayout = 'split' | 'inline'

export interface DiffPrefs {
  layout: DiffLayout | null
  filter: ViewFilter
  contextLines: number
  wrap: boolean
  details: boolean
  showWhitespace: boolean
  ignoreMinor: boolean
  granularity: InlineGranularity
  rules: DiffRules
}

export const DEFAULT_PREFS: DiffPrefs = {
  layout: null,
  filter: 'all',
  contextLines: 3,
  wrap: true,
  details: true,
  showWhitespace: false,
  ignoreMinor: false,
  granularity: 'words',
  rules: DEFAULT_RULES,
}

const PREFS_KEY = 'toolbox.diff.prefs'
const SESSION_KEY = 'toolbox.diff.session'

function loadPrefs(): DiffPrefs {
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as Partial<DiffPrefs> | null
    if (!stored || typeof stored !== 'object') return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...stored, rules: { ...DEFAULT_RULES, ...stored.rules } }
  } catch {
    return DEFAULT_PREFS
  }
}

export function useDiffPrefs() {
  const [prefs, setPrefs] = useState(loadPrefs)
  const update = useCallback((patch: Partial<DiffPrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch }
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      } catch {
        /* storage full or unavailable */
      }
      return next
    })
  }, [])
  return [prefs, update] as const
}

export interface DiffSession {
  left: string
  right: string
  leftName: string
  rightName: string
}

const EMPTY_SESSION: DiffSession = { left: '', right: '', leftName: '', rightName: '' }

export function loadSession(): DiffSession {
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as Partial<DiffSession> | null
    return { ...EMPTY_SESSION, ...stored }
  } catch {
    return EMPTY_SESSION
  }
}

export function useSessionDraft(session: DiffSession) {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
      } catch {
        /* too large for session storage; the draft just won't survive navigation */
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [session])
}
