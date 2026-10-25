import { XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
    <div className="rounded-lg border bg-muted/40 p-3 text-xs">
      <div className="flex gap-2">
        <p className="flex-1 text-muted-foreground">{tip}</p>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onDismiss} aria-label={t('scriptStudio.guide.dismiss')}>
          <XIcon className="size-4" />
        </Button>
      </div>
      <button type="button" className="mt-2 text-[11px] text-primary underline-offset-2 hover:underline" onClick={onDisableAll}>
        {t('scriptStudio.guide.disable')}
      </button>
    </div>
  )
}
