import { RefreshCwIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { groupHitsByCategory } from '@/core/engines/techStack/detect'
import { techScanFilename, techScanToCsv, techScanToJson } from '@/core/engines/techStack/export'
import { httpVersionLabel } from '@/core/engines/techStack/moreInfo'
import { SiteAccessBar } from '@/features/site-access/SiteAccessBar'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { scanAccent } from '../categoryStyle'
import { downloadCsv, downloadJson } from '../download'
import '../i18n'
import { useTechScan } from '../useTechScan'
import { ScanBody } from './ScanBody'
import { ScanFooter } from './ScanFooter'
import { TechScanHero } from './TechScanHero'

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

interface TechStackViewProps {
  /** The popover scrolls on its own; the tool page lets its container scroll. */
  scrollable?: boolean
  /** Tool pages already render the access prompt above their content. */
  showAccessPrompt?: boolean
  onNavigate?: () => void
}

export function TechStackView({
  scrollable = false,
  showAccessPrompt = false,
  onNavigate,
}: TechStackViewProps) {
  const { t } = useTranslation()
  const { state, rescan } = useTechScan()
  const reduce = useReducedMotion()
  const scan = state.scan
  const isLoading = state.status === 'loading'
  const accent = scanAccent(state.status === 'error' ? 'error' : isLoading ? 'loading' : 'ready', scan?.hits.length ?? 0)
  const categoryCount = useMemo(() => (scan ? groupHitsByCategory(scan.hits).length : 0), [scan])

  const exportCsv = () => {
    if (scan) downloadCsv(techScanToCsv(scan), techScanFilename(scan, 'csv'))
  }
  const exportJson = () => {
    if (scan) downloadJson(techScanToJson(scan), techScanFilename(scan, 'json'))
  }

  return (
    <div className={cn('@container flex min-h-0 flex-1 flex-col', !scrollable && 'p-3')}>
      {showAccessPrompt && <SiteAccessBar />}
      <motion.div
        className="flex min-h-0 flex-1 flex-col"
        initial={reduce ? false : 'hidden'}
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } } }}
      >
        <TechScanHero
          host={scan ? hostOf(scan.url) : ''}
          count={scan?.hits.length ?? null}
          loading={isLoading}
          accent={accent}
          metrics={
            scan && !isLoading
              ? {
                  technologies: scan.hits.length,
                  categories: categoryCount,
                  protocol: httpVersionLabel(scan.protocol) ?? '—',
                }
              : null
          }
          actions={
            <Button
              size="icon-sm"
              variant="ghost"
              className="size-8 shrink-0 text-foreground"
              aria-label={t('techStack.refresh')}
              title={t('techStack.refresh')}
              onClick={rescan}
            >
              <RefreshCwIcon className={cn('size-4', isLoading && 'animate-spin motion-reduce:animate-none')} />
            </Button>
          }
        />
        <div className={cn('px-3.5 pt-3 pb-1', scrollable && 'min-h-0 flex-1 overflow-y-auto overscroll-contain')}>
          <ScanBody state={state} onRetry={rescan} />
        </div>
        <ScanFooter
          canExport={Boolean(scan && scan.hits.length > 0)}
          showOpen={Boolean(onNavigate)}
          onExportCsv={exportCsv}
          onExportJson={exportJson}
          onNavigate={onNavigate}
        />
      </motion.div>
    </div>
  )
}
