import { useCallback, useEffect, useState } from 'react'

import {
  IMAGE_SAVE_FORMATS,
  getSaveImageAsState,
  normalizeSaveImageAsState,
  updateSaveImageAsState,
  type ImageSaveFormat,
  type SaveImageAsState,
} from '@/core/imageConvert'

export function useSaveImageAsSettings() {
  const [state, setState] = useState<SaveImageAsState | null>(null)

  const refresh = useCallback(async () => {
    setState(await getSaveImageAsState())
  }, [])

  useEffect(() => {
    void getSaveImageAsState().then(setState)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.saveImageAs) {
        setState(normalizeSaveImageAsState(changes.saveImageAs.newValue as Partial<SaveImageAsState>))
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  /** Applies the change immediately so sliders stay responsive, then persists it. */
  const patch = useCallback(async (next: Partial<SaveImageAsState>) => {
    setState((prev) => (prev ? normalizeSaveImageAsState({ ...prev, ...next }) : prev))
    setState(await updateSaveImageAsState(next))
  }, [])

  const toggleFormat = useCallback(
    async (format: ImageSaveFormat, on: boolean) => {
      const current = state
      if (!current) return
      const set = new Set(current.formats)
      if (on) set.add(format)
      else if (set.size > 1) set.delete(format)
      // Keep menu order stable: canonical order for newly enabled formats, user order otherwise.
      const ordered = [
        ...current.formats.filter((f) => set.has(f)),
        ...IMAGE_SAVE_FORMATS.filter((f) => set.has(f) && !current.formats.includes(f)),
      ]
      await patch({ formats: ordered, quickFormat: current.quickFormat && set.has(current.quickFormat) ? current.quickFormat : null })
    },
    [patch, state],
  )

  return { state, patch, refresh, toggleFormat }
}
