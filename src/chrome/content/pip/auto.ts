import { enterFullPlayerPip } from '@/core/pip/fullPlayerPip'

type Guarded = Window & { __tbxPipAuto?: boolean }

function collectVideos(root: ParentNode, out: HTMLVideoElement[]): void {
  root.querySelectorAll('video').forEach((v) => out.push(v))
  root.querySelectorAll('*').forEach((el) => {
    if (el.shadowRoot) collectVideos(el.shadowRoot, out)
  })
}

function largestVideo(filter: (v: HTMLVideoElement, r: DOMRect) => boolean): HTMLVideoElement | null {
  const videos: HTMLVideoElement[] = []
  collectVideos(document, videos)
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

async function enterNativePip(video: HTMLVideoElement): Promise<void> {
  video.removeAttribute('disablePictureInPicture')
  video.disablePictureInPicture = false
  try {
    await video.requestPictureInPicture()
    video.addEventListener(
      'leavepictureinpicture',
      () => {
        if (document.visibilityState === 'hidden') video.pause()
      },
      { once: true },
    )
  } catch {
    /* page may block PiP */
  }
}

async function onEnterPip(): Promise<void> {
  if (!playingVideo()) return
  // Full player (site controls) first; native video PiP when the player can't be moved.
  if ((await enterFullPlayerPip()) === 'entered') return
  const video = playingVideo()
  if (video) await enterNativePip(video)
}

function register(): void {
  try {
    navigator.mediaSession.setActionHandler(
      'enterpictureinpicture' as MediaSessionAction,
      () => void onEnterPip(),
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
  btn.title = 'Picture-in-Picture'
  btn.style.cssText =
    'all:initial;position:fixed;z-index:2147483647;width:36px;height:36px;display:none;' +
    'align-items:center;justify-content:center;cursor:pointer;border-radius:8px;' +
    'background:rgba(20,20,20,.72);color:#fff;box-shadow:0 1px 6px rgba(0,0,0,.4);'
  btn.appendChild(buildIcon())

  let hideTimer = 0
  const show = () => {
    const v = bestVideo()
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
    const v = bestVideo()
    if (v) void enterNativePip(v)
  })
  btn.addEventListener('mouseenter', () => window.clearTimeout(hideTimer))
  btn.addEventListener('mouseleave', show)
  document.addEventListener('mousemove', show, { passive: true, capture: true })
  document.documentElement.appendChild(btn)
}

const guarded = window as Guarded
if ('mediaSession' in navigator && !guarded.__tbxPipAuto) {
  guarded.__tbxPipAuto = true
  register()
  installFrameButton()
  // Sites such as YouTube replace media-session handlers; keep ours registered.
  document.addEventListener('playing', register, true)
  window.setInterval(register, 4000)
}
