import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { RECORDER_SESSION_KEY } from '@/core/recorder/session'
import type { RecorderSession, RecordingSource } from '@/core/recorder/types'

export const RECORDER_PARENT = 'toolbox.record'
export const RECORDER_STOP_MENU_ID = 'toolbox.record.stop'

const SOURCES: { id: string; source: RecordingSource; messageKey: string; fallback: string }[] = [
  { id: 'tab', source: 'tab', messageKey: 'contextMenuRecordTab', fallback: 'This tab' },
  { id: 'window', source: 'window', messageKey: 'contextMenuRecordWindow', fallback: 'This window' },
  { id: 'screen', source: 'screen', messageKey: 'contextMenuRecordScreen', fallback: 'Entire screen' },
]

export function buildRecorderMenus(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): void {
  create({
    id: RECORDER_PARENT,
    title: getChromeMessage('contextMenuRecord') ?? 'Record screen',
    contexts: ['page', 'frame', 'selection'],
  })
  for (const item of SOURCES) {
    create({
      id: `${RECORDER_PARENT}.${item.id}`,
      parentId: RECORDER_PARENT,
      title: getChromeMessage(item.messageKey) ?? item.fallback,
      contexts: ['page', 'frame', 'selection'],
    })
  }
  create({
    id: RECORDER_STOP_MENU_ID,
    title: getChromeMessage('contextMenuRecordStop') ?? 'Stop recording',
    contexts: ['page', 'frame', 'selection'],
    visible: false,
  })
}

export function isRecorderMenuAction(actionId: string): boolean {
  return actionId === RECORDER_STOP_MENU_ID || actionId.startsWith(`${RECORDER_PARENT}.`)
}

export function recorderSourceFromMenuAction(actionId: string): RecordingSource | null {
  if (!actionId.startsWith(`${RECORDER_PARENT}.`)) return null
  const key = actionId.slice(RECORDER_PARENT.length + 1)
  return SOURCES.find((item) => item.id === key)?.source ?? null
}

export function syncRecorderContextMenu(session: RecorderSession | null): void {
  if (!chrome.contextMenus.update) return
  const active = !!session && session.phase !== 'stopping'
  void chrome.contextMenus.update(RECORDER_STOP_MENU_ID, { visible: active }).catch(() => undefined)
}

export async function refreshRecorderMenuVisibility(): Promise<void> {
  if (!chrome.contextMenus.update) return
  const stored = await chrome.storage.session.get(RECORDER_SESSION_KEY)
  const session = (stored[RECORDER_SESSION_KEY] as RecorderSession | undefined) ?? null
  syncRecorderContextMenu(session)
}
