import type { YoutubeEnhancerState } from '@/core/sites/youtube'

import { applyYoutubeEnhancer, stopAll } from './manager'
import { onYoutubeNavigate } from './features'

type Guarded = Window & { __toolboxYtEnhancer?: boolean }

let cachedState: YoutubeEnhancerState | null = null
let navigateTimer: ReturnType<typeof setTimeout> | null = null

function readState(raw: unknown): YoutubeEnhancerState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as YoutubeEnhancerState
  if (!o.values) return null
  return o
}

function apply(raw: unknown): void {
  const state = readState(raw)
  cachedState = state
  if (!state?.enabled) {
    stopAll()
    return
  }
  applyYoutubeEnhancer(state)
}

function scheduleNavigateRefresh(): void {
  if (!cachedState?.enabled) return
  if (navigateTimer) clearTimeout(navigateTimer)
  navigateTimer = setTimeout(() => {
    navigateTimer = null
    if (cachedState?.enabled) onYoutubeNavigate({ state: cachedState, onNavigate: () => {} })
  }, 80)
}

const guarded = window as Guarded
if (!guarded.__toolboxYtEnhancer) {
  guarded.__toolboxYtEnhancer = true
  if (window === window.top) {
    chrome.storage.local.get('youtubeEnhancer', (result) => apply(result.youtubeEnhancer))
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.youtubeEnhancer) apply(changes.youtubeEnhancer.newValue)
    })
    document.addEventListener('yt-navigate-finish', scheduleNavigateRefresh)
  }
}
