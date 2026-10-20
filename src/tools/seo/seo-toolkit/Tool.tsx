import { useTranslation } from 'react-i18next'
import { RefreshCwIcon } from 'lucide-react'

import { exportChecksJson } from '@/core/engines/seo'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CopyButton } from '@/shared/components/CopyButton'
import { useSeoTool } from '../_shared'
import { useSeoReport } from './useSeoReport'
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
        <p className="text-xs text-muted-foreground">{t('nav.loading')}</p>
      ) : !report ? (
        <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
          {t(errorKey ?? 'seo.noPage')}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{t('seo.score')}</span>
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
            <div className="flex items-center gap-1">
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

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-0.5">
              <TabsTrigger value="overview" className="text-[10px]">{t('seo.tabOverview')}</TabsTrigger>
              <TabsTrigger value="content" className="text-[10px]">{t('seo.tabContent')}</TabsTrigger>
              <TabsTrigger value="headings" className="text-[10px]">{t('seo.tabHeadings')}</TabsTrigger>
              <TabsTrigger value="links" className="text-[10px]">{t('seo.tabLinks')}</TabsTrigger>
              <TabsTrigger value="images" className="text-[10px]">{t('seo.tabImages')}</TabsTrigger>
              <TabsTrigger value="schema" className="text-[10px]">{t('seo.tabSchema')}</TabsTrigger>
              <TabsTrigger value="social" className="text-[10px]">{t('seo.tabSocial')}</TabsTrigger>
              <TabsTrigger value="performance" className="text-[10px]">{t('seo.tabPerformance')}</TabsTrigger>
              <TabsTrigger value="issues" className="text-[10px]">{t('seo.tabIssues')}</TabsTrigger>
              <TabsTrigger value="advanced" className="text-[10px]">{t('seo.tabAdvanced')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-2">
              <OverviewTab report={report} />
            </TabsContent>
            <TabsContent value="content" className="mt-2">
              <ContentTab report={report} />
            </TabsContent>
            <TabsContent value="headings" className="mt-2">
              <HeadingsTab report={report} />
            </TabsContent>
            <TabsContent value="links" className="mt-2">
              <LinksTab report={report} />
            </TabsContent>
            <TabsContent value="images" className="mt-2">
              <ImagesTab report={report} />
            </TabsContent>
            <TabsContent value="schema" className="mt-2">
              <SchemaTab report={report} />
            </TabsContent>
            <TabsContent value="social" className="mt-2">
              <SocialTab report={report} />
            </TabsContent>
            <TabsContent value="performance" className="mt-2">
              <PerformanceTab report={report} />
            </TabsContent>
            <TabsContent value="issues" className="mt-2">
              <IssuesTab report={report} />
            </TabsContent>
            <TabsContent value="advanced" className="mt-2">
              <AdvancedTab report={report} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </ToolPage>
  )
}
