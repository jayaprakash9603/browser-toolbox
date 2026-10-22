import { useTranslation } from 'react-i18next'
import { FileArchiveIcon, FileCodeIcon, FileTextIcon, ImageIcon } from 'lucide-react'

import {
  BUNDLE_PHASES as PHASES,
  overallPercent,
  type BundleProgressEvent,
} from '@/core/htmlBundleJob'
import { LongTaskProgress, type LongTaskStep } from '@/shared/components/LongTaskProgress'
import { formatElapsedSeconds as formatDuration } from '@/shared/utils/formatElapsedSeconds'

export { formatDuration }

const FLYING_ICONS = [FileTextIcon, FileCodeIcon, ImageIcon]

interface BundleProgressProps {
  active: boolean
  pageCount: number
  progress: BundleProgressEvent | null
  startedAt?: number
  runsInBackground?: boolean
  onCancel?: () => void
}

export function BundleProgress({
  active,
  pageCount,
  progress,
  startedAt,
  runsInBackground = false,
  onCancel,
}: BundleProgressProps) {
  const { t } = useTranslation()

  const percent = overallPercent(progress)
  const phaseIndex = progress ? PHASES.findIndex((item) => item.id === progress.phase) : 0

  const detail = (() => {
    if (!progress) return t('htmlBundle.phaseStarting')
    const counts = { done: progress.done, total: progress.total }
    switch (progress.phase) {
      case 'pages':
        return t('htmlBundle.detailPages', counts)
      case 'assets':
        return progress.total > 0 ? t('htmlBundle.detailAssets', counts) : t('htmlBundle.detailAssetsScan')
      case 'zip':
        return t('htmlBundle.detailZip')
      case 'transfer':
        return t('htmlBundle.detailTransfer')
    }
  })()

  const steps: LongTaskStep[] = PHASES.map((phase, index) => {
    const state = index < phaseIndex ? 'done' : index === phaseIndex ? 'current' : 'todo'
    return { id: phase.id, label: t(phase.label), state }
  })

  return (
    <LongTaskProgress
      active={active}
      title={t('htmlBundle.preparing', { count: pageCount })}
      percent={percent}
      detail={detail}
      detailKey={progress?.phase ?? 'start'}
      startedAt={startedAt}
      centerIcon={FileArchiveIcon}
      flyingIcons={FLYING_ICONS}
      steps={steps}
      layout="auto"
      hint={runsInBackground ? t('htmlBundle.backgroundHint') : t('htmlBundle.keepOpenHint')}
      onCancel={onCancel}
      cancelLabel={t('htmlBundle.cancel')}
    />
  )
}
