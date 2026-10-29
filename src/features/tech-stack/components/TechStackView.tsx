import { RefreshCwIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { techScanFilename, techScanToCsv } from '@/core/engines/techStack/export'
import { SiteAccessBar } from '@/features/site-access/SiteAccessBar'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/utils/cn'

import { scanAccent } from '../categoryStyle'
import { downloadCsv } from '../download'
import '../i18n'
import { useTechScan } from '../useTechScan'
import { ScanBody } from './ScanBody'
import { ScanFooter } from './ScanFooter'
import { ScanMetrics } from './ScanMetrics'
import { ScanSection } from './ScanSection'
import { TechScanHero } from './TechScanHero'

type ViewTab = 'technologies' | 'more'

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
  const [tab, setTab] = useState<ViewTab>('technologies')
  const reduce = useReducedMotion()
  const scan = state.scan
  const isLoading = state.status === 'loading'
  const accent = scanAccent(state.status === 'error' ? 'error' : isLoading ? 'loading' : 'ready', scan?.hits.length ?? 0)

  const exportCsv = () => {
    if (scan) downloadCsv(techScanToCsv(scan), techScanFilename(scan))
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
        <Tabs value={tab} onValueChange={(value) => setTab(value as ViewTab)} className="flex min-h-0 flex-1 flex-col gap-0">
          <TechScanHero
            host={scan ? hostOf(scan.url) : ''}
            count={scan?.hits.length ?? null}
            loading={isLoading}
            accent={accent}
          />
          {scan && <ScanMetrics scan={scan} />}
          <ScanSection className="flex shrink-0 items-center justify-between gap-2 px-3.5 pt-3">
            <TabsList className="min-w-0">
              <TabsTrigger value="technologies" count={scan?.hits.length} className="text-xs">
                {t('techStack.tab.technologies')}
              </TabsTrigger>
              <TabsTrigger value="more" className="text-xs">
                {t('techStack.tab.moreInfo')}
              </TabsTrigger>
            </TabsList>
            <Button
              size="icon-sm"
              variant="ghost"
              className="size-8 shrink-0"
              aria-label={t('techStack.refresh')}
              title={t('techStack.refresh')}
              onClick={rescan}
            >
              <RefreshCwIcon className={cn('size-4', isLoading && 'animate-spin motion-reduce:animate-none')} />
            </Button>
          </ScanSection>
          <div className={cn('px-3.5 pt-3 pb-1', scrollable && 'min-h-0 flex-1 overflow-y-auto overscroll-contain')}>
            <ScanBody state={state} onRetry={rescan} />
          </div>
        </Tabs>
        <ScanFooter
          canExport={Boolean(scan && scan.hits.length > 0)}
          showOpen={Boolean(onNavigate)}
          onExport={exportCsv}
          onNavigate={onNavigate}
        />
      </motion.div>
    </div>
  )
}
