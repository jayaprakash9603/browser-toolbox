import {
  CSS_FEATURE_IDS,
  featureAttrName,
  themeCssVars,
  type YoutubeEnhancerState,
} from '@/core/sites/youtube'

import { onYoutubeNavigate, startScriptFeatures, stopScriptFeatures } from './features'

const STYLE_LINK_ID = 'toolbox-yt-css'
const ACTIVE_ATTR = 'data-tbx-yt-active'

function applyCssFeatures(state: YoutubeEnhancerState): void {
  const root = document.documentElement
  root.setAttribute(ACTIVE_ATTR, 'true')
  for (const id of CSS_FEATURE_IDS) {
    if (id === 'gridMinPerRow' || id === 'shortsMinPerRow' || id === 'searchThumbSize') continue
    const v = state.values[id]
    const on = v === true
    if (on) root.setAttribute(featureAttrName(id), 'true')
    else root.removeAttribute(featureAttrName(id))
  }
  const grid = Number(state.values.gridMinPerRow ?? 0)
  if (grid > 0) root.setAttribute(featureAttrName('gridMinPerRow'), String(grid))
  else root.removeAttribute(featureAttrName('gridMinPerRow'))
  const shortsRow = Number(state.values.shortsMinPerRow ?? 0)
  if (shortsRow > 0) root.setAttribute(featureAttrName('shortsMinPerRow'), String(shortsRow))
  else root.removeAttribute(featureAttrName('shortsMinPerRow'))
  const thumb = String(state.values.searchThumbSize ?? 'default')
  if (thumb !== 'default') root.setAttribute(featureAttrName('searchThumbSize'), thumb)
  else root.removeAttribute(featureAttrName('searchThumbSize'))
}

function applyProgressStyle(state: YoutubeEnhancerState): void {
  const root = document.documentElement
  const theme = String(state.values.progressTheme ?? 'default')
  const barColor = String(state.values.progressBarColor ?? '#ff0000')
  const playedColor = String(state.values.progressPlayedColor ?? '#cc0000')
  const height = Number(state.values.progressHeight ?? 3)
  const progressOn =
    theme !== 'default' || barColor !== '#ff0000' || playedColor !== '#cc0000' || height !== 3
  if (!progressOn) {
    root.removeAttribute(featureAttrName('progressOn'))
    root.style.removeProperty('--tbx-yt-progress-bar')
    root.style.removeProperty('--tbx-yt-progress-played')
    root.style.removeProperty('--tbx-yt-progress-height')
    return
  }
  const vars = themeCssVars(theme, barColor, playedColor, height)
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.setAttribute(featureAttrName('progressOn'), 'true')
}

function ensureCssLink(): void {
  if (document.getElementById(STYLE_LINK_ID)) return
  const link = document.createElement('link')
  link.id = STYLE_LINK_ID
  link.rel = 'stylesheet'
  link.href = chrome.runtime.getURL('sites/youtube/youtube.css')
  document.head.appendChild(link)
}

export function applyYoutubeEnhancer(state: YoutubeEnhancerState): void {
  if (!state.enabled) {
    stopAll()
    return
  }
  ensureCssLink()
  applyCssFeatures(state)
  applyProgressStyle(state)
  const ctx = { state, onNavigate: () => onYoutubeNavigate({ state, onNavigate: () => {} }) }
  startScriptFeatures(ctx)
}

export function stopAll(): void {
  stopScriptFeatures()
  const root = document.documentElement
  root.removeAttribute(ACTIVE_ATTR)
  for (const id of CSS_FEATURE_IDS) root.removeAttribute(featureAttrName(id))
  root.removeAttribute(featureAttrName('progressOn'))
  root.removeAttribute(featureAttrName('searchThumbSize'))
  root.removeAttribute(featureAttrName('gridMinPerRow'))
  root.removeAttribute(featureAttrName('shortsMinPerRow'))
  root.style.removeProperty('--tbx-yt-progress-bar')
  root.style.removeProperty('--tbx-yt-progress-played')
  root.style.removeProperty('--tbx-yt-progress-height')
  document.getElementById(STYLE_LINK_ID)?.remove()
  document
    .querySelectorAll<HTMLElement>(
      'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer',
    )
    .forEach((el) => el.style.removeProperty('display'))
}
