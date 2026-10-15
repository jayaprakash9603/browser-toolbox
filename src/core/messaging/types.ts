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
])

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    MESSAGE_TYPES.has((value as { type: string }).type as ExtensionMessageType)
  )
}
