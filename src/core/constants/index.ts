export const STORAGE_VERSION = 1

export const STORAGE_KEYS = {
  settings: 'settings',
  favorites: 'favorites',
  recentTools: 'recentTools',
  clipboardHistory: 'clipboardHistory',
  adblock: 'adblock',
  adblockTotals: 'adblockTotals',
  /** Session-only live totals (not broadcast to content scripts). */
  adblockTotalsLive: 'adblockTotalsLive',
  /** Session mirror of redirect traces (background only). */
  redirectTraceSession: 'redirectTraceSession',
  protection: 'protection',
  protectionStats: 'protectionStats',
  protectionRulesVersion: 'protectionRulesVersion',
  youtubeEnhancer: 'youtubeEnhancer',
  whatsappPlus: 'whatsappPlus',
  instagramEnhancer: 'instagramEnhancer',
  redirectTrace: 'redirectTrace',
  totpAccounts: 'totpAccounts',
  saveImageAs: 'saveImageAs',
  imageDownloader: 'imageDownloader',
  imageLinks: 'imageLinks',
  pip: 'pip',
  keyboardShortcuts: 'keyboardShortcuts',
  netMonitor: 'netMonitor',
  netMonitorLog: 'netMonitorLog',
  netMonitorHeartbeat: 'netMonitorHeartbeat',
  speedTestHistory: 'speedTestHistory',
  interceptorRules: 'interceptorRules',
  interceptorGroups: 'interceptorGroups',
  interceptorLibrary: 'interceptorLibrary',
  interceptorSettings: 'interceptorSettings',
  reactDevtools: 'reactDevtools',
  meta: 'meta',
} as const

import { getExtensionName } from '@/core/i18n/chromeMessages'

export const APP_NAME = getExtensionName()

export const MAX_RECENT_TOOLS = 8
export const DEFAULT_CLIPBOARD_HISTORY_LIMIT = 100
export const MAX_CLIPBOARD_HISTORY_LIMIT = 1000
