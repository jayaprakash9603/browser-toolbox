import { useCallback, useEffect, useSyncExternalStore } from 'react'

const motionPhases = new Map<string, HomeWorkbenchMotion>()
const subscribers = new Set<() => void>()

export type HomeWorkbenchMotion = 'off' | 'active' | 'settled'

function subscribe(listener: () => void) {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}

function setMotionPhase(key: string, phase: HomeWorkbenchMotion) {
  if (motionPhases.get(key) === phase) return
  motionPhases.set(key, phase)
  subscribers.forEach((listener) => listener())
}

/**
 * Starts a workbench's showcase motion the first time it reaches the viewport.
 * The settled state survives route changes for the lifetime of the panel document.
 */
export function useHomeWorkbenchMotion(
  key: string,
  inViewport: boolean,
  reduceMotion: boolean,
): HomeWorkbenchMotion {
  const getSnapshot = useCallback(() => motionPhases.get(key) ?? 'off', [key])
  const phase = useSyncExternalStore<HomeWorkbenchMotion>(subscribe, getSnapshot, () => 'off')

  useEffect(() => {
    if (!inViewport) return
    if (phase === 'off') setMotionPhase(key, reduceMotion ? 'settled' : 'active')
  }, [inViewport, key, phase, reduceMotion])

  useEffect(
    () => () => {
      if (motionPhases.get(key) === 'active') setMotionPhase(key, 'settled')
    },
    [key],
  )

  if (reduceMotion) return 'off'
  if (phase !== 'off') return phase
  return inViewport ? 'active' : 'off'
}
