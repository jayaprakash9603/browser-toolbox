import { useEffect, useRef } from 'react'

import { STORAGE_KEYS } from '@/core/constants'
import { TOOLBOX_RESTORE_THEME_EVENT } from '@/features/api-client/themeEvents'
import { useSettings } from '@/shared/hooks/useSettings'
import { writeThemeBootCache } from '@/shared/lib/themeBootCache'
import { DEFAULT_PALETTE, paletteIconPaths, type PaletteId } from '@/shared/lib/theme/palettes'

function applyFavicon(palette: PaletteId, dark: boolean): void {
  const paths = paletteIconPaths(palette, dark)
  for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')) {
    const size = link.sizes.value.split('x')[0] as keyof typeof paths
    if (paths[size]) link.href = `/${paths[size]}`
  }
}

let sharedDark: boolean | null = null

/** Lets the service worker pick the dark toolbar icon. */
function shareDark(dark: boolean): void {
  if (sharedDark === dark) return
  sharedDark = dark
  void chrome.storage?.local.set({ [STORAGE_KEYS.uiDark]: dark }).catch(() => {})
}

export function ThemeApplicator() {
  const settings = useSettings()
  const previousTheme = useRef<boolean | null>(null)
  const previousPalette = useRef<string | null>(null)

  useEffect(() => {
    const root = document.documentElement
    if (!settings) {
      root.dataset.density = 'comfortable'
      return
    }
    let transitionTimer: number | undefined
    const apply = () => {
      const dark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      const palette = settings.palette ?? DEFAULT_PALETTE
      const themeChanged = previousTheme.current !== null && previousTheme.current !== dark
      const paletteChanged = previousPalette.current !== null && previousPalette.current !== palette
      if (themeChanged || paletteChanged) {
        root.classList.add('theme-transition')
        window.clearTimeout(transitionTimer)
        transitionTimer = window.setTimeout(() => root.classList.remove('theme-transition'), 300)
      }
      root.classList.toggle('dark', dark)
      root.dataset.palette = palette
      applyFavicon(palette, dark)
      shareDark(dark)
      root.dataset.density = settings.density ?? 'comfortable'
      writeThemeBootCache({
        dark,
        palette,
        density: settings.density ?? 'comfortable',
      })
      previousTheme.current = dark
      previousPalette.current = palette
    }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    window.addEventListener(TOOLBOX_RESTORE_THEME_EVENT, apply)
    return () => {
      media.removeEventListener('change', apply)
      window.removeEventListener(TOOLBOX_RESTORE_THEME_EVENT, apply)
      window.clearTimeout(transitionTimer)
    }
  }, [settings])

  return null
}
