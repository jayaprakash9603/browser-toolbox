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
      includeCurrent: boolean
      selectedResolvedUrls: string[]
      includeAssets: boolean
      maxPages?: number
      maxBytes?: number
    }

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
])

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    MESSAGE_TYPES.has((value as { type: string }).type as ExtensionMessageType)
  )
}
