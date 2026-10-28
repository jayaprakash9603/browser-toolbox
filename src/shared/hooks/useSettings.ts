import { useSyncExternalStore } from 'react'

import { getSettings, SETTINGS_LOCAL_UPDATE_EVENT, type Settings } from '@/features/settings/settingsService'

let cached: Settings | null = null
let initialized = false
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Settings | null {
  return cached
}

function initStore(): void {
  if (initialized) return
  initialized = true
  void getSettings().then((settings) => {
    cached = settings
    notify()
  })
  const storage = chrome.storage
  if (!storage?.onChanged) return
  storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      void getSettings().then((settings) => {
        cached = settings
        notify()
      })
    }
  })
  if (typeof window !== 'undefined') {
    window.addEventListener(SETTINGS_LOCAL_UPDATE_EVENT, (event) => {
      cached = (event as CustomEvent<Settings>).detail
      notify()
    })
  }
}

export function useSettings(): Settings | null {
  initStore()
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}
