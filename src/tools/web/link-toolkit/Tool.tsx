import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { PauseIcon, PlayIcon, RefreshCwIcon, ShieldAlertIcon, SquareIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { toEntries, type PageLink } from '@/core/engines/links/pageLinks'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'

import { useWebTool } from '../_shared'
import { sendToActiveTab } from '../tabMessaging'
import { AnchorPanel } from './AnchorPanel'
import { EdgeTable } from './EdgeTable'
import { ExportMenu } from './ExportMenu'
import { GraphWorkspace } from './GraphWorkspace'
import { HealthPanel } from './HealthPanel'
import './i18n'
import type { IntelligenceScope } from './intelligenceSettings'
import { InternalLinksPanel } from './InternalLinksPanel'
import { OverviewPanel } from './OverviewPanel'
import { SettingsPanel } from './SettingsPanel'
import { useLinkIntelligence } from './useLinkIntelligence'
import { LT_SCROLL, LT_TAB_PANEL, LT_TABS_RAIL, LT_TOOLBAR } from './layout'

const TABS = ['overview', 'graph', 'internal', 'external', 'anchors', 'health', 'settings'] as const
type TabId = (typeof TABS)[number]

export default function LinkToolkitTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.link-toolkit')
  const reduceMotion = useReducedMotion()
  const [tab, setTab] = useDeepLinkTab('tab', TABS, 'overview')
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null)
  const intel = useLinkIntelligence()
  const { snapshot, graph, load, checks } = intel

  const showNotice = useCallback((text: string) => setNotice({ id: Date.now(), text }), [])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 3200)
    return () => clearTimeout(timer)
  }, [notice])

  const locate = useCallback(
    async (link: PageLink) => {
      const result = await sendToActiveTab<{ found: boolean; visible: boolean }>({
        type: 'LOCATE_PAGE_LINK',
        index: link.index,
        href: link.href,
      })
      if (!result) showNotice(t('web.links.locateFailed'))
      else if (!result.found) {
        showNotice(t('web.links.locateMissing'))
        intel.setStale(true)
      } else if (!result.visible) showNotice(t('web.links.locateHidden'))
    },
    [intel, showNotice, t],
  )

  const statusOf = useCallback((href: string) => checks.statuses.get(href), [checks.statuses])
  const startPageCheck = () => {
    const hrefs = [...new Set((snapshot?.links ?? []).filter((link) => link.kind === 'internal' || link.kind === 'external').map((link) => link.href))]
    intel.startCheck(hrefs)
  }

  const actions = (
    <>
      <Button variant="ghost" size="icon-sm" aria-label={t('web.links.rescan')} title={t('web.links.rescan')} onClick={intel.rescan}>
        <RefreshCwIcon className="size-4" />
      </Button>
      {snapshot && (
        <ExportMenu
          entries={toEntries(snapshot.links, true)}
          host={snapshot.host}
          statusOf={statusOf}
          onDone={showNotice}
        />
      )}
    </>
  )

  return (
    <ToolPage tool={tool} actions={actions} contentClassName="@container flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="flex h-full min-h-0 flex-col">
        <div className={LT_TOOLBAR}>
          {snapshot && (
            <p className="truncate text-[11px] font-semibold leading-4">{snapshot.title || snapshot.host}</p>
          )}
          <Segmented
            size="sm"
            fullWidth
            ariaLabel={t('web.links.scopeLabel')}
            value={intel.settings.scope}
            onValueChange={(scope) => intel.patchSettings({ scope: scope as IntelligenceScope })}
            options={[
              { value: 'page', label: t('web.links.scope.page') },
              { value: 'site', label: t('web.links.scope.site') },
              { value: 'folder', label: t('web.links.scope.folder') },
              { value: 'sitemap', label: t('web.links.scope.sitemap') },
            ]}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {intel.settings.scope !== 'page' && (
              <Button size="xs" onClick={() => void intel.startCrawl()} disabled={Boolean(intel.crawl)}>
                {t('web.links.crawl')}
              </Button>
            )}
            {intel.crawl && (
              <>
                <Button
                  size="icon-xs"
                  variant="outline"
                  aria-label={intel.crawl.paused ? t('web.links.resume') : t('web.links.pause')}
                  onClick={() => void intel.pauseCrawl(!intel.crawl?.paused)}
                >
                  {intel.crawl.paused ? <PlayIcon /> : <PauseIcon />}
                </Button>
                <Button size="icon-xs" variant="outline" aria-label={t('web.links.stop')} onClick={() => void intel.stopCrawl()}>
                  <SquareIcon />
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  {t('web.links.crawlProgress', {
                    saved: intel.crawl.progress?.saved ?? 0,
                    found: intel.crawl.progress?.found ?? 0,
                  })}
                </span>
              </>
            )}
            {intel.failedUrls.length > 0 && (
              <Button size="xs" variant="outline" onClick={() => void intel.startCrawl(intel.failedUrls)}>
                {t('web.links.retryFailed')}
              </Button>
            )}
            {intel.crawlError && <p className="w-full text-[11px] text-destructive">{t('web.links.crawlFailed')}</p>}
          </div>
        </div>

        {load.status === 'loading' && (
          <p className="px-[var(--density-page-pad)] py-3 text-xs text-muted-foreground">{t('web.links.loading')}</p>
        )}
        {load.status === 'error' && (
          <div className="px-[var(--density-page-pad)] py-3">
            <Empty icon={ShieldAlertIcon} title={t('web.links.loadError')} hint={t('web.links.loadErrorHint')}>
              <Button size="sm" onClick={intel.rescan}>
                {t('web.links.retry')}
              </Button>
            </Empty>
          </div>
        )}

        {snapshot && graph && (
          <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
            <div className={LT_TABS_RAIL}>
              <TabsList variant="attached" className="w-full shrink-0 bg-muted/30">
                {TABS.map((id) => (
                  <TabsTrigger key={id} value={id} className="px-2 text-xs">
                    {t(`web.links.tab.${id}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className={LT_SCROLL}>
              {intel.stale && (
                <div className="mb-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-2.5 py-2 text-xs">
                  <span className="flex-1">{t('web.links.pageChanged')}</span>
                  <Button size="xs" variant="outline" onClick={intel.rescan}>
                    {t('web.links.rescan')}
                  </Button>
                </div>
              )}
              <TabsContent value="overview" className={LT_TAB_PANEL}>
                <OverviewPanel graph={graph} />
              </TabsContent>
              <TabsContent value="graph" className={LT_TAB_PANEL}>
                <GraphWorkspace
                  graph={graph}
                  selectedId={intel.selectedId}
                  onSelect={intel.setSelectedId}
                  animated={intel.settings.animate}
                  showLabels={intel.settings.showLabels}
                  reducedMotion={Boolean(reduceMotion)}
                  onInspectAnchors={() => setTab('anchors')}
                />
              </TabsContent>
              <TabsContent value="internal" className={LT_TAB_PANEL}>
                <InternalLinksPanel
                  snapshot={snapshot}
                  statusOf={statusOf}
                  statuses={checks.statuses}
                  progress={checks.progress}
                  checking={checks.checking}
                  onCheck={startPageCheck}
                  onCancelCheck={checks.cancel}
                  onLocate={locate}
                />
              </TabsContent>
              <TabsContent value="external" className={LT_TAB_PANEL}>
                <EdgeTable graph={graph} kind="external" />
              </TabsContent>
              <TabsContent value="anchors" className={LT_TAB_PANEL}>
                <AnchorPanel graph={graph} />
              </TabsContent>
              <TabsContent value="health" className={LT_TAB_PANEL}>
                <HealthPanel graph={graph} onRecheck={(hrefs) => intel.startCheck(hrefs)} />
              </TabsContent>
              <TabsContent value="settings" className={LT_TAB_PANEL}>
                <SettingsPanel settings={intel.settings} onChange={intel.patchSettings} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {notice?.text ?? ''}
      </div>
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex justify-center"
          >
            <span className="max-w-full rounded-full bg-foreground px-3.5 py-1.5 text-center text-xs font-medium text-background shadow-lg">
              {notice.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </ToolPage>
  )
}

function Empty({ icon: Icon, title, hint, children }: { icon: typeof ShieldAlertIcon; title: string; hint: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
      <Icon className="size-5 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  )
}
