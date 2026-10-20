import type { BundleStats, HtmlBundleJobRequest } from '@/core/htmlBundleJob'

export type ExtensionMessage =
  | { type: 'CONTENT_SCRIPT_PING' }
  | { type: 'GET_SELECTED_ELEMENT' }
  | { type: 'EXTRACT_PAGE_LINKS' }
  | { type: 'OPEN_TOOL'; toolId: string }
  | { type: 'OPEN_COMMAND_PALETTE' }
  | { type: 'CLIPBOARD_CAPTURE_REQUEST' }
  | { type: 'CONTEXT_MENU_ACTION'; actionId: string; selectionText?: string }
  | { type: 'PICK_ELEMENT_START' }
  | { type: 'PICK_ELEMENT_CANCEL' }
  | { type: 'GET_PAGE_INFO' }
  | { type: 'GET_STORAGE_SNAPSHOT' }
  | { type: 'CAPTURE_VISIBLE'; windowId?: number }
  | {
      type: 'SCAN_HTML_BUNDLE'
      htmlOnly?: boolean
      sameFolderOnly?: boolean
    }
  | {
      type: 'BUILD_HTML_BUNDLE'
      buildId: string
      includeCurrent: boolean
      selectedResolvedUrls: string[]
      includeAssets: boolean
      maxPages?: number
      maxBytes?: number
    }
  | { type: 'READ_HTML_BUNDLE_CHUNK'; buildId: string; index: number }
  | {
      type: 'HTML_BUNDLE_PROGRESS'
      buildId: string
      phase: 'pages' | 'assets' | 'zip' | 'transfer'
      done: number
      total: number
    }
  | {
      type: 'HTML_BUNDLE_READY'
      buildId: string
      stats: BundleStats
      size: number
      chunkCount: number
    }
  | { type: 'HTML_BUNDLE_FAILED'; buildId: string; error: string }
  | { type: 'CANCEL_HTML_BUNDLE'; buildId: string }
  | {
      type: 'START_HTML_BUNDLE_JOB'
      tabId: number
      pageUrl: string
      pageTitle: string
      fileName: string
      pageCount: number
      request: HtmlBundleJobRequest
    }
  | { type: 'CANCEL_HTML_BUNDLE_JOB'; jobId: string }
  | { type: 'OFFSCREEN_BUNDLE_CHUNK'; buildId: string; base64: string }
  | { type: 'OFFSCREEN_BUNDLE_FINALIZE'; buildId: string }
  | { type: 'OFFSCREEN_BUNDLE_RELEASE'; buildId: string }
  | { type: 'ADBLOCK_GET_TAB_STATS'; tabId?: number }
  | { type: 'ADBLOCK_RELOAD_TAB'; tabId?: number }
  | { type: 'ADBLOCK_COSMETIC_REPORT'; hidden?: number; youtube?: number }
  | { type: 'ADBLOCK_RESET_TOTALS' }
  | { type: 'PROTECTION_REPORT'; category: string; host: string; source?: string }
  | { type: 'PROTECTION_GET_STATS' }
  | { type: 'PROTECTION_PROCEED_ONCE'; url: string }
  | { type: 'PROTECTION_TRUST_SITE'; host: string }
  | { type: 'PROTECTION_RESET_STATS' }
  | { type: 'PROTECTION_GESTURE'; host?: string }
  | { type: 'PROTECTION_DOWNLOAD_DECISION'; id: number; keep: boolean }
  | { type: 'YT_SPONSOR_SEGMENTS'; videoId: string; categories: string[] }
  | { type: 'YT_DISLIKES'; videoId: string }
  | { type: 'YT_DOWNLOAD_TRANSCRIPT'; videoId: string }
  | { type: 'WA_OPEN_PANEL' }
  | { type: 'WA_GET_STATUS' }
  | { type: 'WA_RUNTIME_STATUS'; status: string }
  | { type: 'WA_CACHE_MESSAGE'; payload?: unknown }
  | { type: 'WA_MESSAGE_REVOKED'; payload?: unknown }
  | { type: 'WA_PRESENCE'; payload?: unknown }
  | { type: 'WA_SMART_REPLY_CHECK'; payload?: unknown }
  | { type: 'WA_FIRE_WEBHOOK'; event: string; payload: unknown }
  | { type: 'WA_RUN_BROADCAST'; campaignId: string }
  | { type: 'WA_EXPORT'; kind: string }
  | { type: 'WA_EXPORT_CHAT'; options: import('@/core/sites/whatsapp/chatExport').ChatExportOptions }
  | { type: 'WA_TRANSLATE'; text: string; target: string }
  | {
      type: 'OFFSCREEN_IMAGE_CONVERT'
      base64: string
      sourceMime: string
      format: 'jpg' | 'png' | 'webp' | 'gif' | 'pdf'
      quality: number
    }
  | { type: 'OFFSCREEN_IMAGE_RELEASE'; url: string }
  | { type: 'PIP_TOGGLE'; tabId?: number }
  | { type: 'SHORTCUT_KEY_EVENT'; modifiers: { key: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean } }

export type ExtensionMessageType = ExtensionMessage['type']

export type ExtensionResponse<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

const MESSAGE_TYPES = new Set<ExtensionMessageType>([
  'CONTENT_SCRIPT_PING',
  'GET_SELECTED_ELEMENT',
  'EXTRACT_PAGE_LINKS',
  'OPEN_TOOL',
  'OPEN_COMMAND_PALETTE',
  'CLIPBOARD_CAPTURE_REQUEST',
  'CONTEXT_MENU_ACTION',
  'PICK_ELEMENT_START',
  'PICK_ELEMENT_CANCEL',
  'GET_PAGE_INFO',
  'GET_STORAGE_SNAPSHOT',
  'CAPTURE_VISIBLE',
  'SCAN_HTML_BUNDLE',
  'BUILD_HTML_BUNDLE',
  'READ_HTML_BUNDLE_CHUNK',
  'HTML_BUNDLE_PROGRESS',
  'HTML_BUNDLE_READY',
  'HTML_BUNDLE_FAILED',
  'CANCEL_HTML_BUNDLE',
  'START_HTML_BUNDLE_JOB',
  'CANCEL_HTML_BUNDLE_JOB',
  'OFFSCREEN_BUNDLE_CHUNK',
  'OFFSCREEN_BUNDLE_FINALIZE',
  'OFFSCREEN_BUNDLE_RELEASE',
  'ADBLOCK_GET_TAB_STATS',
  'ADBLOCK_RELOAD_TAB',
  'ADBLOCK_COSMETIC_REPORT',
  'ADBLOCK_RESET_TOTALS',
  'PROTECTION_REPORT',
  'PROTECTION_GET_STATS',
  'PROTECTION_PROCEED_ONCE',
  'PROTECTION_TRUST_SITE',
  'PROTECTION_RESET_STATS',
  'PROTECTION_GESTURE',
  'PROTECTION_DOWNLOAD_DECISION',
  'YT_SPONSOR_SEGMENTS',
  'YT_DISLIKES',
  'YT_DOWNLOAD_TRANSCRIPT',
  'WA_OPEN_PANEL',
  'WA_GET_STATUS',
  'WA_RUNTIME_STATUS',
  'WA_CACHE_MESSAGE',
  'WA_MESSAGE_REVOKED',
  'WA_PRESENCE',
  'WA_SMART_REPLY_CHECK',
  'WA_FIRE_WEBHOOK',
  'WA_RUN_BROADCAST',
  'WA_EXPORT',
  'WA_EXPORT_CHAT',
  'WA_TRANSLATE',
  'OFFSCREEN_IMAGE_CONVERT',
  'OFFSCREEN_IMAGE_RELEASE',
  'PIP_TOGGLE',
  'SHORTCUT_KEY_EVENT',
])

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    MESSAGE_TYPES.has((value as { type: string }).type as ExtensionMessageType)
  )
}
