import { MoonIcon, SunIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { updateSettings } from '@/features/settings/settingsService'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setDark(root.classList.contains('dark')))
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const { t } = useTranslation()
  const label = dark ? t('theme.switchToLight') : t('theme.switchToDark')

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={() => void updateSettings({ theme: dark ? 'light' : 'dark' })}
        >
          <span className="relative flex size-4 items-center justify-center">
            <SunIcon className="theme-switch-icon theme-sun" />
            <MoonIcon className="theme-switch-icon theme-moon" />
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}