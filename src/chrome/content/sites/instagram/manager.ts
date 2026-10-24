import { isFeatureOn, playbackRate } from '@/core/sites/instagram/helpers'
import type { InstagramEnhancerState } from '@/core/sites/instagram/types'
import { PAGE_CMD_KEY, PAGE_EVT_KEY, SITE_FILES } from '@/core/sites/instagram/constants'
import { pickVideoUrl } from '@/core/sites/instagram/mediaUrl'

const STYLE_LINK_ID = 'toolbox-ig-css'
const HOST_ID = 'tbx-ig-overlay'
const MIN_VIDEO_PX = 140

const DOWNLOAD_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>'
const PIP_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="15" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" stroke="none"/></svg>'

export type ActiveFeatures = { download: boolean; pip: boolean; seek: boolean; rate: number }

export function activeFeatures(state: InstagramEnhancerState | null): ActiveFeatures {
  if (!state?.enabled) return { download: false, pip: false, seek: false, rate: 1 }
  return {
    download: isFeatureOn(state.values, 'mediaDownload'),
    pip: isFeatureOn(state.values, 'pictureInPicture'),
    seek: isFeatureOn(state.values, 'videoControls'),
    rate: playbackRate(state.values),
  }
}

function changesRate(features: ActiveFeatures): boolean {
  return Math.abs(features.rate - 1) > 0.01
}

export function touchesPage(features: ActiveFeatures): boolean {
  return features.download || features.pip || features.seek || changesRate(features)
}

function showsOverlay(features: ActiveFeatures): boolean {
  return features.download || features.pip || features.seek
}

export function formatVideoTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

let features: ActiveFeatures = activeFeatures(null)
let active = false
let observer: MutationObserver | null = null
let interval = 0
let frame = 0
let mutationTimer = 0
let nextId = 1
let requestToken = 0
const bound = new WeakSet<HTMLVideoElement>()

function videoId(video: HTMLVideoElement): string {
  if (!video.dataset.tbxIgId) {
    nextId += 1
    video.dataset.tbxIgId = String(nextId)
  }
  return video.dataset.tbxIgId
}

function findVideo(id: string): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>(`video[data-tbx-ig-id="${id}"]`)
}

function publishFlags(): void {
  const root = document.documentElement
  if (changesRate(features)) root.dataset.tbxIgRate = String(features.rate)
  else delete root.dataset.tbxIgRate
  if (features.pip) root.dataset.tbxIgPip = '1'
  else delete root.dataset.tbxIgPip
}

function clearFlags(): void {
  const root = document.documentElement
  delete root.dataset.tbxIgRate
  delete root.dataset.tbxIgPip
}

function applyPlayer(video: HTMLVideoElement): void {
  if (changesRate(features)) {
    if (Math.abs(video.playbackRate - features.rate) > 0.01) video.playbackRate = features.rate
    if (Math.abs(video.defaultPlaybackRate - features.rate) > 0.01) video.defaultPlaybackRate = features.rate
    video.dataset.tbxIgRateSet = '1'
  } else if (video.dataset.tbxIgRateSet) {
    video.playbackRate = 1
    video.defaultPlaybackRate = 1
    delete video.dataset.tbxIgRateSet
  }
  if (features.pip && video.disablePictureInPicture) {
    video.disablePictureInPicture = false
    video.dataset.tbxIgPipUnlocked = '1'
  }
}

function restoreVideo(video: HTMLVideoElement): void {
  if (video.dataset.tbxIgRateSet) {
    video.playbackRate = 1
    video.defaultPlaybackRate = 1
  }
  if (video.dataset.tbxIgPipUnlocked) video.disablePictureInPicture = true
  delete video.dataset.tbxIgRateSet
  delete video.dataset.tbxIgPipUnlocked
  delete video.dataset.tbxIgId
  delete video.dataset.tbxIgPick
}

function bind(video: HTMLVideoElement): void {
  if (bound.has(video)) return
  bound.add(video)
  const nudge = () => {
    if (active) applyPlayer(video)
  }
  video.addEventListener('ratechange', nudge)
  video.addEventListener('play', nudge)
  video.addEventListener('loadedmetadata', nudge)
  const progress = () => {
    if (active && features.seek) updateSeek(video)
  }
  video.addEventListener('timeupdate', progress)
  video.addEventListener('durationchange', progress)
}

/** Shows controls only for a video that is on screen and not covered by a dialog or menu. */
function isShowing(video: HTMLVideoElement): DOMRect | null {
  const rect = video.getBoundingClientRect()
  if (rect.width < MIN_VIDEO_PX || rect.height < MIN_VIDEO_PX) return null
  const visibleH = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
  const visibleW = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
  if (visibleH < rect.height * 0.5 || visibleW < rect.width * 0.5) return null
  const x = Math.min(Math.max(rect.left + rect.width / 2, 0), window.innerWidth - 1)
  const y = Math.min(Math.max(rect.top + rect.height / 2, 0), window.innerHeight - 1)
  const hit = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(x, y) : null
  if (!hit) return null
  let node: Element | null = video
  for (let depth = 0; depth < 6 && node; depth += 1) {
    if (node === hit || node.contains(hit)) return rect
    node = node.parentElement
  }
  return null
}

function togglePip(video: HTMLVideoElement): void {
  const now = Date.now()
  if (now - Number(video.dataset.tbxIgPipAt ?? 0) < 400) return
  video.dataset.tbxIgPipAt = String(now)
  video.disablePictureInPicture = false
  try {
    if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => {})
    else void video.requestPictureInPicture().catch(() => {})
  } catch {
    /* video has no frames yet */
  }
}

function directUrls(video: HTMLVideoElement): string[] {
  const urls = [video.currentSrc, video.src]
  video.querySelectorAll('source').forEach((source) => urls.push(source.src))
  return urls
}

function performanceUrls(): string[] {
  return performance
    .getEntriesByType('resource')
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 8)
    .map((entry) => entry.name)
}

function asUrls(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((url): url is string => typeof url === 'string') : []
}

function askMain(video: HTMLVideoElement): Promise<{ preferred: string[]; extra: string[] }> {
  const token = String((requestToken += 1))
  video.dataset.tbxIgPick = token
  return new Promise((resolve) => {
    let timerId = 0
    const finish = (preferred: string[], extra: string[]) => {
      window.clearTimeout(timerId)
      window.removeEventListener('message', onMessage)
      if (video.dataset.tbxIgPick === token) delete video.dataset.tbxIgPick
      resolve({ preferred, extra })
    }
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return
      const data = event.data as { [PAGE_EVT_KEY]?: string; token?: string; preferred?: unknown; extra?: unknown } | null
      if (!data || data[PAGE_EVT_KEY] !== 'resolved' || data.token !== token) return
      finish(asUrls(data.preferred), asUrls(data.extra))
    }
    timerId = window.setTimeout(() => finish([], []), 800)
    window.addEventListener('message', onMessage)
    window.postMessage({ [PAGE_CMD_KEY]: 'resolve', token }, '*')
  })
}

function showStatus(frameEl: HTMLElement, text: string | null): void {
  const chip = frameEl.querySelector<HTMLElement>('[data-tbx-ig-status]')
  if (!chip) return
  window.clearTimeout(Number(chip.dataset.timer ?? 0))
  chip.textContent = text ?? ''
  chip.style.display = text ? 'inline-flex' : 'none'
}

function flashStatus(frameEl: HTMLElement, text: string): void {
  showStatus(frameEl, text)
  const chip = frameEl.querySelector<HTMLElement>('[data-tbx-ig-status]')
  if (chip) chip.dataset.timer = String(window.setTimeout(() => showStatus(frameEl, null), 2400))
}

async function downloadVideo(video: HTMLVideoElement, button: HTMLButtonElement, frameEl: HTMLElement): Promise<void> {
  if (button.getAttribute('aria-busy') === 'true') return
  button.setAttribute('aria-busy', 'true')
  showStatus(frameEl, 'Finding video…')
  try {
    const fromPage = await askMain(video)
    const url = pickVideoUrl([...directUrls(video), ...fromPage.preferred], [...fromPage.extra, ...performanceUrls()])
    if (!url) {
      flashStatus(frameEl, 'Video file not found')
      return
    }
    await chrome.downloads.download({ url, filename: `instagram-${Date.now()}.mp4`, saveAs: false })
    flashStatus(frameEl, 'Downloading')
  } catch {
    flashStatus(frameEl, 'Download failed')
  } finally {
    button.removeAttribute('aria-busy')
  }
}

function makeButton(action: 'download' | 'pip', label: string, svg: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'tbx-ig-btn'
  button.dataset.tbxIgAction = action
  button.title = label
  button.setAttribute('aria-label', label)
  button.innerHTML = svg
  return button
}

function makeChip(kind: 'speed' | 'status'): HTMLElement {
  const chip = document.createElement('span')
  chip.className = 'tbx-ig-chip'
  chip.dataset[kind === 'speed' ? 'tbxIgSpeed' : 'tbxIgStatus'] = ''
  if (kind === 'status') chip.setAttribute('aria-live', 'polite')
  chip.style.display = 'none'
  return chip
}

function seekTo(video: HTMLVideoElement, track: HTMLElement, clientX: number): void {
  const rect = track.getBoundingClientRect()
  if (!Number.isFinite(video.duration) || video.duration <= 0 || rect.width <= 0) return
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  video.currentTime = ratio * video.duration
  updateSeek(video)
}

function makeSeek(id: string): HTMLElement {
  const seek = document.createElement('div')
  seek.className = 'tbx-ig-seek'
  seek.dataset.tbxIgSeek = ''
  seek.tabIndex = 0
  seek.setAttribute('role', 'slider')
  seek.setAttribute('aria-label', 'Seek video')
  seek.setAttribute('aria-valuemin', '0')
  const track = document.createElement('div')
  track.className = 'tbx-ig-track'
  const fill = document.createElement('div')
  fill.className = 'tbx-ig-fill'
  fill.dataset.tbxIgFill = ''
  fill.style.transform = 'scaleX(0)'
  track.append(fill)
  const time = document.createElement('span')
  time.className = 'tbx-ig-chip tbx-ig-time'
  time.dataset.tbxIgTime = ''
  seek.append(time, track)

  seek.addEventListener('pointerdown', (event) => {
    const video = findVideo(id)
    if (!video) return
    event.preventDefault()
    event.stopPropagation()
    seek.setPointerCapture?.(event.pointerId)
    seek.dataset.dragging = ''
    seekTo(video, track, event.clientX)
  })
  seek.addEventListener('pointermove', (event) => {
    const video = findVideo(id)
    if (video && seek.dataset.dragging !== undefined) seekTo(video, track, event.clientX)
  })
  const release = (event: PointerEvent) => {
    delete seek.dataset.dragging
    seek.releasePointerCapture?.(event.pointerId)
  }
  seek.addEventListener('pointerup', release)
  seek.addEventListener('pointercancel', release)
  seek.addEventListener('click', (event) => event.stopPropagation())
  seek.addEventListener('keydown', (event) => {
    const video = findVideo(id)
    if (!video || !Number.isFinite(video.duration)) return
    const step = event.key === 'ArrowRight' ? 5 : event.key === 'ArrowLeft' ? -5 : 0
    if (!step) return
    event.preventDefault()
    event.stopPropagation()
    video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + step))
    updateSeek(video)
  })
  return seek
}

function updateSeek(video: HTMLVideoElement): void {
  const id = video.dataset.tbxIgId
  const seek = id ? document.querySelector<HTMLElement>(`#${HOST_ID} [data-tbx-ig-for="${id}"] [data-tbx-ig-seek]`) : null
  if (!seek) return
  const duration = Number.isFinite(video.duration) ? video.duration : 0
  const ratio = duration > 0 ? Math.min(1, video.currentTime / duration) : 0
  const fill = seek.querySelector<HTMLElement>('[data-tbx-ig-fill]')
  if (fill) fill.style.transform = `scaleX(${ratio})`
  const time = seek.querySelector<HTMLElement>('[data-tbx-ig-time]')
  const text = `${formatVideoTime(video.currentTime)} / ${formatVideoTime(duration)}`
  if (time && time.textContent !== text) time.textContent = text
  seek.setAttribute('aria-valuemax', String(Math.round(duration)))
  seek.setAttribute('aria-valuenow', String(Math.round(video.currentTime)))
  seek.setAttribute('aria-valuetext', text)
}

function ensureCssLink(): void {
  if (document.getElementById(STYLE_LINK_ID)) return
  const link = document.createElement('link')
  link.id = STYLE_LINK_ID
  link.rel = 'stylesheet'
  link.href = chrome.runtime.getURL(SITE_FILES.instagramCss)
  ;(document.head ?? document.documentElement).appendChild(link)
}

function ensureHost(): HTMLElement {
  let host = document.getElementById(HOST_ID)
  if (host) return host
  ensureCssLink()
  host = document.createElement('div')
  host.id = HOST_ID
  // Hidden until the stylesheet loads so unstyled buttons never flash on the page.
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;visibility:hidden'
  ;(document.body ?? document.documentElement).appendChild(host)
  return host
}

function ensureFrame(host: HTMLElement, id: string): HTMLElement {
  const existing = host.querySelector<HTMLElement>(`[data-tbx-ig-for="${id}"]`)
  if (existing) return existing
  const frameEl = document.createElement('div')
  frameEl.className = 'tbx-ig-frame'
  frameEl.dataset.tbxIgFor = id
  const actions = document.createElement('div')
  actions.className = 'tbx-ig-actions'
  const download = makeButton('download', 'Download video', DOWNLOAD_SVG)
  const pip = makeButton('pip', 'Picture-in-Picture', PIP_SVG)
  download.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const video = findVideo(id)
    if (video) void downloadVideo(video, download, frameEl)
  })
  pip.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const video = findVideo(id)
    if (video) togglePip(video)
  })
  actions.append(makeChip('status'), makeChip('speed'), download, pip)
  frameEl.append(actions, makeSeek(id))
  host.append(frameEl)
  return frameEl
}

/** Instagram usually rounds a wrapper, not the video, so take the first rounded box around it. */
function cornerRadius(video: HTMLVideoElement): string {
  let node: HTMLElement | null = video
  for (let depth = 0; depth < 4 && node; depth += 1) {
    const radius = getComputedStyle(node).borderRadius
    if (radius && radius !== '0px') return radius
    node = node.parentElement
  }
  return '0px'
}

function layoutFrame(frameEl: HTMLElement, rect: DOMRect, video: HTMLVideoElement): void {
  const style = frameEl.style
  const next = {
    left: `${Math.round(rect.left)}px`,
    top: `${Math.round(rect.top)}px`,
    width: `${Math.round(rect.width)}px`,
    height: `${Math.round(rect.height)}px`,
  }
  if (style.left !== next.left) style.left = next.left
  if (style.top !== next.top) style.top = next.top
  if (style.width !== next.width) style.width = next.width
  if (style.height !== next.height) style.height = next.height
  const radius = cornerRadius(video)
  if (style.borderRadius !== radius) style.borderRadius = radius

  const toggle = (selector: string, on: boolean, display: string) => {
    const el = frameEl.querySelector<HTMLElement>(selector)
    if (el && el.style.display !== (on ? display : 'none')) el.style.display = on ? display : 'none'
  }
  toggle('[data-tbx-ig-action="download"]', features.download, 'grid')
  toggle('[data-tbx-ig-action="pip"]', features.pip, 'grid')
  toggle('[data-tbx-ig-seek]', features.seek, 'flex')
  const speed = frameEl.querySelector<HTMLElement>('[data-tbx-ig-speed]')
  if (speed) {
    const label = changesRate(features) ? `${features.rate}×` : ''
    if (speed.textContent !== label) speed.textContent = label
    speed.style.display = label ? 'inline-flex' : 'none'
  }
}

function sync(): void {
  frame = 0
  if (!active) return
  publishFlags()
  const overlay = showsOverlay(features)
  const host = overlay ? ensureHost() : null
  const seen = new Set<string>()
  document.querySelectorAll('video').forEach((video) => {
    bind(video)
    applyPlayer(video)
    if (!host) return
    const rect = isShowing(video)
    if (!rect) return
    const id = videoId(video)
    seen.add(id)
    layoutFrame(ensureFrame(host, id), rect, video)
    if (features.seek) updateSeek(video)
  })
  const existing = document.getElementById(HOST_ID)
  existing?.querySelectorAll<HTMLElement>('[data-tbx-ig-for]').forEach((el) => {
    if (!seen.has(el.dataset.tbxIgFor ?? '')) el.remove()
  })
  if (existing && (!overlay || existing.childElementCount === 0)) existing.remove()
}

function scheduleFrame(): void {
  if (!active || frame) return
  frame = window.requestAnimationFrame(sync)
}

function scheduleSoon(): void {
  if (!active || mutationTimer) return
  mutationTimer = window.setTimeout(() => {
    mutationTimer = 0
    scheduleFrame()
  }, 100)
}

function start(): void {
  if (active) return
  active = true
  window.addEventListener('scroll', scheduleFrame, { capture: true, passive: true })
  window.addEventListener('resize', scheduleFrame, { passive: true })
  interval = window.setInterval(scheduleFrame, 500)
  observer = new MutationObserver((mutations) => {
    const host = document.getElementById(HOST_ID)
    if (host && mutations.every((mutation) => host.contains(mutation.target))) return
    scheduleSoon()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}

export function applyInstagramEnhancer(state: InstagramEnhancerState): void {
  features = activeFeatures(state)
  if (!touchesPage(features)) {
    stopAll()
    return
  }
  start()
  sync()
}

/** Puts back only what this script changed. Instagram's own elements are never restyled. */
export function stopAll(): void {
  features = activeFeatures(null)
  const wasActive = active
  active = false
  observer?.disconnect()
  observer = null
  if (interval) window.clearInterval(interval)
  interval = 0
  if (frame) window.cancelAnimationFrame(frame)
  frame = 0
  if (mutationTimer) window.clearTimeout(mutationTimer)
  mutationTimer = 0
  if (wasActive) {
    window.removeEventListener('scroll', scheduleFrame, { capture: true })
    window.removeEventListener('resize', scheduleFrame)
  }
  document.getElementById(HOST_ID)?.remove()
  document.getElementById(STYLE_LINK_ID)?.remove()
  clearFlags()
  document.querySelectorAll<HTMLVideoElement>('video[data-tbx-ig-id], video[data-tbx-ig-rate-set], video[data-tbx-ig-pip-unlocked]').forEach(restoreVideo)
}
