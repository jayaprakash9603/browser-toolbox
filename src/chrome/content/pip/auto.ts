import { enterEmbeddedPlayerPip, enterFullPlayerPip } from '@/core/pip/fullPlayerPip'
import { enterStreamingPlayerPip } from '@/core/pip/streamingPlayerPip'

type Guarded = Window & { __tbxPipAuto?: boolean; __tbxPipOff?: boolean; __tbxPipResume?: boolean }

/** Set by the background when PiP (or auto-PiP) is switched off while this page is open. */
const pipOff = () => (window as Guarded).__tbxPipOff === true

let videoCache: { at: number; videos: HTMLVideoElement[] } | null = null

function collectVideosShallow(root: ParentNode, out: HTMLVideoElement[]): void {
  root.querySelectorAll('video').forEach((v) => out.push(v))
}

function collectVideosDeep(root: ParentNode, out: HTMLVideoElement[]): void {
  collectVideosShallow(root, out)
  root.querySelectorAll('*').forEach((el) => {
    if (el.shadowRoot) collectVideosDeep(el.shadowRoot, out)
  })
}

function allVideos(): HTMLVideoElement[] {
  const now = Date.now()
  if (videoCache && now - videoCache.at < 1000) return videoCache.videos
  const shallow: HTMLVideoElement[] = []
  collectVideosShallow(document, shallow)
  const videos =
    shallow.length > 0 ? shallow : (() => { const deep: HTMLVideoElement[] = []; collectVideosDeep(document, deep); return deep })()
  videoCache = { at: now, videos }
  return videos
}

function largestVideo(filter: (v: HTMLVideoElement, r: DOMRect) => boolean): HTMLVideoElement | null {
  const videos = allVideos()
  let best: HTMLVideoElement | null = null
  let bestArea = 0
  for (const v of videos) {
    if (v.readyState === 0) continue
    const r = v.getBoundingClientRect()
    if (!filter(v, r)) continue
    const area = r.width * r.height
    if (area > bestArea) {
      bestArea = area
      best = v
    }
  }
  return best
}

const playingVideo = () =>
  largestVideo((v) => !v.paused && !v.ended && v.readyState > 2)

const nativeVisibility = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState')?.get
const nativeHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')?.get
const realVisibility = (): DocumentVisibilityState =>
  (nativeVisibility?.call(document) as DocumentVisibilityState | undefined) ?? 'visible'

const isFloatingCopy = /(?:^|[#&])tbx-pip-t=/.test(location.hash)
let pipEnteredAt = 0

function pipActive(): boolean {
  const docPip = (window as unknown as { documentPictureInPicture?: { window: Window | null } })
    .documentPictureInPicture
  return isFloatingCopy || !!document.pictureInPictureElement || !!docPip?.window
}

/**
 * While a video is floating, stop the page from reacting to the tab being hidden or blurred
 * (many players pause or tear down playback then) and from immediately kicking the video out
 * of PiP. Runs at document_start so these guards are in place before the page's own listeners.
 */
function installPipGuards(): void {
  try {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (pipActive() ? 'visible' : realVisibility()),
    })
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => (pipActive() ? false : Boolean(nativeHidden?.call(document))),
    })
  } catch {
    /* non-configurable on this page */
  }

  const swallow = (event: Event) => {
    if (pipActive()) event.stopImmediatePropagation()
  }
  for (const type of ['visibilitychange', 'webkitvisibilitychange']) {
    document.addEventListener(type, swallow, true)
    window.addEventListener(type, swallow, true)
  }
  for (const type of ['blur', 'freeze']) window.addEventListener(type, swallow, true)

  document.addEventListener('enterpictureinpicture', () => (pipEnteredAt = Date.now()), true)
  const nativeExit = document.exitPictureInPicture.bind(document)
  document.exitPictureInPicture = () => {
    // Pages that eject the video right after it floats are ignored; later exits go through.
    if (Date.now() - pipEnteredAt < 2000) return Promise.resolve()
    return nativeExit()
  }
}

type RequestPip = (this: HTMLVideoElement) => Promise<PictureInPictureWindow>

/**
 * Pages sometimes replace requestPictureInPicture with a no-op to block PiP. Use the browser's
 * own implementation from a clean frame in that case. Does not touch DRM / content protection.
 */
async function requestPipUnblocked(video: HTMLVideoElement): Promise<void> {
  video.removeAttribute('disablePictureInPicture')
  try {
    Object.defineProperty(video, 'disablePictureInPicture', {
      configurable: true,
      get: () => false,
      set: () => undefined,
    })
  } catch {
    /* non-configurable */
  }
  const current = HTMLVideoElement.prototype.requestPictureInPicture as RequestPip
  if (/\[native code\]/.test(Function.prototype.toString.call(current))) {
    await current.call(video)
    return
  }
  const frame = document.createElement('iframe')
  frame.style.display = 'none'
  document.documentElement.appendChild(frame)
  try {
    const clean = (frame.contentWindow as (Window & typeof globalThis) | null)?.HTMLVideoElement.prototype
      .requestPictureInPicture as RequestPip | undefined
    await (clean ?? current).call(video)
  } finally {
    frame.remove()
  }
}

async function enterNativePip(video: HTMLVideoElement): Promise<void> {
  try {
    await requestPipUnblocked(video)
    // Playlists load the next item into the same <video> and the page may leave PiP then;
    // only a close the user made should stop playback.
    const openedAt = Date.now()
    const openedSrc = video.currentSrc
    let mediaChangedAt = 0
    const markMediaChange = () => (mediaChangedAt = Date.now())
    const mediaChangeEvents = ['ended', 'emptied', 'loadstart', 'abort']
    for (const type of mediaChangeEvents) video.addEventListener(type, markMediaChange)
    video.addEventListener(
      'leavepictureinpicture',
      () => {
        for (const type of mediaChangeEvents) video.removeEventListener(type, markMediaChange)
        const now = Date.now()
        const closedByUser =
          now - openedAt > 2000 && now - mediaChangedAt > 4000 && video.currentSrc === openedSrc && !video.ended
        if ((window as Guarded).__tbxPipResume) void video.play().catch(() => undefined)
        else if (realVisibility() === 'hidden' && closedByUser) video.pause()
      },
      { once: true },
    )
  } catch {
    /* page may block PiP */
  }
}

async function onEnterPip(): Promise<void> {
  if (pipOff()) return
  if (!playingVideo()) {
    // Video plays inside an embed from another site: float a full copy of that player.
    if (window === window.top) await enterEmbeddedPlayerPip()
    return
  }
  // Full player (site controls) first; native video PiP when the player can't be moved.
  const full = await enterFullPlayerPip()
  if (full === 'entered') return
  if (full === 'drm' && (await enterStreamingPlayerPip()) === 'entered') return
  const video = playingVideo()
  if (video) await enterNativePip(video)
}

function register(): void {
  try {
    navigator.mediaSession.setActionHandler(
      'enterpictureinpicture' as MediaSessionAction,
      pipOff() ? null : () => void onEnterPip(),
    )
  } catch {
    /* unsupported */
  }
}

function buildIcon(): SVGSVGElement {
  // Built with DOM APIs: innerHTML throws on players that enforce Trusted Types.
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  const attrs: Record<string, string> = {
    width: '20',
    height: '20',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'aria-hidden': 'true',
  }
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v)
  const rect = (x: string, y: string, w: string, h: string, rx: string, fill?: string) => {
    const r = document.createElementNS(NS, 'rect')
    r.setAttribute('x', x)
    r.setAttribute('y', y)
    r.setAttribute('width', w)
    r.setAttribute('height', h)
    r.setAttribute('rx', rx)
    if (fill) r.setAttribute('fill', fill)
    svg.appendChild(r)
  }
  rect('2', '4', '20', '14', '2')
  rect('12', '10', '8', '6', '1', 'currentColor')
  return svg
}

// Embedded players (Dailymotion, Vimeo, news sites, ...) live in cross-origin iframes where
// the keyboard shortcut cannot grant the user gesture PiP needs. Show a small button over the
// video inside the frame so the click itself is the gesture.
function installFrameButton(): void {
  if (window === window.top || !document.pictureInPictureEnabled) return

  const bestVideo = () => largestVideo((_v, r) => r.width >= 160 && r.height >= 90)

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.setAttribute('aria-label', 'Picture-in-Picture')
  btn.setAttribute('data-tbx-pip-btn', '')
  btn.title = 'Picture-in-Picture'
  btn.style.cssText =
    'all:initial;position:fixed;z-index:2147483647;width:36px;height:36px;display:none;' +
    'align-items:center;justify-content:center;cursor:pointer;border-radius:8px;' +
    'background:rgba(20,20,20,.72);color:#fff;box-shadow:0 1px 6px rgba(0,0,0,.4);'
  btn.appendChild(buildIcon())

  let hideTimer = 0
  const show = () => {
    const v = pipOff() ? null : bestVideo()
    if (!v) {
      btn.style.display = 'none'
      return
    }
    const r = v.getBoundingClientRect()
    btn.style.left = `${Math.max(8, r.left + 8)}px`
    btn.style.top = `${Math.max(8, r.top + 8)}px`
    btn.style.display = 'flex'
    window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(() => {
      btn.style.display = 'none'
    }, 2800)
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture()
      return
    }
    if (pipOff()) return
    const v = bestVideo()
    if (!v) return
    // The click's activation also reaches the top page, which can open a full-player window
    // with a copy of this embed. Fall back to native PiP if it doesn't answer.
    let handled = false
    const onResult = (event: MessageEvent) => {
      const data = event.data as { __tbxPip?: string; ok?: boolean } | null
      if (event.source !== window.top || data?.__tbxPip !== 'embedded-result') return
      handled = true
      window.removeEventListener('message', onResult)
      if (!data.ok) void enterNativePip(v)
    }
    window.addEventListener('message', onResult)
    window.top?.postMessage({ __tbxPip: 'open-embedded' }, '*')
    window.setTimeout(() => {
      if (handled) return
      window.removeEventListener('message', onResult)
      void enterNativePip(v)
    }, 1500)
  })
  btn.addEventListener('mouseenter', () => window.clearTimeout(hideTimer))
  btn.addEventListener('mouseleave', show)

  let moveRaf = 0
  let lastMoveAt = 0
  const onMove = () => {
    if (moveRaf) return
    moveRaf = requestAnimationFrame(() => {
      moveRaf = 0
      const now = Date.now()
      if (now - lastMoveAt < 250) return
      lastMoveAt = now
      show()
    })
  }
  document.addEventListener('mousemove', onMove, { passive: true, capture: true })
  document.documentElement.appendChild(btn)
}

// Inside an embedded player: cooperate with the top page's full-player PiP (see
// enterEmbeddedPlayerPip). Only the direct parent may control playback.
function installEmbedBridge(): void {
  if (window === window.top) return
  const mainVideo = () => largestVideo((_v, r) => r.width >= 160 && r.height >= 90)

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return
    const data = event.data as { __tbxPip?: string; t?: number; play?: boolean } | null
    if (!data?.__tbxPip) return
    const v = mainVideo()
    if (!v) return
    if (data.__tbxPip === 'snapshot-request') {
      window.parent.postMessage(
        {
          __tbxPip: 'snapshot',
          t: v.currentTime,
          playing: !v.paused && !v.ended,
          ratio: v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9,
        },
        '*',
      )
    } else if (data.__tbxPip === 'pause') {
      v.pause()
    } else if (data.__tbxPip === 'seek') {
      if (Number.isFinite(data.t)) v.currentTime = Number(data.t)
      if (data.play) void v.play().catch(() => undefined)
    }
  })

  // Running as the floating copy: resume at the handed-over position and report progress.
  const match = /(?:^|[#&])tbx-pip-t=([\d.]+)/.exec(location.hash)
  if (!match) return
  const startAt = Number(match[1])
  let resumed = false
  const startedAt = Date.now()
  const timer = window.setInterval(() => {
    const v = mainVideo()
    if (!v) {
      if (Date.now() - startedAt > 20000) window.clearInterval(timer)
      return
    }
    if (!resumed && v.readyState > 0) {
      resumed = true
      if (startAt > 0 && Math.abs(v.currentTime - startAt) > 1.5) v.currentTime = startAt
      void v.play().catch(() => {
        v.muted = true
        void v.play().catch(() => undefined)
      })
    }
    window.parent.postMessage({ __tbxPip: 'time', t: v.currentTime }, '*')
  }, 1000)
}

function installTopBridge(): void {
  if (window !== window.top) return
  window.addEventListener('message', (event) => {
    const data = event.data as { __tbxPip?: string } | null
    if (data?.__tbxPip !== 'open-embedded' || !event.source) return
    const source = event.source as Window
    if (pipOff()) {
      source.postMessage({ __tbxPip: 'embedded-result', ok: true }, '*')
      return
    }
    void enterEmbeddedPlayerPip().then((result) => {
      source.postMessage({ __tbxPip: 'embedded-result', ok: result === 'entered' }, '*')
    })
  })
}

const guarded = window as Guarded
if ('mediaSession' in navigator && !guarded.__tbxPipAuto) {
  guarded.__tbxPipAuto = true
  installPipGuards()
  register()
  installFrameButton()
  installEmbedBridge()
  installTopBridge()
  // Sites such as YouTube replace media-session handlers; keep ours registered.
  document.addEventListener('playing', register, true)
  if (window === window.top) window.setInterval(register, 4000)
}
