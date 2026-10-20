import { useEffect, useState } from 'react'

import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useTranslation } from 'react-i18next'
import { CheckCircle2Icon, AlertTriangleIcon, XCircleIcon } from 'lucide-react'

import {
  analyzeHeadings,
  analyzeImages,
  analyzeLinks,
  analyzeSeo,
  type SeoCheck,
} from '@/core/engines/seo'
import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CopyButton } from '@/shared/components/CopyButton'
import { useSeoTool, getPageInfo } from '../_shared'
import type { PageInfo } from '@/chrome/content/index'

export default function SeoToolkitTool() {
  const { t } = useTranslation()
  const tool = useSeoTool('seo.toolkit')
  const [tab, setTab] = useDeepLinkTab(
    'tab',
    ['checks', 'headings', 'links', 'images', 'meta'] as const,
    'checks',
  )
  const [page, setPage] = useState<PageInfo | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let live = true
    void getPageInfo()
      .then((value) => {
        if (live) setPage(value)
      })
      .finally(() => {
        if (live) setLoaded(true)
      })
    return () => {
      live = false
    }
  }, [])

  const checks = page ? analyzeSeo(page) : []
  const headingIssues = page ? analyzeHeadings(page.headings) : []
  const linkStats = page ? analyzeLinks(page.links) : null
  const imageStats = page ? analyzeImages(page.images) : null
  const score = checks.length
    ? Math.round((checks.filter((c) => c.ok).length / checks.length) * 100)
    : 0

  return (
    <ToolPage tool={tool}>
      {!loaded ? (
        <p className="text-xs text-muted-foreground">{t('nav.loading')}</p>
      ) : !page ? (
        <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
          {t('seo.noPage')}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-md border bg-muted/40 p-2.5">
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
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="checks">{t('seo.tabChecks')}</TabsTrigger>
              <TabsTrigger value="headings">{t('seo.tabHeadings')}</TabsTrigger>
              <TabsTrigger value="links">{t('seo.tabLinks')}</TabsTrigger>
              <TabsTrigger value="images">{t('seo.tabImages')}</TabsTrigger>
              <TabsTrigger value="meta">{t('seo.tabMeta')}</TabsTrigger>
            </TabsList>

            <TabsContent value="checks" className="mt-2 space-y-1">
              {checks.map((check) => (
                <CheckRow key={check.id} check={check} />
              ))}
            </TabsContent>

            <TabsContent value="headings" className="mt-2">
              {headingIssues.length === 0 ? (
                <p className="rounded border border-green-500/40 bg-green-500/5 p-2 text-[11px] text-green-700 dark:text-green-400">
                  {t('seo.headingsOk')}
                </p>
              ) : (
                <div className="space-y-1">
                  {headingIssues.map((issue, i) => (
                    <IssueRow key={i} severity={issue.severity} message={issue.message} />
                  ))}
                </div>
              )}
              <div className="mt-2 space-y-0.5">
                {page.headings.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 font-mono text-[11px]"
                    style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                  >
                    <Badge variant="outline" className="text-[11px]">
                      h{h.level}
                    </Badge>
                    <span className="truncate">{h.text || '(empty)'}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="links" className="mt-2">
              {linkStats && (
                <div className="grid grid-cols-2 gap-1.5">
                  <Stat label={t('seo.totalLinks')} value={linkStats.total} />
                  <Stat label={t('seo.internal')} value={linkStats.internal} />
                  <Stat label={t('seo.external')} value={linkStats.external} />
                  <Stat label={t('seo.emptyAnchors')} value={linkStats.emptyAnchors} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="images" className="mt-2">
              {imageStats && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <Stat label={t('seo.totalImages')} value={imageStats.total} />
                    <Stat
                      label={t('seo.missingAlt')}
                      value={imageStats.missingAlt}
                      warn={imageStats.missingAlt > 0}
                    />
                  </div>
                  {imageStats.missingAlt > 0 && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      {t('seo.missingAltHint', { count: imageStats.missingAlt })}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="meta" className="mt-2 space-y-1">
              <MetaRow label="Title" value={page.title} />
              <MetaRow label="Description" value={page.metaDescription} />
              <MetaRow label="Canonical" value={page.canonical} />
              {Object.entries(page.openGraph).map(([k, v]) => (
                <MetaRow key={k} label={k} value={v} />
              ))}
              {Object.entries(page.twitter).map(([k, v]) => (
                <MetaRow key={k} label={k} value={v} />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </ToolPage>
  )
}

function CheckRow({ check }: { check: SeoCheck }) {
  const Icon =
    check.severity === 'ok'
      ? CheckCircle2Icon
      : check.severity === 'warning'
        ? AlertTriangleIcon
        : XCircleIcon
  const cls =
    check.severity === 'ok'
      ? 'text-green-600 dark:text-green-400'
      : check.severity === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'
  return (
    <div className="flex items-start gap-1.5 rounded border p-1.5">
      <Icon className={`mt-0.5 size-3.5 shrink-0 ${cls}`} />
      <p className="text-[11px]">{check.message}</p>
    </div>
  )
}

function IssueRow({ severity, message }: { severity: 'error' | 'warning'; message: string }) {
  const Icon = severity === 'error' ? XCircleIcon : AlertTriangleIcon
  return (
    <div className="flex items-start gap-1.5 rounded border p-1.5">
      <Icon
        className={`mt-0.5 size-3.5 shrink-0 ${severity === 'error' ? 'text-red-600' : 'text-amber-600'}`}
      />
      <p className="text-[11px]">{message}</p>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded border p-2 text-center ${warn ? 'border-amber-500/40' : ''}`}>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-1 rounded border bg-muted/40 px-2 py-1">
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="break-words text-[11px]">{value}</p>
      </div>
      <CopyButton text={value} />
    </div>
  )
}
