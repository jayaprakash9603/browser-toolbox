const CHROME_UI_FALLBACKS: Record<string, string> = {
  extName: 'Browser Toolbox',
  extDescription:
    'All-in-one productivity toolbox: clipboard, text, developer, QA and web utilities in one side panel.',
  actionTitle: 'Open Browser Toolbox',
  contextMenuOpen: 'Open Browser Toolbox',
  contextMenuPauseAdblock: 'Pause ad blocking on this site',
  contextMenuSaveImageAs: 'Save image as',
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
