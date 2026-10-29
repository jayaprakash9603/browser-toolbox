import { DownloadIcon, RefreshCwIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TECH_CATEGORIES } from '@/core/engines/techStack/categories'
import { TECH_RULE_COUNT } from '@/core/engines/techStack/detect'
import { techScanFilename, techScanToCsv } from '@/core/engines/techStack/export'
import type { TechScan } from '@/core/engines/techStack/types'
import { SiteAccessBar } from '@/features/site-access/SiteAccessBar'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/utils/cn'

import { downloadCsv, TECH_STACK_FEEDBACK_URL } from '../download'
import '../i18n'
import { useTechScan, type TechScanState } from '../useTechScan'

import { MoreInfoTab } from './MoreInfoTab'
import { TechScanHero } from './TechScanHero'
import { TechnologiesTab } from './TechnologiesTab'

const SKELETON_ROWS = 5

type ViewTab = 'technologies' | 'more'

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function LoadingRows() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-busy="true" aria-label={t('techStack.scanning')} className="flex flex-col gap-3">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex items-center gap-2.5">
          <Skeleton className="size-8 shrink-0 rounded-full" />
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
      <TabsContent value="technologies">
        {scan.hits.length > 0 ? (
          <TechnologiesTab hits={scan.hits} />
        ) : (
          <p className="text-xs text-muted-foreground">{t('web.techStack.empty')}</p>
        )}
      </TabsContent>
      <TabsContent value="more">
        <MoreInfoTab scan={scan} />
      </TabsContent>
    </>
  )
}

function Body({ state, onRetry }: { state: TechScanState; onRetry: () => void }) {
  const { t } = useTranslation()
  if (state.scan) return <ScanResult scan={state.scan} />
  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2 text-xs text-muted-foreground">
        <p>{t(state.errorKey)}</p>
        <Button size="xs" variant="outline" onClick={onRetry}>
          <RefreshCwIcon /> {t('common.tryAgain')}
        </Button>
      </div>
    )
  }
  return <LoadingRows />
}

function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-4 py-2 text-[11px] text-muted-foreground">
      <a
        href={TECH_STACK_FEEDBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        {t('techStack.missing')}
      </a>
      <span>{t('techStack.coverage', { count: TECH_RULE_COUNT, categories: TECH_CATEGORIES.length })}</span>
    </footer>
  )
}

interface TechStackViewProps {
  /** The popover scrolls on its own; the tool page lets its container scroll. */
  scrollable?: boolean
  /** Tool pages already render the access prompt above their content. */
  showAccessPrompt?: boolean
}

export function TechStackView({ scrollable = false, showAccessPrompt = false }: TechStackViewProps) {
  const { t } = useTranslation()
  const { state, rescan } = useTechScan()
  const [tab, setTab] = useState<ViewTab>('technologies')
  const scan = state.scan
  const isLoading = state.status === 'loading'

  const exportCsv = () => {
    if (scan) downloadCsv(techScanToCsv(scan), techScanFilename(scan))
  }

  return (
    <div className="@container flex min-h-0 flex-1 flex-col">
      {showAccessPrompt && <SiteAccessBar />}
      <Tabs value={tab} onValueChange={(value) => setTab(value as ViewTab)} className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b pr-3">
          <TabsList variant="underline" className="min-w-0">
            <TabsTrigger value="technologies" className="text-[11px] font-semibold tracking-wider uppercase">
              {t('techStack.tab.technologies')}
            </TabsTrigger>
            <TabsTrigger value="more" className="text-[11px] font-semibold tracking-wider uppercase">
              {t('techStack.tab.moreInfo')}
            </TabsTrigger>
          </TabsList>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button size="icon-xs" variant="ghost" aria-label={t('techStack.refresh')} title={t('techStack.refresh')} onClick={rescan}>
              <RefreshCwIcon className={cn(isLoading && 'animate-spin motion-reduce:animate-none')} />
            </Button>
            <Button
              size="xs"
              variant="outline"
              aria-label={t('techStack.exportLabel')}
              disabled={!scan || scan.hits.length === 0}
              onClick={exportCsv}
            >
              <DownloadIcon /> {t('techStack.export')}
            </Button>
          </div>
        </div>
        <div className={cn('px-4 py-3', scrollable && 'min-h-0 flex-1 overflow-y-auto overscroll-contain')}>
          <TechScanHero
            host={scan ? hostOf(scan.url) : ''}
            count={scan?.hits.length ?? null}
            loading={isLoading}
          />
          <Body state={state} onRetry={rescan} />
        </div>
      </Tabs>
      <Footer />
    </div>
  )
}
