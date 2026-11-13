import { CircleAlertIcon, CirclePauseIcon, LoaderIcon, ShieldAlertIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { CaptureStatus } from '@/core/interceptor/apiFinderTypes'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

const STATUS_ICON = {
  capturing: LoaderIcon,
  paused: CirclePauseIcon,
  permissionRequired: ShieldAlertIcon,
  unsupported: CircleAlertIcon,
  error: CircleAlertIcon,
} as const

export function CaptureStatusBar({
  status,
  capturePaused,
  onToggleCapture,
  className,
}: {
  status: CaptureStatus
  capturePaused: boolean
  onToggleCapture?: (paused: boolean) => void
  className?: string
}) {
  const { t } = useTranslation()
  const Icon = STATUS_ICON[status]
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-[11px]', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium',
          status === 'capturing' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
          status === 'paused' && 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
          status === 'permissionRequired' && 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300',
          (status === 'error' || status === 'unsupported') && 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300',
        )}
      >
        <Icon className={cn('size-3', status === 'capturing' && 'animate-spin')} aria-hidden />
        {t(`interceptor.capture.${status}`)}
      </span>
      {onToggleCapture && (status === 'capturing' || status === 'paused') && (
        <Button type="button" variant="ghost" size="xs" onClick={() => onToggleCapture(!capturePaused)}>
          {capturePaused ? t('interceptor.capture.resume') : t('interceptor.capture.pause')}
        </Button>
      )}
    </div>
  )
}
