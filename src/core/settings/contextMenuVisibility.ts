export type ContextMenuVisibilityKey =
  | 'openPanel'
  | 'clipboardHistory'
  | 'colorPicker'
  | 'screenshot'
  | 'screenRecorder'
  | 'tasks'
  | 'readingList'
  | 'saveImageAs'
  | 'pictureInPicture'
  | 'siteQuickActions'
  | 'chatPulse'
  | 'downloadManager'

export type ContextMenuVisibility = Record<ContextMenuVisibilityKey, boolean>

export const DEFAULT_CONTEXT_MENU_VISIBILITY: ContextMenuVisibility = {
  openPanel: true,
  clipboardHistory: true,
  colorPicker: true,
  screenshot: true,
  screenRecorder: true,
  tasks: true,
  readingList: true,
  saveImageAs: true,
  pictureInPicture: true,
  siteQuickActions: true,
  chatPulse: true,
  downloadManager: true,
}

export function resolveContextMenuVisibility(
  stored?: Partial<{ contextMenu?: Partial<ContextMenuVisibility> }>,
): ContextMenuVisibility {
  return { ...DEFAULT_CONTEXT_MENU_VISIBILITY, ...stored?.contextMenu }
}
