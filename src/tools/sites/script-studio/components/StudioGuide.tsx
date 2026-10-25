import { LightbulbIcon, XIcon } from 'lucide-react'
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
    <div role="note" className="flex items-start gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
      <LightbulbIcon className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden />
      <p className="min-w-0 flex-1 leading-relaxed">
        {tip}{' '}
        <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={onDisableAll}>
          {t('scriptStudio.guide.disable')}
        </button>
      </p>
      <Button variant="ghost" size="icon-xs" className="shrink-0" onClick={onDismiss} aria-label={t('scriptStudio.guide.dismiss')}>
        <XIcon className="size-3.5" />
      </Button>
    </div>
  )
}
