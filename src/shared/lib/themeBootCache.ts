export const THEME_BOOT_CACHE_KEY = 'browser-toolbox:theme-boot'

export interface ThemeBootCache {
  dark: boolean
  palette: string
  density: string
}

export function writeThemeBootCache(cache: ThemeBootCache): void {
  try {
    localStorage.setItem(THEME_BOOT_CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* private mode / quota */
  }
}
