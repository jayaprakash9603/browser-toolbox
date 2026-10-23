import { YOUTUBE_COSMETIC_SELECTORS } from './selectors'

type GuardedWindow = Window & { __toolboxYtIsolated?: boolean }

const STYLE_ID = 'toolbox-adblock-youtube'
const ENFORCEMENT_POLL_MS = 1000

let enabled = false
let enforcementTimer: ReturnType<typeof setInterval> | null = null

function injectCss(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `${YOUTUBE_COSMETIC_SELECTORS.join(',\n')}{display:none!important}`
  ;(document.head ?? document.documentElement).appendChild(style)
}

/**
 * Hiding YouTube's ad-blocker notice with CSS leaves its modal backdrop over the page, which
 * greys it out and swallows every click. Remove the dialog and backdrop together instead.
 */
function dismissEnforcementDialog(): void {
  const notice = document.querySelector('ytd-enforcement-message-view-model')
  if (!notice) return
  ;(notice.closest('tp-yt-paper-dialog') ?? notice).remove()
  document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach((el) => el.remove())
  document.body?.style.removeProperty('overflow')
  document.documentElement.style.removeProperty('overflow')
  const video = document.querySelector<HTMLVideoElement>('#movie_player video.html5-main-video')
  if (video?.paused && !video.ended) void video.play().catch(() => undefined)
}

function start(): void {
  injectCss()
  dismissEnforcementDialog()
  enforcementTimer ??= setInterval(dismissEnforcementDialog, ENFORCEMENT_POLL_MS)
}

function stop(): void {
  document.getElementById(STYLE_ID)?.remove()
  if (enforcementTimer) clearInterval(enforcementTimer)
  enforcementTimer = null
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
if (!guarded.__toolboxYtIsolated && window === window.top) {
  guarded.__toolboxYtIsolated = true
  chrome.storage.local.get('adblock', (result) => applyState(result.adblock))
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.adblock) applyState(changes.adblock.newValue)
  })
}
