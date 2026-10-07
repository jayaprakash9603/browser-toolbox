import { defaultTheme, type ApiClientTheme } from 'postman-lite'

import type { ThemeMode } from '@/features/settings/settingsService'

const TOOLBOX_THEME_ID = 'toolbox-coral'

const LIGHT = {
  primary: '28 85% 52%',
  accentSoft: '28 90% 94%',
  accentBorder: '28 70% 80%',
}

const DARK = {
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
      primary: LIGHT.primary,
      ring: LIGHT.primary,
      link: LIGHT.primary,
      accentSoft: LIGHT.accentSoft,
      accentBorder: LIGHT.accentBorder,
    },
    dark: {
      ...defaultTheme.dark,
      primary: DARK.primary,
      ring: DARK.primary,
      link: DARK.primary,
      accentSoft: DARK.accentSoft,
      accentBorder: DARK.accentBorder,
    },
  }
}

export { TOOLBOX_THEME_ID }
