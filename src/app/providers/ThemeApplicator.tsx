import { useEffect, useRef } from 'react'

import { useSettings } from '@/shared/hooks/useSettings'

export function ThemeApplicator() {
  const settings = useSettings()
  const previousTheme = useRef<boolean | null>(null)

  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    let transitionTimer: number | undefined
    const apply = () => {
      const dark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      const changed = previousTheme.current !== null && previousTheme.current !== dark
      if (changed) {
        root.classList.add('theme-transition')
        window.clearTimeout(transitionTimer)
        transitionTimer = window.setTimeout(() => root.classList.remove('theme-transition'), 300)
      }
      root.classList.toggle('dark', dark)
      previousTheme.current = dark
    }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => {
      media.removeEventListener('change', apply)
      window.clearTimeout(transitionTimer)
    }
  }, [settings])

  return null
}
