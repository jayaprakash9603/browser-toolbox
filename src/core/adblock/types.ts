export const RULESET_IDS = ['ads', 'privacy', 'annoyances', 'youtube'] as const

export type RulesetId = (typeof RULESET_IDS)[number]

export interface FilterListSubscriptionMeta {
  enabled: boolean
  lastUpdated?: number
  lastError?: string
}

export interface AdblockSubscriptionSyncMeta {
  lastRefreshAt?: number
  dynamicRulesApplied?: number
  supplementalDomains?: number
  unsupportedRules?: number
  lastRefreshError?: string
}

export interface AdblockState {
  enabled: boolean
  youtubeEnabled: boolean
  cosmeticEnabled: boolean
  /** Plus: hide cookie consent banners (also enables the annoyances ruleset). */
  cookieBanners: boolean
  /** Plus: hide floating videos, newsletter pop-ups, sign-in and subscribe prompts. */
  distractions: boolean
  /** Plus: auto-deny site notification and push permission prompts. */
  blockNotifications: boolean
  /** Block pop-up and pop-under windows and click-anywhere ad overlays. */
  blockPopups: boolean
  lists: Record<RulesetId, boolean>
  allowlist: string[]
  /** Per-source list metadata (see `scripts/adblock/sources.json` ids). */
  subscriptions?: Record<string, FilterListSubscriptionMeta>
  subscriptionSync?: AdblockSubscriptionSyncMeta
}

export interface AdblockCounts {
  network: number
  hidden: number
  youtube: number
}

export interface AdblockTabEntry extends AdblockCounts {
  tabId: number
  url: string
  host: string
  title: string
  favIconUrl?: string
  updatedAt: number
}

export interface AdblockTotals extends AdblockCounts {
  since: number
}

export type AdblockTabStatsMap = Record<string, AdblockTabEntry>
