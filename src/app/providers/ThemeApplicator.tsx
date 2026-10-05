import { useEffect } from 'react'

import { useSettings } from '@/shared/hooks/useSettings'

export function ThemeApplicator() {
  const settings = useSettings()

  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    const apply = () => {
      const dark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.classList.toggle('dark', dark)
    }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings])

  return null
}
