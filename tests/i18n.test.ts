import { describe, expect, it } from 'vitest'

import { CATEGORIES } from '@/core/registry/categories'
import i18n from '@/i18n'
import { clipboardTools } from '@/modules/clipboard/registry'
import { textTools } from '@/modules/text/registry'

describe('English localization', () => {
  it('initializes English as the supported and fallback locale', () => {
    expect(i18n.language).toBe('en')
    expect(i18n.options.supportedLngs).toContain('en')
    expect(i18n.options.fallbackLng).toEqual(['en'])
  })

  it('translates common labels and plural counts', () => {
    expect(i18n.t('nav.home')).toBe('Home')
    expect(i18n.t('common.entries', { count: 1 })).toBe('1 entry stored locally.')
    expect(i18n.t('common.entries', { count: 2 })).toBe('2 entries stored locally.')
  })

  it('provides English names and descriptions for every registered item', () => {
    for (const tool of [...clipboardTools, ...textTools]) {
      expect(i18n.exists(`tools.${tool.id}.name`)).toBe(true)
      expect(i18n.exists(`tools.${tool.id}.description`)).toBe(true)
    }

    for (const category of CATEGORIES) {
      expect(i18n.exists(`categories.${category.id}.name`)).toBe(true)
      expect(i18n.exists(`categories.${category.id}.description`)).toBe(true)
    }
  })
})
