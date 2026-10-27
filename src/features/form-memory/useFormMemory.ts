import { useCallback, useEffect, useState } from 'react'

import type { FormMemorySettings, FormMemoryState } from '@/core/form-memory/model'
import { loadFormMemory, updateFormMemory, watchFormMemory } from '@/core/form-memory/storage'

/** Form memory kept live across the panel, Settings and the background, which records new entries. */
export function useFormMemory() {
  const [state, setState] = useState<FormMemoryState | null>(null)

  useEffect(() => {
    let live = true
    void loadFormMemory().then((loaded) => {
      if (live) setState(loaded)
    })
    const off = watchFormMemory((next) => {
      if (live) setState(next)
    })
    return () => {
      live = false
      off()
    }
  }, [])

  const update = useCallback((mutate: (current: FormMemoryState) => FormMemoryState) => {
    setState((previous) => (previous ? mutate(previous) : previous))
    return updateFormMemory(mutate)
  }, [])

  const patchSettings = useCallback(
    (patch: Partial<FormMemorySettings>) =>
      update((current) => ({ ...current, settings: { ...current.settings, ...patch } })),
    [update],
  )

  return { state, update, patchSettings }
}
