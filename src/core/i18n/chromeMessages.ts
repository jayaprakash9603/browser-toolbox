const CHROME_UI_FALLBACKS: Record<string, string> = {
  extName: 'One Panel',
  extDescription:
    'Everyday developer, text and web tools in one searchable Chrome side panel. Works on your device; site features are opt-in.',
  actionTitle: 'Open One Panel',
  contextMenuOpen: 'Open One Panel',
  contextMenuPauseAdblock: 'Pause ad blocking on this site',
  contextMenuSaveImageAs: 'Save image as',
  contextMenuPip: 'Picture-in-Picture',
  commandTogglePip: 'Toggle Picture-in-Picture for the current tab',
  contextMenuTaskPage: 'Add page to To Do',
  contextMenuTaskLink: 'Add link to To Do',
  contextMenuTaskSelection: 'Add “%s” to To Do',
  contextMenuReadingListSelection: 'Save to Reading List',
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
  formFilledOne: 'Filled 1 field',
  formFilledOther: 'Filled {count} fields',
  formCleared: 'Cleared {count} fields',
  formNothingSaved: 'Nothing saved for this page yet. Fill it once and it will be remembered.',
  formAlreadyFilled: 'Saved values are already in place',
  formNothingToClear: 'Nothing to clear',
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
