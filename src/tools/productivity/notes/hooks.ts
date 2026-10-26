import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

import {
  DEFAULT_PREFS,
  getNotes,
  getPrefs,
  purgeExpiredTrash,
  saveAllNotes,
  savePrefs,
  type Note,
  type NotesPrefs,
} from './notesService'

/** Notes held in memory, saved 300 ms after the last change and flushed when the panel closes. */
export function useNotesStore() {
  const [notes, setNotes] = useState<Note[]>([])
  const [prefs, setPrefs] = useState<NotesPrefs>(DEFAULT_PREFS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const dirty = useRef(false)
  const latest = useRef<Note[]>([])

  useEffect(() => {
    let live = true
    void Promise.all([getNotes(), getPrefs()])
      .then(([storedNotes, storedPrefs]) => {
        if (!live) return
        const kept = purgeExpiredTrash(storedNotes)
        if (kept.length !== storedNotes.length) dirty.current = true
        setNotes(kept)
        setPrefs(storedPrefs)
      })
      .finally(() => {
        if (live) setLoaded(true)
      })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    latest.current = notes
    if (!loaded || !dirty.current) return
    const handle = setTimeout(() => {
      dirty.current = false
      void saveAllNotes(notes).finally(() => setSaving(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [notes, loaded])

  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return
      dirty.current = false
      void saveAllNotes(latest.current)
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  useEffect(() => {
    if (loaded) void savePrefs(prefs)
  }, [prefs, loaded])

  const mutate = useCallback((fn: (prev: Note[]) => Note[]) => {
    dirty.current = true
    setSaving(true)
    setNotes(fn)
  }, [])

  const saveNow = useCallback(() => {
    dirty.current = false
    return saveAllNotes(latest.current).finally(() => setSaving(false))
  }, [])

  const updatePrefs = useCallback((patch: Partial<NotesPrefs>) => setPrefs((p) => ({ ...p, ...patch })), [])

  return { notes, prefs, loaded, saving, mutate, saveNow, setPrefs, updatePrefs }
}

export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/** Current time, refreshed every minute so relative dates and date sections stay correct. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
