import { LightbulbIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'

type Props = {
  tip: string
  show: boolean
  onDismiss: () => void
  onDisableAll: () => void
}

export function StudioGuide({ tip, show, onDismiss, onDisableAll }: Props) {
  const { t } = useTranslation()
  if (!show) return null
  return (
    <Alert>
      <LightbulbIcon />
      <AlertTitle className="flex items-start justify-between gap-2">
        <span className="line-clamp-none flex-1 font-normal">{tip}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onDismiss}
          aria-label={t('scriptStudio.guide.dismiss')}
        >
          <XIcon className="size-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>
        <button
          type="button"
          className="text-xs text-primary underline-offset-2 hover:underline"
          onClick={onDisableAll}
        >
          {t('scriptStudio.guide.disable')}
        </button>
      </AlertDescription>
    </Alert>
  )
}
