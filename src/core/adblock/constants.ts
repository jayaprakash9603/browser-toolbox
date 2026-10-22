import type { AdblockCounts, AdblockState, AdblockTotals, RulesetId } from './types'

/** Dynamic DNR rule IDs for the per-site allowlist (one rule per hostname). */
export const ALLOWLIST_RULE_ID_BASE = 1_000_000

export const ALLOWLIST_RULE_PRIORITY = 100

export const TAB_STATS_SESSION_KEY = 'adblockTabStats'
export const INJECTED_SESSION_KEY = 'adblockInjected'

export const RULESET_MANIFEST_IDS: Record<RulesetId, string> = {
  ads: 'ruleset-ads',
  privacy: 'ruleset-privacy',
  annoyances: 'ruleset-annoyances',
  youtube: 'ruleset-youtube',
}

export const RULESET_PATHS: Record<RulesetId, string> = {
  ads: 'adblock/rulesets/ads.json',
  privacy: 'adblock/rulesets/privacy.json',
  annoyances: 'adblock/rulesets/annoyances.json',
  youtube: 'adblock/rulesets/youtube.json',
}

export const DEFAULT_LIST_TOGGLES: Record<RulesetId, boolean> = {
  ads: true,
  privacy: true,
  annoyances: false,
  youtube: true,
}

export const DEFAULT_ADBLOCK_STATE: AdblockState = {
  enabled: true,
  youtubeEnabled: true,
  cosmeticEnabled: true,
  cookieBanners: false,
  distractions: false,
  blockNotifications: false,
  blockPopups: true,
  lists: { ...DEFAULT_LIST_TOGGLES },
  allowlist: [],
}

export const EMPTY_COUNTS: AdblockCounts = { network: 0, hidden: 0, youtube: 0 }

export function emptyTotals(): AdblockTotals {
  return { ...EMPTY_COUNTS, since: Date.now() }
}

export const CONTENT_SCRIPT_IDS = {
  cosmetic: 'adblock-cosmetic',
  genericCss: 'adblock-generic-css',
  cookies: 'adblock-cookies',
  distractions: 'adblock-distractions',
  notifications: 'adblock-notifications',
  popups: 'adblock-popups',
  youtubeMain: 'adblock-yt-main',
  youtubeIsolated: 'adblock-yt-isolated',
} as const

export const YOUTUBE_MATCHES = [
  '*://*.youtube.com/*',
  '*://youtube.com/*',
  '*://*.youtube-nocookie.com/*',
]

export const ADBLOCK_FILES = {
  genericCss: 'adblock/cosmetic/generic.css',
  cosmeticControls: 'adblock/cosmetic/controls.json',
  cookiesCss: 'adblock/cosmetic/cookies.css',
  distractionsCss: 'adblock/cosmetic/distractions.css',
  cosmeticJs: 'adblock/scripts/cosmetic.js',
  cookiesRejectJs: 'adblock/scripts/cookies-reject.js',
  notificationsJs: 'adblock/scripts/notifications-main.js',
  popupsJs: 'adblock/scripts/popups-main.js',
  youtubeMainJs: 'adblock/scripts/youtube-main.js',
  youtubeIsolatedJs: 'adblock/scripts/youtube-isolated.js',
} as const
