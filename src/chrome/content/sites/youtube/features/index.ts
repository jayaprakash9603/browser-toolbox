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

const TILE_SELECTOR =
  'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer'

let feedObserver: MutationObserver | null = null
let feedScanTimer: ReturnType<typeof setTimeout> | null = null
let feedCtx: FeatureContext | null = null
let undoTimer: ReturnType<typeof setInterval> | null = null
let stillWatchingObserver: MutationObserver | null = null
let stillScanTimer: ReturnType<typeof setTimeout> | null = null
let wheelBound = false
let keyBound = false
let navHandler: (() => void) | null = null

const FEED_DEBOUNCE_MS = 120
const STILL_WATCHING_DEBOUNCE_MS = 200

function values(ctx: FeatureContext): Record<string, unknown> {
  return ctx.state.values
}

/** Hiding tiles in the feed — requires DOM scans (keep separate from undo-bar cleanup). */
function feedTileFiltersActive(ctx: FeatureContext): boolean {
  const v = values(ctx)
  return (
    isFeatureOn(v, 'keywordFilter') ||
    isFeatureOn(v, 'hideChannels') ||
    isFeatureOn(v, 'hideWatchedVideos')
  )
}

function feedScriptsActive(ctx: FeatureContext): boolean {
  const v = values(ctx)
  return feedTileFiltersActive(ctx) || isFeatureOn(v, 'autoHideUndoBar')
}

function shouldHideTile(tile: Element, ctx: FeatureContext): boolean {
  const title = tile.querySelector('#video-title, .title')?.textContent ?? ''
  const channel =
    tile.querySelector('#channel-name, ytd-channel-name')?.textContent?.trim() ?? ''
  const channelId = tile.querySelector('a[href*="/channel/"], a[href*="/@"]')?.getAttribute('href') ?? ''
  if (isFeatureOn(values(ctx), 'keywordFilter')) {
    const keys = parseKeywordList(String(values(ctx).blockedKeywords ?? ''))
    if (keys.length && matchesKeyword(title, keys)) return true
  }
  if (isFeatureOn(values(ctx), 'hideChannels')) {
    const blocked = parseChannelList(String(values(ctx).blockedChannels ?? ''))
    if (blocked.length && matchesChannel(channel, channelId, blocked)) return true
  }
  if (isFeatureOn(values(ctx), 'hideWatchedVideos')) {
    const min = Number(values(ctx).watchedMinPercent ?? 80)
    const progress = tile.querySelector('ytd-thumbnail-overlay-resume-playback-renderer')
    if (!progress) return false
    const pct = watchedPercentFromAria(progress.getAttribute('aria-label') ?? null)
    if (pct != null && pct >= min) return true
  }
  return false
}

function applyTile(tile: Element, ctx: FeatureContext): void {
  const el = tile as HTMLElement
  if (shouldHideTile(tile, ctx)) el.style.display = 'none'
  else el.style.removeProperty('display')
}

function scanTilesUnder(root: ParentNode, ctx: FeatureContext): void {
  if (root instanceof Element) {
    if (root.matches(TILE_SELECTOR)) applyTile(root, ctx)
    for (const tile of root.querySelectorAll(TILE_SELECTOR)) applyTile(tile, ctx)
  } else {
    for (const tile of (root as Document | DocumentFragment).querySelectorAll?.(TILE_SELECTOR) ?? []) {
      applyTile(tile, ctx)
    }
  }
}

function scanFeeds(ctx: FeatureContext): void {
  if (!feedTileFiltersActive(ctx)) return
  scanTilesUnder(document, ctx)
}

function scheduleFeedScan(ctx: FeatureContext, roots?: ParentNode[]): void {
  feedCtx = ctx
  if (roots?.length) {
    for (const root of roots) scanTilesUnder(root, ctx)
  }
  if (feedScanTimer) return
  feedScanTimer = setTimeout(() => {
    feedScanTimer = null
    if (feedCtx) scanFeeds(feedCtx)
  }, FEED_DEBOUNCE_MS)
}

function feedObserveTarget(): Element | null {
  return (
    document.querySelector('ytd-app') ??
    document.querySelector('#content') ??
    document.body
  )
}

reg('feedFilters', {
  start(ctx) {
    if (!feedScriptsActive(ctx)) return
    if (feedTileFiltersActive(ctx)) {
      scanFeeds(ctx)
      const target = feedObserveTarget()
      if (target) {
        feedObserver = new MutationObserver((mutations) => {
          const roots: ParentNode[] = []
          for (const m of mutations) {
            for (const node of m.addedNodes) {
              if (node instanceof Element) roots.push(node)
            }
          }
          scheduleFeedScan(ctx, roots.length ? roots : undefined)
        })
        feedObserver.observe(target, { childList: true, subtree: true })
      }
    }
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
    feedCtx = null
    if (feedScanTimer) clearTimeout(feedScanTimer)
    feedScanTimer = null
    if (undoTimer) clearInterval(undoTimer)
    undoTimer = null
    document.querySelectorAll<HTMLElement>(TILE_SELECTOR).forEach((el) => el.style.removeProperty('display'))
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
    const playerActive =
      v.defaultSpeed !== '1' ||
      v.defaultQuality !== 'auto' ||
      isFeatureOn(v, 'disableAutoplay') ||
      isFeatureOn(v, 'disableAmbient') ||
      isFeatureOn(v, 'alwaysOriginalAudio') ||
      isFeatureOn(v, 'rememberVolume') ||
      isFeatureOn(v, 'loopButton') ||
      isFeatureOn(v, 'alwaysTheater') ||
      isFeatureOn(v, 'wheelVolume') ||
      isFeatureOn(v, 'wheelSpeed') ||
      isFeatureOn(v, 'speedHotkeys') ||
      isFeatureOn(v, 'shortsStopLoop')
    if (!playerActive) return
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
            postToMain('wheel', {
              deltaY: e.deltaY,
              volume: isFeatureOn(v, 'wheelVolume'),
              speed: isFeatureOn(v, 'wheelSpeed'),
            })
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

function dismissStillWatching(): void {
  for (const el of document.querySelectorAll('yt-confirm-dialog-renderer, tp-yt-paper-dialog')) {
    if (isStillWatchingDialog(el.textContent ?? '')) {
      el.querySelector<HTMLElement>('#button, [aria-label*="Yes"], [aria-label*="Continue"]')?.click()
    }
  }
}

reg('stillWatching', {
  start(ctx) {
    if (!isFeatureOn(values(ctx), 'dismissStillWatching')) return
    const target = document.querySelector('ytd-app') ?? document.body
    stillWatchingObserver = new MutationObserver(() => {
      if (stillScanTimer) return
      stillScanTimer = setTimeout(() => {
        stillScanTimer = null
        dismissStillWatching()
      }, STILL_WATCHING_DEBOUNCE_MS)
    })
    stillWatchingObserver.observe(target, { childList: true, subtree: true })
    dismissStillWatching()
  },
  stop() {
    stillWatchingObserver?.disconnect()
    stillWatchingObserver = null
    if (stillScanTimer) clearTimeout(stillScanTimer)
    stillScanTimer = null
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
        categories: Array.isArray(values(ctx).sponsorCategories) ? values(ctx).sponsorCategories : [],
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

const NAV_REFRESH_RUNNERS = ['sponsor', 'dislikes', 'redirectShorts', 'player'] as const

export function onYoutubeNavigate(ctx: FeatureContext): void {
  if (!ctx.state.enabled) return
  for (const id of NAV_REFRESH_RUNNERS) {
    const runner = runners.get(id)
    runner?.stop()
    runner?.start(ctx)
  }
  if (feedTileFiltersActive(ctx)) scanFeeds(ctx)
}
