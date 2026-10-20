import type { LucideIcon } from 'lucide-react'
import { SettingsIcon } from 'lucide-react'

import { buildRoute } from '@/features/search/buildRoute'

export interface SettingsSearchEntry {
  id: string
  labelKey: string
  fallbackLabel: string
  keywords?: string[]
  aliases?: string[]
}

export const SETTINGS_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    id: 'theme',
    labelKey: 'settings.theme',
    fallbackLabel: 'Theme',
    keywords: ['light', 'dark', 'system', 'appearance'],
    aliases: ['dark theme', 'light theme'],
  },
  {
    id: 'density',
    labelKey: 'settings.density',
    fallbackLabel: 'Density',
    keywords: ['compact', 'comfortable', 'spacing'],
  },
  {
    id: 'palette',
    labelKey: 'settings.palette',
    fallbackLabel: 'Color palette',
    keywords: ['color', 'accent', 'theme'],
  },
  {
    id: 'adblockEnabled',
    labelKey: 'settings.adblockEnabled',
    fallbackLabel: 'Ad blocker',
    keywords: ['ads', 'block'],
  },
  {
    id: 'adblockYoutube',
    labelKey: 'settings.adblockYoutube',
    fallbackLabel: 'YouTube ad blocking',
    keywords: ['youtube', 'ads'],
  },
  {
    id: 'protectionEnabled',
    labelKey: 'settings.protectionEnabled',
    fallbackLabel: 'Web protection',
    keywords: ['phishing', 'malware', 'security'],
  },
  {
    id: 'youtubePanel',
    labelKey: 'sites.youtube.settings.title',
    fallbackLabel: 'YouTube Control Panel',
    keywords: ['youtube', 'sites'],
  },
  {
    id: 'whatsappPanel',
    labelKey: 'sites.whatsapp.settings.title',
    fallbackLabel: 'ChatBoost for WhatsApp',
    keywords: ['whatsapp', 'wa', 'sites'],
  },
  {
    id: 'clipboardHistory',
    labelKey: 'settings.clipboardHistory',
    fallbackLabel: 'Clipboard history',
    keywords: ['clipboard'],
  },
  {
    id: 'historySize',
    labelKey: 'settings.historySize',
    fallbackLabel: 'Clipboard history size',
    keywords: ['clipboard', 'limit'],
  },
  {
    id: 'clearClipboard',
    labelKey: 'settings.clearClipboardHistory',
    fallbackLabel: 'Clear clipboard history',
    keywords: ['clipboard', 'clear', 'delete'],
  },
  {
    id: 'clearRecent',
    labelKey: 'settings.clearRecentTools',
    fallbackLabel: 'Clear recent tools',
    keywords: ['recent', 'clear'],
  },
  {
    id: 'resetAll',
    labelKey: 'settings.resetAll',
    fallbackLabel: 'Reset all settings',
    keywords: ['reset', 'factory'],
  },
]

export const SETTINGS_SEARCH_ICON: LucideIcon = SettingsIcon

export function settingsSearchRoute(entryId: string): string {
  return buildRoute('/settings', { focus: entryId })
}
