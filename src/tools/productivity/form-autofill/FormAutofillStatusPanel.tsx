import { useTranslation } from 'react-i18next'
import {
  BookmarkIcon,
  InboxIcon,
  PauseCircleIcon,
  SparklesIcon,
  ToggleRightIcon,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

type PanelProps = {
  className?: string
  onPrimary?: () => void
}

function StatusShell({
  icon: Icon,
  tone,
  title,
  body,
  primaryLabel,
  onPrimary,
  className,
}: {
  icon: typeof InboxIcon
  tone: 'muted' | 'amber' | 'primary'
  title: string
  body: string
  primaryLabel?: string
  onPrimary?: () => void
  className?: string
}) {
  const toneIcon =
    tone === 'amber'
      ? 'bg-amber-500/12 text-amber-800 dark:text-amber-200'
      : tone === 'primary'
        ? 'bg-primary/10 text-primary'
        : 'bg-muted text-muted-foreground'

  return (
    <div
      className={cn(
        'mx-3 flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center',
        className,
      )}
    >
      <span
        className={cn('mb-3 flex size-12 items-center justify-center rounded-2xl', toneIcon)}
        aria-hidden
      >
        <Icon className="size-6" />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{body}</p>
      {primaryLabel && onPrimary && (
        <Button type="button" size="sm" className="mt-4" onClick={onPrimary}>
          {primaryLabel}
        </Button>
      )}
    </div>
  )
}

/** Shown on This page when the master switch is off — no SDK connect / spinner. */
export function AutofillOffPanel({ onEnable, className }: PanelProps & { onEnable: () => void }) {
  const { t } = useTranslation()
  return (
    <StatusShell
      icon={PauseCircleIcon}
      tone="amber"
      title={t('formMemory.tool.offTitle')}
      body={t('formMemory.tool.offBody')}
      primaryLabel={t('formMemory.tool.turnOn')}
      onPrimary={onEnable}
      className={className}
    />
  )
}

/** Review tab when autofill is fully off. */
export function ReviewAutofillOffPanel({ onEnable, className }: PanelProps & { onEnable: () => void }) {
  const { t } = useTranslation()
  return (
    <StatusShell
      icon={InboxIcon}
      tone="muted"
      title={t('formMemory.review.offTitle')}
      body={t('formMemory.review.offBody')}
      primaryLabel={t('formMemory.tool.turnOn')}
      onPrimary={onEnable}
      className={className}
    />
  )
}

/** Review tab when remembering new entries is off (default). */
export function ReviewCaptureOffPanel({ onEnableLearn, className }: PanelProps & { onEnableLearn: () => void }) {
  const { t } = useTranslation()
  return (
    <StatusShell
      icon={SparklesIcon}
      tone="primary"
      title={t('formMemory.review.captureOffTitle')}
      body={t('formMemory.review.captureOffBody')}
      primaryLabel={t('formMemory.review.enableCapture')}
      onPrimary={onEnableLearn}
      className={className}
    />
  )
}

/** Review tab — capture off but existing queue remains. */
export function ReviewCaptureOffBanner({
  onEnableLearn,
  className,
}: PanelProps & { onEnableLearn: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'mx-3 mt-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-left',
        className,
      )}
      role="status"
    >
      <p className="min-w-0 flex-1 text-xs leading-snug text-foreground">{t('formMemory.review.captureOffBody')}</p>
      <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={onEnableLearn}>
        {t('formMemory.review.enableCapture')}
      </Button>
    </div>
  )
}

/** Saved tab hint when autofill is off — browse only. */
export function SavedBrowseHint({ className }: PanelProps) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'mx-3 mb-2 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-left',
        className,
      )}
      role="status"
    >
      <ToggleRightIcon className="mt-0.5 size-4 shrink-0 text-amber-800 dark:text-amber-200" aria-hidden />
      <p className="text-xs leading-snug text-amber-900 dark:text-amber-100">{t('formMemory.saved.browseWhileOff')}</p>
    </div>
  )
}

export function SavedOffEmptyHint({ className }: PanelProps) {
  const { t } = useTranslation()
  return (
    <StatusShell
      icon={BookmarkIcon}
      tone="muted"
      title={t('formMemory.saved.offTitle')}
      body={t('formMemory.saved.offBody')}
      className={className}
    />
  )
}
