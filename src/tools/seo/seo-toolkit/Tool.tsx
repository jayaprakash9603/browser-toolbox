import { useTranslation } from 'react-i18next'
import { RefreshCwIcon } from 'lucide-react'

import { exportChecksJson } from '@/core/engines/seo'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CopyButton } from '@/shared/components/CopyButton'
import { cn } from '@/shared/utils/cn'
import { useSeoTool } from '../_shared'
import { useSeoReport } from './useSeoReport'
import { ScoreRing, seoTabEnterClass } from './components'
import { SeoReportSkeleton } from './SeoLoadingSkeleton'
import { OverviewTab } from './tabs/OverviewTab'
import { ContentTab } from './tabs/ContentTab'
import { HeadingsTab } from './tabs/HeadingsTab'
import { LinksTab } from './tabs/LinksTab'
import { ImagesTab } from './tabs/ImagesTab'
import { SchemaTab } from './tabs/SchemaTab'
import { SocialTab } from './tabs/SocialTab'
import { PerformanceTab } from './tabs/PerformanceTab'
import { IssuesTab } from './tabs/IssuesTab'
import { AdvancedTab } from './tabs/AdvancedTab'

const TAB_IDS = [
  'overview',
  'content',
  'headings',
  'links',
  'images',
  'schema',
  'social',
  'performance',
  'issues',
  'advanced',
] as const

type TabId = (typeof TAB_IDS)[number]

const TAB_LABELS: Record<TabId, string> = {
  overview: 'seo.tabOverview',
  content: 'seo.tabContent',
  headings: 'seo.tabHeadings',
  links: 'seo.tabLinks',
  images: 'seo.tabImages',
  schema: 'seo.tabSchema',
  social: 'seo.tabSocial',
  performance: 'seo.tabPerformance',
  issues: 'seo.tabIssues',
  advanced: 'seo.tabAdvanced',
}

function scoreTone(score: number): string {
  if (score >= 80) return 'border-green-500/30 bg-green-500/5'
  if (score >= 50) return 'border-amber-500/30 bg-amber-500/5'
  return 'border-red-500/30 bg-red-500/5'
}

export default function SeoToolkitTool() {
  const { t } = useTranslation()
  const tool = useSeoTool('seo.toolkit')
  const [tab, setTab] = useDeepLinkTab('tab', TAB_IDS, 'overview')
  const { report, loading, errorKey, refresh } = useSeoReport()

  const score = report?.score ?? 0
  const issueCount = report
    ? report.checks.filter((c) => c.weight > 0 && !c.ok && c.severity !== 'notice').length
    : 0

  return (
    <ToolPage tool={tool}>
      {loading ? (
        <SeoReportSkeleton />
      ) : !report ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-xs text-muted-foreground">
          {t(errorKey ?? 'seo.noPage')}
        </p>
      ) : (
        <div
          className="flex flex-col gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-reduce:animate-none"
        >
          <div
            className={cn(
              'flex items-center justify-between gap-3 rounded-xl border p-3 shadow-xs',
              scoreTone(score),
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <ScoreRing score={score} />
              <div className="min-w-0">
                <p className="text-xs font-semibold">{t('seo.score')}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={
                      score >= 80
                        ? 'border-green-500/40 text-green-700 dark:text-green-400'
                        : score >= 50
                          ? 'border-amber-500/40 text-amber-700 dark:text-amber-400'
                          : 'border-red-500/40 text-red-700 dark:text-red-400'
                    }
                  >
                    {score}/100
                  </Badge>
                  {issueCount > 0 && (
                    <Badge variant="outline" className="border-amber-500/40 text-[10px]">
                      {t('seo.issueCount', { count: issueCount })}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <CopyButton text={exportChecksJson(report.checks)} label={t('seo.exportJson')} />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => void refresh()}
                aria-label={t('seo.refresh')}
              >
                <RefreshCwIcon className="size-3.5" />
              </Button>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
            <div className="sticky top-[calc(var(--density-page-pad)*-1)] z-10 -mx-[var(--density-page-pad)] -mt-2 bg-background/90 px-[var(--density-page-pad)] pt-2 backdrop-blur-md">
              <TabsList fullWidth className="justify-start gap-0.5">
                {TAB_IDS.map((id) => (
                  <TabsTrigger
                    key={id}
                    value={id}
                    className="shrink-0 px-2.5 text-xs"
                    count={id === 'issues' && issueCount > 0 ? issueCount : undefined}
                  >
                    {t(TAB_LABELS[id])}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="overview" className={seoTabEnterClass}>
              <OverviewTab report={report} />
            </TabsContent>
            <TabsContent value="content" className={seoTabEnterClass}>
              <ContentTab report={report} />
            </TabsContent>
            <TabsContent value="headings" className={seoTabEnterClass}>
              <HeadingsTab report={report} />
            </TabsContent>
            <TabsContent value="links" className={seoTabEnterClass}>
              <LinksTab report={report} />
            </TabsContent>
            <TabsContent value="images" className={seoTabEnterClass}>
              <ImagesTab report={report} />
            </TabsContent>
            <TabsContent value="schema" className={seoTabEnterClass}>
              <SchemaTab report={report} />
            </TabsContent>
            <TabsContent value="social" className={seoTabEnterClass}>
              <SocialTab report={report} />
            </TabsContent>
            <TabsContent value="performance" className={seoTabEnterClass}>
              <PerformanceTab report={report} />
            </TabsContent>
            <TabsContent value="issues" className={seoTabEnterClass}>
              <IssuesTab report={report} />
            </TabsContent>
            <TabsContent value="advanced" className={seoTabEnterClass}>
              <AdvancedTab report={report} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </ToolPage>
  )
}
