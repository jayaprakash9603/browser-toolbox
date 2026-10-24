import type { InstagramEnhancerState } from '@/core/sites/instagram/types'
import { applyInstagramEnhancer, stopAll } from './manager'

type Guarded = Window & { __toolboxIgEnhancer?: boolean }

function readState(raw: unknown): InstagramEnhancerState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as InstagramEnhancerState
  if (!o.values) return null
  return o
}

function apply(raw: unknown): void {
  const state = readState(raw)
  if (!state?.enabled) {
    stopAll()
    return
  }
  applyInstagramEnhancer(state)
}

const guarded = window as Guarded
if (!guarded.__toolboxIgEnhancer) {
  guarded.__toolboxIgEnhancer = true
  if (window === window.top) {
    chrome.storage.local.get('instagramEnhancer', (result) => apply(result.instagramEnhancer))
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.instagramEnhancer) apply(changes.instagramEnhancer.newValue)
    })
  }
}
