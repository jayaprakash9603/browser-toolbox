import type { YoutubeEnhancerState } from '@/core/sites/youtube'

import { applyYoutubeEnhancer, stopAll } from './manager'
import { onYoutubeNavigate } from './features'

type Guarded = Window & { __toolboxYtEnhancer?: boolean }

function readState(raw: unknown): YoutubeEnhancerState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as YoutubeEnhancerState
  if (!o.values) return null
  return o
}

function apply(raw: unknown): void {
  const state = readState(raw)
  if (!state?.enabled) {
    stopAll()
    return
  }
  applyYoutubeEnhancer(state)
}

const guarded = window as Guarded
if (!guarded.__toolboxYtEnhancer) {
  guarded.__toolboxYtEnhancer = true
  chrome.storage.local.get('youtubeEnhancer', (result) => apply(result.youtubeEnhancer))
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.youtubeEnhancer) apply(changes.youtubeEnhancer.newValue)
  })
  document.addEventListener('yt-navigate-finish', () => {
    chrome.storage.local.get('youtubeEnhancer', (result) => {
      const state = readState(result.youtubeEnhancer)
      if (state?.enabled) onYoutubeNavigate({ state, onNavigate: () => {} })
    })
  })
}
