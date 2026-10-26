import { useCallback, useEffect, useRef, useState } from 'react'

import { DEFAULT_COLOR_PICKER_STATE, type ColorFormat, type ColorPickerState } from '@/core/color-picker/model'
import {
  loadColorPickerState,
  recordPickedColor,
  updateColorPickerState,
  watchColorPicker,
} from '@/core/color-picker/storage'

/**
 * Picker state shared with the background: colors picked on a page (even with the panel closed)
 * show up here live, and the newest one becomes the selection.
 */
export function useColorPickerStore(onExternalPick: (hex: string) => void) {
  const [state, setState] = useState<ColorPickerState>(DEFAULT_COLOR_PICKER_STATE)
  const [ready, setReady] = useState(false)
  const head = useRef<number | null>(null)
  const notify = useRef(onExternalPick)
  notify.current = onExternalPick

  useEffect(() => {
    let live = true
    void loadColorPickerState().then((loaded) => {
      if (!live) return
      head.current = loaded.history[0]?.at ?? 0
      setState(loaded)
      setReady(true)
      if (loaded.history[0]) notify.current(loaded.history[0].hex)
    })
    const off = watchColorPicker((next) => {
      if (!live) return
      setState(next)
      const newest = next.history[0]
      if (newest && newest.at > (head.current ?? 0)) notify.current(newest.hex)
      head.current = Math.max(head.current ?? 0, newest?.at ?? 0)
    })
    return () => {
      live = false
      off()
    }
  }, [])

  const setFormat = useCallback((format: ColorFormat) => {
    setState((previous) => ({ ...previous, format }))
    void updateColorPickerState((current) => ({ ...current, format }))
  }, [])

  const remember = useCallback((hex: string) => {
    void recordPickedColor(hex)
  }, [])

  const removeColor = useCallback((hex: string) => {
    setState((previous) => ({ ...previous, history: previous.history.filter((item) => item.hex !== hex) }))
    void updateColorPickerState((current) => ({
      ...current,
      history: current.history.filter((item) => item.hex !== hex),
    }))
  }, [])

  const clearHistory = useCallback(() => {
    setState((previous) => ({ ...previous, history: [] }))
    void updateColorPickerState((current) => ({ ...current, history: [] }))
  }, [])

  return { state, ready, setFormat, remember, removeColor, clearHistory }
}
