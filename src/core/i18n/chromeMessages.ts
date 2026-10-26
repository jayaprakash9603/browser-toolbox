const CHROME_UI_FALLBACKS: Record<string, string> = {
  extName: 'One Panel',
  extDescription:
    'One Panel: clipboard, text, developer, QA and web utilities in one Chrome side panel.',
  actionTitle: 'Open One Panel',
  contextMenuOpen: 'Open One Panel',
  contextMenuPauseAdblock: 'Pause ad blocking on this site',
  contextMenuSaveImageAs: 'Save image as',
  contextMenuPip: 'Picture-in-Picture',
  commandTogglePip: 'Toggle Picture-in-Picture for the current tab',
  contextMenuTaskPage: 'Add page to Tasks',
  contextMenuTaskLink: 'Add link to Tasks',
  contextMenuTaskSelection: 'Add “%s” to Tasks',
  taskReminderTitle: 'Task reminder',
  taskReminderDue: 'Due',
  taskReminderComplete: 'Complete',
  taskReminderSnooze: 'Snooze 10 min',
  colorCopied: 'Copied',
  colorCopyFailed: 'Copy failed',
  colorHintPick: 'copy',
  colorHintZoom: 'zoom',
  colorHintFormat: 'format',
  colorHintKeep: 'keep picking',
  colorHintExit: 'exit',
}

export function getChromeMessage(messageName: string): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
      const value = chrome.i18n.getMessage(messageName)
      if (value) return value
    }
  } catch {
    // Non-extension contexts (tests, Vite dev without chrome.i18n)
  }
  return CHROME_UI_FALLBACKS[messageName] ?? ''
}

export function getExtensionName(): string {
  return getChromeMessage('extName') || CHROME_UI_FALLBACKS.extName
}
