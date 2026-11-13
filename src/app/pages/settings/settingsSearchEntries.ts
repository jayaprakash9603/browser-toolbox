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
    id: 'internetMonitor',
    labelKey: 'netmon.settingsPage.title',
    fallbackLabel: 'Internet monitor',
    keywords: ['internet', 'connection', 'network', 'wifi', 'ping', 'offline'],
  },
  {
    id: 'keyboardShortcuts',
    labelKey: 'shortcuts.settingsTitle',
    fallbackLabel: 'Keyboard shortcuts',
    keywords: ['shortcut', 'hotkey', 'keyboard', 'alt+p', 'ctrl+k'],
  },
  {
    id: 'contextMenuClipboardHistory',
    labelKey: 'settings.contextMenu.clipboardHistory',
    fallbackLabel: 'Clipboard in right-click menu',
    keywords: ['context menu', 'right click', 'clipboard', 'overlay'],
  },
  {
    id: 'contextMenuColorPicker',
    labelKey: 'settings.contextMenu.colorPicker',
    fallbackLabel: 'Color picker in right-click menu',
    keywords: ['context menu', 'right click', 'color', 'eyedropper'],
  },
  {
    id: 'contextMenuOpenPanel',
    labelKey: 'settings.contextMenu.openPanel',
    fallbackLabel: 'Open panel in right-click menu',
    keywords: ['context menu', 'right click', 'open panel'],
  },
  {
    id: 'contextMenuBookmarks',
    labelKey: 'settings.contextMenu.bookmarks',
    fallbackLabel: 'Smart Bookmark Organizer in right-click menu',
    keywords: ['context menu', 'right click', 'bookmark', 'save page'],
  },
  {
    id: 'contextMenuScreenshot',
    labelKey: 'settings.contextMenu.screenshot',
    fallbackLabel: 'Capture in right-click menu',
    keywords: ['context menu', 'right click', 'screenshot', 'capture'],
  },
  {
    id: 'contextMenuScreenRecorder',
    labelKey: 'settings.contextMenu.screenRecorder',
    fallbackLabel: 'Record screen in right-click menu',
    keywords: ['context menu', 'right click', 'record'],
  },
  {
    id: 'contextMenuMobileSimulator',
    labelKey: 'settings.contextMenu.mobileSimulator',
    fallbackLabel: 'Mobile Simulator in right-click menu',
    keywords: ['context menu', 'right click', 'mobile', 'simulator', 'responsive', 'device'],
  },
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
    fallbackLabel: 'WhatsApp',
    keywords: ['whatsapp', 'wa', 'chatboost', 'sites'],
  },
  {
    id: 'saveImageAsPanel',
    labelKey: 'saveImageAs.settingsTitle',
    fallbackLabel: 'Save Image As Type',
    keywords: ['image', 'download', 'jpg', 'png', 'pdf', 'context menu'],
  },
  {
    id: 'pipPanel',
    labelKey: 'pip.settingsTitle',
    fallbackLabel: 'Picture-in-Picture',
    keywords: ['pip', 'video', 'float', 'alt+p', 'picture in picture'],
  },
  {
    id: 'formMemoryEnabled',
    labelKey: 'formMemory.settings.enabled',
    fallbackLabel: 'Form autofill',
    keywords: ['form', 'autofill', 'fill', 'remember'],
  },
  {
    id: 'recorderEnabled',
    labelKey: 'recorder.settings.enabled',
    fallbackLabel: 'Screen recording',
    keywords: ['record', 'screen', 'video', 'capture'],
  },
  {
    id: 'clipboardHistory',
    labelKey: 'settings.clipboardHistory',
    fallbackLabel: 'Clipboard history',
    keywords: ['clipboard'],
  },
  {
    id: 'siteAccess',
    labelKey: 'settings.siteAccessAll',
    fallbackLabel: 'Access to all websites',
    keywords: ['permission', 'host', 'all sites', 'access', 'privacy'],
  },
  {
    id: 'clipboardCapturePages',
    labelKey: 'settings.clipboardCapturePages',
    fallbackLabel: 'Capture copies on websites',
    keywords: ['clipboard', 'copy', 'websites', 'capture'],
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
  if (entryId === 'keyboardShortcuts') return '/settings/keyboard-shortcuts'
  return buildRoute('/settings', { focus: entryId })
}
