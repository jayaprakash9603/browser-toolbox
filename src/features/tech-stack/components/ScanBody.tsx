import { RefreshCwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { TechScan } from '@/core/engines/techStack/types'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { TabsContent } from '@/shared/components/ui/tabs'

import type { TechScanState } from '../useTechScan'
import { MoreInfoTab } from './MoreInfoTab'
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

function ScanResult({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  return (
    <>
      <TabsContent value="technologies" className="gap-0">
        {scan.hits.length > 0 ? (
          <TechnologiesTab hits={scan.hits} />
        ) : (
          <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            {t('web.techStack.empty')}
          </p>
        )}
      </TabsContent>
      <TabsContent value="more" className="gap-0">
        <MoreInfoTab scan={scan} />
      </TabsContent>
    </>
  )
}

export function ScanBody({ state, onRetry }: { state: TechScanState; onRetry: () => void }) {
  const { t } = useTranslation()
  if (state.scan) return <ScanResult scan={state.scan} />
  if (state.status === 'error') {
    return (
      <ScanSection className="flex flex-col items-start gap-2 text-xs text-muted-foreground">
        <p>{t(state.errorKey)}</p>
        <Button size="xs" variant="outline" onClick={onRetry}>
          <RefreshCwIcon /> {t('common.tryAgain')}
        </Button>
      </ScanSection>
    )
  }
  return <LoadingRows />
}
