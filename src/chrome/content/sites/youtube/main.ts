import { PAGE_CMD_KEY, PAGE_EVT_KEY } from '@/core/sites/youtube/constants'

type Guarded = Window & { __toolboxYtMain?: boolean }

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

function applyPlayerSettings(payload: Record<string, unknown> | null): void {
  if (!payload) return
  const player = getPlayer()
  const video = getVideo()
  if (!player && !video) return
  const speed = Number(payload.defaultSpeed ?? 1)
  if (player?.setPlaybackRate) player.setPlaybackRate(speed)
  else if (video) video.playbackRate = speed
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
  const t = video.currentTime
  for (const s of segments) {
    const [start, end] = s.segment
    if (t >= start && t < end - 0.05) {
      video.currentTime = end
      break
    }
  }
  video.addEventListener('timeupdate', () => {
    const now = video.currentTime
    for (const s of segments) {
      const [start, end] = s.segment
      if (now >= start && now < end - 0.05) video.currentTime = end
    }
  })
}

const guarded = window as Guarded
if (!guarded.__toolboxYtMain) {
  guarded.__toolboxYtMain = true
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
      if (p.speed && player?.setPlaybackRate && player.getPlaybackRate) {
        const next = Math.min(4, Math.max(0.25, player.getPlaybackRate() + (p.deltaY > 0 ? -0.05 : 0.05)))
        player.setPlaybackRate(next)
      }
    }
    if (cmd === 'speedDelta' && payload && typeof payload === 'object') {
      const player = getPlayer()
      const delta = Number((payload as { delta: number }).delta)
      if (player?.setPlaybackRate && player.getPlaybackRate) {
        player.setPlaybackRate(Math.min(4, Math.max(0.25, player.getPlaybackRate() + delta)))
      }
    }
    if (cmd === 'sponsorSegments' && Array.isArray(payload)) skipSponsor(payload as { segment: [number, number] }[])
    window.postMessage({ [PAGE_EVT_KEY]: 'ack', payload: cmd }, location.origin || '*')
  })
}
