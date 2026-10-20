import {
  CSS_FEATURE_IDS,
  featureAttrName,
  getProgressTheme,
  isAllowedScrubberImageUrl,
  isProgressCustomizationActive,
  themeCssVars,
  type YoutubeEnhancerState,
} from '@/core/sites/youtube'

import { onYoutubeNavigate, startScriptFeatures, stopScriptFeatures } from './features'

const STYLE_LINK_ID = 'toolbox-yt-css'
const ACTIVE_ATTR = 'data-tbx-yt-active'
const PROGRESS_THEME_ATTR = 'data-tbx-yt-progress-theme'
const PROGRESS_ANIM_ATTR = 'data-tbx-yt-progress-animated'
const PROGRESS_EFFECT_ATTR = 'data-tbx-yt-progress-effect'

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

function clearProgressDom(root: HTMLElement): void {
  root.removeAttribute(featureAttrName('progressOn'))
  root.removeAttribute(PROGRESS_THEME_ATTR)
  root.removeAttribute(PROGRESS_ANIM_ATTR)
  root.removeAttribute(PROGRESS_EFFECT_ATTR)
  root.removeAttribute(featureAttrName('scrubberEmoji'))
  root.removeAttribute(featureAttrName('scrubberImage'))
  for (const key of [
    '--tbx-yt-progress-bar',
    '--tbx-yt-progress-played',
    '--tbx-yt-progress-height',
    '--tbx-yt-scrubber-emoji',
    '--tbx-yt-scrubber-image',
    '--tbx-yt-scrubber-size',
  ]) {
    root.style.removeProperty(key)
  }
}

function applyProgressStyle(state: YoutubeEnhancerState): void {
  const root = document.documentElement
  if (!isProgressCustomizationActive(state.values)) {
    clearProgressDom(root)
    return
  }

  const themeId = String(state.values.progressTheme ?? 'default')
  const barColor = String(state.values.progressBarColor ?? '#ff0000')
  const playedColor = String(state.values.progressPlayedColor ?? '#cc0000')
  const height = Number(state.values.progressHeight ?? 3)
  const theme = getProgressTheme(themeId)

  const vars = themeCssVars(themeId, barColor, playedColor, height)
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.setAttribute(featureAttrName('progressOn'), 'true')
  root.setAttribute(PROGRESS_THEME_ATTR, themeId)

  if (theme?.animated) {
    root.setAttribute(PROGRESS_ANIM_ATTR, 'true')
    if (theme.effect) root.setAttribute(PROGRESS_EFFECT_ATTR, theme.effect)
    else root.removeAttribute(PROGRESS_EFFECT_ATTR)
  } else {
    root.removeAttribute(PROGRESS_ANIM_ATTR)
    root.removeAttribute(PROGRESS_EFFECT_ATTR)
  }

  const emoji = String(state.values.progressScrubberEmoji ?? '').trim()
  const imageRaw = String(state.values.progressScrubberImage ?? '').trim()
  if (emoji) {
    root.setAttribute(featureAttrName('scrubberEmoji'), 'true')
    root.style.setProperty('--tbx-yt-scrubber-emoji', `"${emoji.replace(/"/g, '')}"`)
    root.style.setProperty('--tbx-yt-scrubber-size', '22px')
    root.removeAttribute(featureAttrName('scrubberImage'))
    root.style.removeProperty('--tbx-yt-scrubber-image')
  } else if (imageRaw && isAllowedScrubberImageUrl(imageRaw)) {
    root.setAttribute(featureAttrName('scrubberImage'), 'true')
    const safe = imageRaw.replace(/"/g, '\\"')
    root.style.setProperty('--tbx-yt-scrubber-image', `url("${safe}")`)
    root.style.setProperty('--tbx-yt-scrubber-size', '28px')
    root.removeAttribute(featureAttrName('scrubberEmoji'))
    root.style.removeProperty('--tbx-yt-scrubber-emoji')
  } else {
    root.removeAttribute(featureAttrName('scrubberEmoji'))
    root.removeAttribute(featureAttrName('scrubberImage'))
    root.style.removeProperty('--tbx-yt-scrubber-emoji')
    root.style.removeProperty('--tbx-yt-scrubber-image')
    root.style.setProperty('--tbx-yt-scrubber-size', '14px')
  }
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
  clearProgressDom(root)
  root.removeAttribute(featureAttrName('searchThumbSize'))
  root.removeAttribute(featureAttrName('gridMinPerRow'))
  root.removeAttribute(featureAttrName('shortsMinPerRow'))
  document.getElementById(STYLE_LINK_ID)?.remove()
  document
    .querySelectorAll<HTMLElement>(
      'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer',
    )
    .forEach((el) => el.style.removeProperty('display'))
}
