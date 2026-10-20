import {
  YOUTUBE_AD_PLAYER_CLASSES,
  YOUTUBE_AD_UI_SELECTORS,
  YOUTUBE_COSMETIC_SELECTORS,
  YOUTUBE_SKIP_BUTTON_SELECTORS,
} from './selectors'

type GuardedWindow = Window & { __toolboxYtIsolated?: boolean }

const STYLE_ID = 'toolbox-adblock-youtube'
const REPORT_DELAY_MS = 1500
const FAST_FORWARD_RATE = 16

let enabled = false
let pendingBlocked = 0
let reportTimer: ReturnType<typeof setTimeout> | null = null
let playerObserver: MutationObserver | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let adPollTimer: ReturnType<typeof setInterval> | null = null
let saved: { muted: boolean; rate: number } | null = null
let adActive = false

function queueReport(count: number): void {
  if (count <= 0) return
  pendingBlocked += count
  if (reportTimer) return
  reportTimer = setTimeout(() => {
    reportTimer = null
    const youtube = pendingBlocked
    pendingBlocked = 0
    try {
      void chrome.runtime.sendMessage({ type: 'ADBLOCK_COSMETIC_REPORT', youtube }).catch(() => {})
    } catch {
      /* extension reloaded */
    }
  }, REPORT_DELAY_MS)
}

function injectCss(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `${YOUTUBE_COSMETIC_SELECTORS.join(',\n')}{display:none!important}`
  ;(document.head ?? document.documentElement).appendChild(style)
}

function getPlayer(): HTMLElement | null {
  return document.querySelector<HTMLElement>('#movie_player, .html5-video-player')
}

function getVideo(player: HTMLElement): HTMLVideoElement | null {
  return player.querySelector<HTMLVideoElement>('video.html5-main-video, video')
}

function isAdPlaying(player: HTMLElement): boolean {
  if (YOUTUBE_AD_PLAYER_CLASSES.some((cls) => player.classList.contains(cls))) return true
  return YOUTUBE_AD_UI_SELECTORS.some((selector) => player.querySelector(selector))
}

function clickSkip(player: HTMLElement): boolean {
  for (const selector of YOUTUBE_SKIP_BUTTON_SELECTORS) {
    const button = player.querySelector<HTMLElement>(selector)
    if (button) {
      button.click()
      return true
    }
  }
  return false
}

function restoreVideo(video: HTMLVideoElement | null): void {
  if (!saved || !video) return
  video.muted = saved.muted
  video.playbackRate = saved.rate
  saved = null
}

/** Fallback when an ad still slips through pruning: mute, fast-forward, skip. */
function checkPlayer(): void {
  const player = getPlayer()
  if (!player) return
  const video = getVideo(player)
  if (!isAdPlaying(player)) {
    if (adActive) {
      adActive = false
      restoreVideo(video)
    }
    return
  }
  if (!video) return
  if (!adActive) {
    adActive = true
    saved = { muted: video.muted, rate: video.playbackRate || 1 }
    queueReport(1)
  }
  video.muted = true
  if (video.playbackRate !== FAST_FORWARD_RATE) video.playbackRate = FAST_FORWARD_RATE
  if (clickSkip(player)) return
  if (Number.isFinite(video.duration) && video.duration > 0 && video.duration < 300) {
    video.currentTime = Math.max(video.currentTime, video.duration - 0.1)
  }
}

function stopPoll(): void {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}

function observePlayer(): void {
  const player = getPlayer()
  if (!player || playerObserver) return
  playerObserver = new MutationObserver(checkPlayer)
  playerObserver.observe(player, { attributes: true, attributeFilter: ['class'] })
  checkPlayer()
  stopPoll()
}

function startAdPoll(): void {
  if (adPollTimer) return
  adPollTimer = setInterval(checkPlayer, 250)
}

function stopAdPoll(): void {
  if (!adPollTimer) return
  clearInterval(adPollTimer)
  adPollTimer = null
}

function start(): void {
  injectCss()
  observePlayer()
  startAdPoll()
  if (!getPlayer()) {
    pollTimer ??= setInterval(() => {
      observePlayer()
    }, 1000)
  }
}

function stop(): void {
  document.getElementById(STYLE_ID)?.remove()
  playerObserver?.disconnect()
  playerObserver = null
  stopPoll()
  stopAdPoll()
  const player = getPlayer()
  restoreVideo(player ? getVideo(player) : null)
  adActive = false
}

function isEnabled(raw: unknown): boolean {
  const state = raw as
    | { enabled?: boolean; youtubeEnabled?: boolean; lists?: { youtube?: boolean }; allowlist?: string[] }
    | undefined
  if (state?.enabled === false || state?.youtubeEnabled === false || state?.lists?.youtube === false) {
    return false
  }
  const host = location.hostname.replace(/^www\./, '')
  return !(state?.allowlist ?? []).some((entry) => host === entry || host.endsWith(`.${entry}`))
}

function applyState(raw: unknown): void {
  const next = isEnabled(raw)
  if (next === enabled) return
  enabled = next
  if (enabled) start()
  else stop()
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxYtIsolated) {
  guarded.__toolboxYtIsolated = true

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window || !enabled) return
    const data = event.data as { source?: string; type?: string; count?: number } | null
    if (data?.source === 'toolbox-adblock' && data.type === 'yt-pruned') {
      queueReport(Number(data.count) > 0 ? 1 : 0)
    }
  })

  chrome.storage.local.get('adblock', (result) => applyState(result.adblock))
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.adblock) applyState(changes.adblock.newValue)
  })

  document.addEventListener('yt-navigate-finish', () => {
    if (enabled) observePlayer()
  })
}
