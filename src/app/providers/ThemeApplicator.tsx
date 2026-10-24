import { useEffect, useRef } from 'react'

import { TOOLBOX_RESTORE_THEME_EVENT } from '@/features/api-client/themeEvents'
import { useSettings } from '@/shared/hooks/useSettings'
import { writeThemeBootCache } from '@/shared/lib/themeBootCache'
import { DEFAULT_PALETTE, paletteIconPaths, type PaletteId } from '@/shared/lib/theme/palettes'

function applyFavicon(palette: PaletteId): void {
  const paths = paletteIconPaths(palette)
  for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')) {
    const size = link.sizes.value.split('x')[0] as keyof typeof paths
    if (paths[size]) link.href = `/${paths[size]}`
  }
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
      applyFavicon(palette)
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
