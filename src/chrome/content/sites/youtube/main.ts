import { PAGE_CMD_KEY, PAGE_EVT_KEY } from '@/core/sites/youtube/constants'

type Guarded = Window & { __toolboxSitesYtMain?: boolean }

let sponsorTimeHandler: ((this: HTMLVideoElement, ev: Event) => void) | null = null

function getVideo(): HTMLVideoElement | null {
  return document.querySelector('video.html5-main-video, video')
}

function getPlayer(): { setPlaybackRate?(r: number): void; getPlaybackRate?(): number; setVolume?(v: number): void; getVolume?(): number } | null {
  return (document.querySelector('#movie_player') as unknown as {
    setPlaybackRate?(r: number): void
    getPlaybackRate?(): number
    setVolume?(v: number): void
    getVolume?(): number
  }) ?? null
}

const MIN_RATE = 0.0625
const MAX_RATE = 16

const QUALITY_LABELS: Record<string, string> = {
  '144': 'tiny',
  '360': 'medium',
  '480': 'large',
  '720': 'hd720',
  '1080': 'hd1080',
  '1440': 'hd1440',
  '2160': 'hd2160',
  '4320': 'highres',
}

/** Best-effort: asks the player for a quality; YouTube falls back if unavailable for the video. */
function applyQuality(value: string): void {
  const player = document.querySelector('#movie_player') as unknown as {
    setPlaybackQualityRange?(min: string, max?: string): void
    setPlaybackQuality?(q: string): void
  } | null
  const q = QUALITY_LABELS[value]
  if (!player || !q) return
  player.setPlaybackQualityRange?.(q, q)
  player.setPlaybackQuality?.(q)
}

function setRate(player: ReturnType<typeof getPlayer>, rate: number): void {
  const next = Math.min(MAX_RATE, Math.max(MIN_RATE, rate))
  const video = getVideo()
  if (next <= 2 && player?.setPlaybackRate) player.setPlaybackRate(next)
  else if (video) video.playbackRate = next
}

function currentRate(player: ReturnType<typeof getPlayer>): number {
  return getVideo()?.playbackRate ?? player?.getPlaybackRate?.() ?? 1
}

// Session flags survive a page reload, so a speed or theater mode we set earlier can still be undone.
const APPLIED_SPEED_KEY = 'tbx-yt-applied-speed'
const APPLIED_THEATER_KEY = 'tbx-yt-applied-theater'
const APPLIED_QUALITY_KEY = 'tbx-yt-applied-quality'
let autoplayChanged = false

function sessionFlag(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function setSessionFlag(key: string, value: string | null): void {
  try {
    if (value == null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    /* storage can be blocked */
  }
}

function forceRate(rate: number): void {
  const player = getPlayer()
  const video = getVideo()
  if (rate <= 2) player?.setPlaybackRate?.(rate)
  if (video && Math.abs(video.playbackRate - rate) > 0.001) video.playbackRate = rate
}

function isTheater(): boolean {
  return document.querySelector('ytd-watch-flexy')?.hasAttribute('theater') ?? false
}

function clickSizeButton(): void {
  document.querySelector<HTMLElement>('.ytp-size-button')?.click()
}

function applySpeed(value: unknown): void {
  const speed = Math.min(MAX_RATE, Math.max(MIN_RATE, Number(value ?? 1) || 1))
  if (Math.abs(speed - 1) > 0.001) {
    forceRate(speed)
    setSessionFlag(APPLIED_SPEED_KEY, String(speed))
  } else if (sessionFlag(APPLIED_SPEED_KEY)) {
    forceRate(1)
    setSessionFlag(APPLIED_SPEED_KEY, null)
  }
}

function applyQualityChoice(value: unknown): void {
  const choice = String(value ?? 'auto')
  if (choice !== 'auto' && QUALITY_LABELS[choice]) {
    applyQuality(choice)
    setSessionFlag(APPLIED_QUALITY_KEY, choice)
    return
  }
  if (!sessionFlag(APPLIED_QUALITY_KEY)) return
  const player = document.querySelector('#movie_player') as unknown as {
    setPlaybackQualityRange?(min: string, max?: string): void
    setPlaybackQuality?(q: string): void
  } | null
  player?.setPlaybackQualityRange?.('auto', 'auto')
  player?.setPlaybackQuality?.('auto')
  setSessionFlag(APPLIED_QUALITY_KEY, null)
}

function applyAutoplay(off: boolean): void {
  const video = getVideo()
  if (!video) return
  if (off) {
    if (video.autoplay) {
      video.autoplay = false
      autoplayChanged = true
    }
  } else if (autoplayChanged) {
    video.autoplay = true
    autoplayChanged = false
  }
}

function applyTheater(on: boolean): void {
  if (on) {
    if (!isTheater()) clickSizeButton()
    setSessionFlag(APPLIED_THEATER_KEY, '1')
  } else if (sessionFlag(APPLIED_THEATER_KEY)) {
    if (isTheater()) clickSizeButton()
    setSessionFlag(APPLIED_THEATER_KEY, null)
  }
}

/** Applies the panel's player values. Values at their default undo only what this script set. */
function applyPlayerSettings(payload: Record<string, unknown> | null): void {
  const values = payload ?? {}
  applySpeed(values.defaultSpeed)
  applyQualityChoice(values.defaultQuality)
  applyAutoplay(values.disableAutoplay === true || values.disableAutoplay === 'true')
  applyTheater(values.alwaysTheater === true)
  if (values.rememberVolume) {
    const player = getPlayer()
    const saved = localStorage.getItem('tbx-yt-volume')
    if (saved && player?.setVolume) player.setVolume(Number(saved))
  }
}

function clearSponsor(): void {
  const video = getVideo()
  if (video && sponsorTimeHandler) video.removeEventListener('timeupdate', sponsorTimeHandler)
  sponsorTimeHandler = null
}

function skipSponsor(segments: { segment: [number, number] }[]): void {
  const video = getVideo()
  if (!video) return
  if (sponsorTimeHandler) video.removeEventListener('timeupdate', sponsorTimeHandler)
  const jump = () => {
    const now = video.currentTime
    for (const s of segments) {
      const [start, end] = s.segment
      if (now >= start && now < end - 0.05) {
        video.currentTime = end
        break
      }
    }
  }
  sponsorTimeHandler = jump
  jump()
  video.addEventListener('timeupdate', jump)
}

const guarded = window as Guarded
if (!guarded.__toolboxSitesYtMain && window === window.top) {
  guarded.__toolboxSitesYtMain = true
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    const data = event.data as Record<string, unknown> | null
    if (!data || data[PAGE_CMD_KEY] === undefined) return
    const cmd = String(data[PAGE_CMD_KEY])
    const payload = data.payload
    if (cmd === 'applyPlayer') applyPlayerSettings(payload as Record<string, unknown> | null)
    if (cmd === 'wheel' && payload && typeof payload === 'object') {
      const p = payload as { deltaY: number; volume?: boolean; speed?: boolean }
      const player = getPlayer()
      if (p.volume && player?.setVolume && player.getVolume) {
        const next = Math.min(100, Math.max(0, player.getVolume() - p.deltaY * 0.05))
        player.setVolume(next)
        localStorage.setItem('tbx-yt-volume', String(next))
      }
      if (p.speed) setRate(player, currentRate(player) + (p.deltaY > 0 ? -0.05 : 0.05))
    }
    if (cmd === 'speedDelta' && payload && typeof payload === 'object') {
      const player = getPlayer()
      const delta = Number((payload as { delta: number }).delta)
      if (Number.isFinite(delta)) setRate(player, currentRate(player) + delta)
    }
    if (cmd === 'sponsorSegments' && Array.isArray(payload)) skipSponsor(payload as { segment: [number, number] }[])
    if (cmd === 'clearSponsor') clearSponsor()
    window.postMessage({ [PAGE_EVT_KEY]: 'ack', payload: cmd }, location.origin || '*')
  })
}
