import { useCallback, useEffect, useState } from 'react'

import {
  getSaveImageAsState,
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
        setState(changes.saveImageAs.newValue as SaveImageAsState)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const patch = useCallback(async (next: Partial<SaveImageAsState>) => {
    setState(await updateSaveImageAsState(next))
  }, [])

  const toggleFormat = useCallback(
    async (format: ImageSaveFormat, on: boolean) => {
      if (!state) return
      const set = new Set(state.formats)
      if (on) set.add(format)
      else set.delete(format)
      await patch({ formats: [...set] })
    },
    [patch, state],
  )

  return { state, patch, refresh, toggleFormat }
}
