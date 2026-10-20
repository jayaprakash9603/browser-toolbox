import {
  isFeatureOn,
  isStillWatchingDialog,
  matchesChannel,
  matchesKeyword,
  parseChannelList,
  parseKeywordList,
  shortsToWatchUrl,
  watchedPercentFromAria,
} from '@/core/sites/youtube'
import type { YoutubeEnhancerState } from '@/core/sites/youtube'

import { postToMain } from '../bridge'

export interface FeatureContext {
  state: YoutubeEnhancerState
  onNavigate: () => void
}

type Runner = { start: (ctx: FeatureContext) => void; stop: () => void }

const runners = new Map<string, Runner>()

function reg(id: string, runner: Runner): void {
  runners.set(id, runner)
}

let feedObserver: MutationObserver | null = null
let undoTimer: ReturnType<typeof setTimeout> | null = null
let stillWatchingObserver: MutationObserver | null = null
let wheelBound = false
let keyBound = false
let navHandler: (() => void) | null = null

function values(ctx: FeatureContext): Record<string, unknown> {
  return ctx.state.values
}

function hideVideoTile(tile: Element, ctx: FeatureContext): void {
  const title = tile.querySelector('#video-title, .title')?.textContent ?? ''
  const channel =
    tile.querySelector('#channel-name, ytd-channel-name')?.textContent?.trim() ?? ''
  const channelId = tile.querySelector('a[href*="/channel/"], a[href*="/@"]')?.getAttribute('href') ?? ''
  if (isFeatureOn(values(ctx), 'keywordFilter')) {
    const keys = parseKeywordList(String(values(ctx).blockedKeywords ?? ''))
    if (matchesKeyword(title, keys)) {
      ;(tile as HTMLElement).style.display = 'none'
      return
    }
  }
  if (isFeatureOn(values(ctx), 'hideChannels')) {
    const blocked = parseChannelList(String(values(ctx).blockedChannels ?? ''))
    if (matchesChannel(channel, channelId, blocked)) {
      ;(tile as HTMLElement).style.display = 'none'
      return
    }
  }
  if (isFeatureOn(values(ctx), 'hideWatchedVideos')) {
    const min = Number(values(ctx).watchedMinPercent ?? 80)
    const progress = tile.querySelector('ytd-thumbnail-overlay-resume-playback-renderer')
    const pct = watchedPercentFromAria(progress?.getAttribute('aria-label') ?? null)
    if (pct != null && pct >= min) (tile as HTMLElement).style.display = 'none'
  }
}

function scanFeeds(ctx: FeatureContext): void {
  for (const tile of document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer')) {
    hideVideoTile(tile, ctx)
  }
}

reg('feedFilters', {
  start(ctx) {
    scanFeeds(ctx)
    feedObserver = new MutationObserver(() => scanFeeds(ctx))
    feedObserver.observe(document.body, { childList: true, subtree: true })
    if (isFeatureOn(values(ctx), 'autoHideUndoBar')) {
      undoTimer = setInterval(() => {
        document.querySelectorAll('yt-button-renderer #button[aria-label*="Undo"]').forEach((el) => {
          const row = el.closest('ytd-notification-action-renderer, tp-yt-paper-toast')
          if (row) (row as HTMLElement).style.display = 'none'
        })
      }, 5000)
    }
  },
  stop() {
    feedObserver?.disconnect()
    feedObserver = null
    if (undoTimer) clearInterval(undoTimer)
    undoTimer = null
  },
})

reg('redirectShorts', {
  start(ctx) {
    if (!isFeatureOn(values(ctx), 'redirectShorts')) return
    const fix = () => {
      const next = shortsToWatchUrl(location.href)
      if (next) location.replace(next)
    }
    fix()
    navHandler = fix
    document.addEventListener('yt-navigate-finish', fix)
  },
  stop() {
    if (navHandler) document.removeEventListener('yt-navigate-finish', navHandler)
    navHandler = null
  },
})

reg('player', {
  start(ctx) {
    const v = values(ctx)
    postToMain('applyPlayer', {
      defaultSpeed: v.defaultSpeed,
      defaultQuality: v.defaultQuality,
      disableAutoplay: v.disableAutoplay,
      disableAmbient: v.disableAmbient,
      alwaysOriginalAudio: v.alwaysOriginalAudio,
      rememberVolume: v.rememberVolume,
      loopButton: v.loopButton,
      alwaysTheater: v.alwaysTheater,
    })
    if (isFeatureOn(v, 'wheelVolume') || isFeatureOn(v, 'wheelSpeed')) {
      if (!wheelBound) {
        wheelBound = true
        document.addEventListener(
          'wheel',
          (e) => {
            const player = document.querySelector('#movie_player')
            if (!player?.contains(e.target as Node)) return
            e.preventDefault()
            postToMain('wheel', { deltaY: e.deltaY, volume: isFeatureOn(v, 'wheelVolume'), speed: isFeatureOn(v, 'wheelSpeed') })
          },
          { passive: false },
        )
      }
    }
    if (isFeatureOn(v, 'speedHotkeys') && !keyBound) {
      keyBound = true
      document.addEventListener('keydown', (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        if (e.key === '<' || e.key === ',') postToMain('speedDelta', { delta: -0.25 })
        if (e.key === '>' || e.key === '.') postToMain('speedDelta', { delta: 0.25 })
      })
    }
    if (isFeatureOn(v, 'shortsStopLoop')) {
      document.querySelectorAll('video').forEach((video) => {
        video.loop = false
      })
    }
  },
  stop() {
    postToMain('applyPlayer', null)
  },
})

reg('stillWatching', {
  start(ctx) {
    if (!isFeatureOn(values(ctx), 'dismissStillWatching')) return
    stillWatchingObserver = new MutationObserver(() => {
      for (const el of document.querySelectorAll('yt-confirm-dialog-renderer, tp-yt-paper-dialog')) {
        if (isStillWatchingDialog(el.textContent ?? '')) {
          el.querySelector<HTMLElement>('#button, [aria-label*="Yes"], [aria-label*="Continue"]')?.click()
        }
      }
    })
    stillWatchingObserver.observe(document.body, { childList: true, subtree: true })
  },
  stop() {
    stillWatchingObserver?.disconnect()
    stillWatchingObserver = null
  },
})

reg('sponsor', {
  start(ctx) {
    if (!isFeatureOn(values(ctx), 'sponsorBlock')) return
    const videoId = new URLSearchParams(location.search).get('v')
    if (!videoId) return
    void chrome.runtime
      .sendMessage({
        type: 'YT_SPONSOR_SEGMENTS',
        videoId,
        categories: Array.isArray(values(ctx).sponsorCategories)
          ? values(ctx).sponsorCategories
          : [],
      })
      .then((res: { ok?: boolean; data?: { segments?: unknown } } | undefined) => {
        const segments = res && 'ok' in res && res.ok ? res.data?.segments : undefined
        if (segments) postToMain('sponsorSegments', segments)
      })
      .catch(() => {})
  },
  stop() {},
})

reg('dislikes', {
  start(ctx) {
    if (!isFeatureOn(values(ctx), 'returnDislikes')) return
    const videoId = new URLSearchParams(location.search).get('v')
    if (!videoId) return
    void chrome.runtime.sendMessage({ type: 'YT_DISLIKES', videoId }).catch(() => {})
  },
  stop() {},
})

export function startScriptFeatures(ctx: FeatureContext): void {
  stopScriptFeatures()
  if (!ctx.state.enabled) return
  for (const runner of runners.values()) runner.start(ctx)
}

export function stopScriptFeatures(): void {
  for (const runner of runners.values()) runner.stop()
}

export function onYoutubeNavigate(ctx: FeatureContext): void {
  if (!ctx.state.enabled) return
  stopScriptFeatures()
  startScriptFeatures(ctx)
}
