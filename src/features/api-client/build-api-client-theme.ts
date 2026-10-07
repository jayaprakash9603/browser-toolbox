import { defaultTheme, type ApiClientTheme } from 'postman-lite'

import type { ThemeMode } from '@/features/settings/settingsService'

const TOOLBOX_THEME_ID = 'toolbox-coral'

/** HSL tokens aligned with Browser Toolbox `globals.css` (coral primary). */
const TOOLBOX_LIGHT = {
  background: '0 0% 98%',
  foreground: '0 0% 9%',
  card: '0 0% 100%',
  cardForeground: '0 0% 9%',
  muted: '0 0% 95%',
  mutedForeground: '0 0% 45%',
  border: '0 0% 90%',
  input: '0 0% 83%',
  primary: '28 85% 52%',
  accentSoft: '28 90% 94%',
  accentBorder: '28 70% 80%',
}

const TOOLBOX_DARK = {
  background: '0 0% 4%',
  foreground: '0 0% 96%',
  card: '0 0% 9%',
  cardForeground: '0 0% 96%',
  muted: '0 0% 13%',
  mutedForeground: '0 0% 64%',
  border: '0 0% 20%',
  input: '0 0% 25%',
  primary: '28 80% 62%',
  accentSoft: '28 45% 18%',
  accentBorder: '28 40% 30%',
}

export function buildApiClientTheme(themeMode: ThemeMode): ApiClientTheme {
  return {
    id: TOOLBOX_THEME_ID,
    mode: themeMode,
    light: {
      ...defaultTheme.light,
      ...TOOLBOX_LIGHT,
      ring: TOOLBOX_LIGHT.primary,
      link: TOOLBOX_LIGHT.primary,
      accentSoft: TOOLBOX_LIGHT.accentSoft,
      accentBorder: TOOLBOX_LIGHT.accentBorder,
    },
    dark: {
      ...defaultTheme.dark,
      ...TOOLBOX_DARK,
      ring: TOOLBOX_DARK.primary,
      link: TOOLBOX_DARK.primary,
      accentSoft: TOOLBOX_DARK.accentSoft,
      accentBorder: TOOLBOX_DARK.accentBorder,
    },
  }
}

export { TOOLBOX_THEME_ID }
