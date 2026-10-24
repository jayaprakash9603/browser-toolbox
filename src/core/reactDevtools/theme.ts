import type { Settings, ThemeMode } from '@/features/settings/settingsService'

export type ResolvedBrowserTheme = 'light' | 'dark'

export function resolveBrowserThemeFromSettings(
  settings: Pick<Settings, 'theme'>,
  devtoolsThemeName?: string,
): ResolvedBrowserTheme {
  const mode: ThemeMode = settings.theme
  if (mode === 'light') return 'light'
  if (mode === 'dark') return 'dark'
  if (devtoolsThemeName === 'dark') return 'dark'
  return 'light'
}
