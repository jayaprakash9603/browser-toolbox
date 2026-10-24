import { describe, expect, it } from 'vitest'

import { getExtensionName, getChromeMessage } from '@/core/i18n/chromeMessages'

describe('chrome extension messages', () => {
  it('reads extName from chrome.i18n when available', () => {
    expect(getExtensionName()).toBe('One Panel')
    expect(getChromeMessage('contextMenuOpen')).toBe('Open One Panel')
  })
})
