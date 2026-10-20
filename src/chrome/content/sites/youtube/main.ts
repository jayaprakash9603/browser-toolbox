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

function applyPlayerSettings(payload: Record<string, unknown> | null): void {
  if (!payload) return
  const player = getPlayer()
  const video = getVideo()
  if (!player && !video) return
  // Browsers support 0.0625x–16x on <video>; YouTube's player API only accepts up to 2x.
  const speed = Math.min(MAX_RATE, Math.max(MIN_RATE, Number(payload.defaultSpeed ?? 1) || 1))
  if (speed <= 2 && player?.setPlaybackRate) player.setPlaybackRate(speed)
  else if (video) video.playbackRate = speed
  applyQuality(String(payload.defaultQuality ?? 'auto'))
  if (payload.disableAutoplay && video) video.autoplay = false
  if (payload.rememberVolume) {
    const saved = localStorage.getItem('tbx-yt-volume')
    if (saved && player?.setVolume) player.setVolume(Number(saved))
  }
  if (payload.alwaysTheater) {
    document.querySelector<HTMLElement>('.ytp-size-button')?.click()
  }
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
    window.postMessage({ [PAGE_EVT_KEY]: 'ack', payload: cmd }, location.origin || '*')
  })
}
