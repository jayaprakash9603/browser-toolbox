import { RefreshCwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

import type { TechScanState } from '../useTechScan'
import { ScanSection } from './ScanSection'
import { TechnologiesTab } from './TechnologiesTab'

const SKELETON_ROWS = 5

function LoadingRows() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-busy="true" aria-label={t('techStack.scanning')} className="flex flex-col gap-2">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex items-center gap-2.5 rounded-xl border bg-card px-2.5 py-2">
          <Skeleton className="size-8 shrink-0 rounded-xl" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

export function ScanBody({ state, onRetry }: { state: TechScanState; onRetry: () => void }) {
  const { t } = useTranslation()
  if (state.scan) {
    if (state.scan.hits.length === 0) {
      return (
        <ScanSection>
          <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            {t('web.techStack.empty')}
          </p>
        </ScanSection>
      )
    }
    return (
      <ScanSection>
        <TechnologiesTab hits={state.scan.hits} />
      </ScanSection>
    )
  }
  if (state.status === 'error') {
    return (
      <ScanSection className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
        <p>{t(state.errorKey)}</p>
        <Button size="xs" variant="outline" onClick={onRetry}>
          <RefreshCwIcon /> {t('common.tryAgain')}
        </Button>
      </ScanSection>
    )
  }
  return <LoadingRows />
}
