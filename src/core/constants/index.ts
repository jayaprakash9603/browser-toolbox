export const STORAGE_VERSION = 1

export const STORAGE_KEYS = {
  settings: 'settings',
  favorites: 'favorites',
  recentTools: 'recentTools',
  clipboardHistory: 'clipboardHistory',
  adblock: 'adblock',
  adblockTotals: 'adblockTotals',
  protection: 'protection',
  protectionStats: 'protectionStats',
  protectionRulesVersion: 'protectionRulesVersion',
  youtubeEnhancer: 'youtubeEnhancer',
  whatsappPlus: 'whatsappPlus',
  saveImageAs: 'saveImageAs',
  pip: 'pip',
  keyboardShortcuts: 'keyboardShortcuts',
  meta: 'meta',
} as const

import { getExtensionName } from '@/core/i18n/chromeMessages'

export const APP_NAME = getExtensionName()

export const MAX_RECENT_TOOLS = 8
export const DEFAULT_CLIPBOARD_HISTORY_LIMIT = 100
export const MAX_CLIPBOARD_HISTORY_LIMIT = 1000
