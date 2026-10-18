import { defaultTheme, type ApiClientTheme, type ApiClientThemeTokens } from 'postman-lite'

import type { ThemeMode } from '@/features/settings/settingsService'

const TOOLBOX_THEME_ID = 'browser-toolbox'

/** HSL channels matching Browser Toolbox light tokens (coral primary, neutral surfaces). */
const TOOLBOX_LIGHT: Partial<ApiClientThemeTokens> = {
  background: '0 0% 97.6%',
  foreground: '0 0% 9%',
  card: '0 0% 100%',
  cardForeground: '0 0% 9%',
  popover: '0 0% 100%',
  popoverForeground: '0 0% 9%',
  primary: '18 78% 48%',
  primaryForeground: '0 0% 100%',
  secondary: '0 0% 94.5%',
  secondaryForeground: '0 0% 15%',
  muted: '0 0% 94.5%',
  mutedForeground: '0 0% 45%',
  accent: '0 0% 93%',
  accentForeground: '0 0% 9%',
  border: '0 0% 90%',
  input: '0 0% 83%',
  ring: '18 78% 48%',
}

/** HSL channels matching Browser Toolbox dark tokens. */
const TOOLBOX_DARK: Partial<ApiClientThemeTokens> = {
  background: '0 0% 4%',
  foreground: '0 0% 96%',
  card: '0 0% 9%',
  cardForeground: '0 0% 96%',
  popover: '0 0% 9%',
  popoverForeground: '0 0% 96%',
  primary: '22 82% 62%',
  primaryForeground: '0 0% 8%',
  secondary: '0 0% 13%',
  secondaryForeground: '0 0% 96%',
  muted: '0 0% 12.5%',
  mutedForeground: '0 0% 64%',
  accent: '0 0% 16%',
  accentForeground: '0 0% 96%',
  border: '0 0% 20%',
  input: '0 0% 25%',
  ring: '22 82% 62%',
}

export function buildApiClientTheme(themeMode: ThemeMode): ApiClientTheme {
  return {
    ...defaultTheme,
    id: TOOLBOX_THEME_ID,
    mode: themeMode,
    light: { ...defaultTheme.light, ...TOOLBOX_LIGHT },
    dark: { ...defaultTheme.dark, ...TOOLBOX_DARK },
  }
}

export { TOOLBOX_THEME_ID }
