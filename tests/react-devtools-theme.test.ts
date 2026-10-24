import { describe, expect, it } from 'vitest'

import { resolveBrowserThemeFromSettings } from '@/core/reactDevtools/theme'
import {
  getDarkThemeOverrides,
  getLightThemeOverrides,
  THEME_STYLE_COLOR_KEYS,
} from '../vendor/react-devtools/overlay/packages/react-devtools-extensions/src/browserToolbox/themeTokens.js'

describe('resolveBrowserThemeFromSettings', () => {
  it('respects explicit light and dark settings', () => {
    expect(resolveBrowserThemeFromSettings({ theme: 'light' }, 'dark')).toBe('light')
    expect(resolveBrowserThemeFromSettings({ theme: 'dark' }, 'light')).toBe('dark')
  })

  it('falls back to devtools theme when system', () => {
    expect(resolveBrowserThemeFromSettings({ theme: 'system' }, 'dark')).toBe('dark')
    expect(resolveBrowserThemeFromSettings({ theme: 'system' }, 'default')).toBe('light')
  })
})

describe('theme token overrides', () => {
  it('covers every declared theme color key', () => {
    const light = getLightThemeOverrides()
    const dark = getDarkThemeOverrides()
    for (const key of THEME_STYLE_COLOR_KEYS) {
      expect(light[key], `light missing ${key}`).toBeTruthy()
      expect(dark[key], `dark missing ${key}`).toBeTruthy()
    }
  })
})
