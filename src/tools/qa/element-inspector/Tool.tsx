import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  AccessibilityIcon,
  BoxIcon,
  CodeIcon,
  CrosshairIcon,
  DownloadIcon,
  FileJsonIcon,
  LayoutDashboardIcon,
  MousePointerClickIcon,
  PaletteIcon,
  XIcon,
} from 'lucide-react'

import { TabMessagingError } from '@/chrome/contentScriptClient'
import { contrastOf, issuesOf, locatorsOf, reportMarkdown } from '@/core/engines/selector/inspect'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { parseSearchParam, useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useFocusTarget } from '@/shared/hooks/useFocusTarget'
import { useRouter } from '@/app/router'
import { PanelError } from '@/shared/components/toolkit/controls'

import { useQaTool } from '../_shared'
import { A11yTab } from './A11yTab'
import { BoxTab } from './BoxTab'
import { HistoryStrip } from './HistoryStrip'
import { InspectorHero } from './InspectorHero'
import { OverviewTab } from './OverviewTab'
import { SelectorsTab } from './SelectorsTab'
import { StylesTab } from './StylesTab'
import { cancelElementPicker, downloadText, startElementPicker } from './pick'
import { clearHistory, loadHistory, loadPicked, pushHistory, savePicked, type HistoryItem } from './storage'
import { FOCUS_TO_TAB, INSPECTOR_TABS, type InspectorTab, type PickedElement } from './types'

export default function ElementInspectorTool() {
  const { t } = useTranslation()
  const tool = useQaTool('qa.element-inspector')
  const reduce = useReducedMotion()
  useFocusTarget()
  const { search } = useRouter()
  const [tab, setTab] = useDeepLinkTab('tab', INSPECTOR_TABS, 'overview')
  const [picked, setPicked] = useState<PickedElement | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const focusId = parseSearchParam(search, 'focus')
  useEffect(() => {
    if (!focusId) return
    const mapped = FOCUS_TO_TAB[focusId]
    if (mapped) setTab(mapped)
  }, [focusId, setTab])

  useEffect(() => {
    let live = true
    void Promise.all([loadPicked(), loadHistory()]).then(async ([value, items]) => {
      if (!live) return
      if (value) {
        setPicked(value)
        setHistory(items.length > 0 ? items : await pushHistory(value))
      } else {
        setHistory(items)
      }
    })
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== 'session' && areaName !== 'local') return
      const next = changes['toolbox.pickedElement']?.newValue as PickedElement | undefined
      if (!next) return
      setPicked(next)
      setPicking(false)
      void pushHistory(next).then(setHistory)
    }
    chrome.storage?.onChanged?.addListener(listener)
    return () => {
      live = false
      chrome.storage?.onChanged?.removeListener(listener)
    }
  }, [])

  const startPick = async () => {
    setError(null)
    setPicking(true)
    try {
      await startElementPicker()
    } catch (cause) {
      setPicking(false)
      setError(pickErrorMessage(cause, t))
    }
  }

  const cancelPick = async () => {
    await cancelElementPicker()
    setPicking(false)
  }

  const clearPick = async () => {
    setPicked(null)
    await savePicked(null)
  }

  const restore = useCallback(async (item: HistoryItem) => {
    setPicked(item.result)
    await savePicked(item.result)
  }, [])

  const contrast = useMemo(() => (picked ? contrastOf(picked.element) : null), [picked])
  const issues = useMemo(
    () => (picked ? issuesOf(picked.element, contrast) : []),
    [picked, contrast],
  )

  const exportReport = () => {
    if (!picked) return
    void navigator.clipboard.writeText(reportMarkdown(picked.element, picked.selectors, contrast))
  }

  const exportJson = () => {
    if (!picked) return
    void navigator.clipboard.writeText(JSON.stringify(picked, null, 2))
  }

  const downloadJson = () => {
    if (!picked) return
    downloadText(JSON.stringify(picked, null, 2), `element-${picked.element.tag}.json`, 'application/json')
  }

  const copyPlaywright = () => {
    if (!picked) return
    const locator = locatorsOf(picked.element, picked.selectors).playwright
    if (locator) void navigator.clipboard.writeText(locator)
  }

  const activeId = history.find((item) => item.result === picked)?.id
    ?? history.find((item) => item.result.selectors.cssRelative === picked?.selectors.cssRelative)?.id
    ?? null

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <InspectorHero />

        <div className="flex flex-wrap items-center gap-1.5">
          <Button onClick={() => void startPick()} disabled={picking} aria-pressed={picking}>
            <CrosshairIcon /> {t('inspectorEl.pick')}
          </Button>
          {picking && (
            <Button variant="outline" onClick={() => void cancelPick()}>
              <XIcon /> {t('inspectorEl.cancelPick')}
            </Button>
          )}
          {picked && (
            <Button variant="ghost" size="sm" onClick={() => void clearPick()}>
              {t('inspectorEl.clear')}
            </Button>
          )}
          {picked && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <DownloadIcon /> {t('inspectorEl.export')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportReport}>{t('inspectorEl.exportReport')}</DropdownMenuItem>
                <DropdownMenuItem onClick={exportJson}>
                  <FileJsonIcon /> {t('inspectorEl.exportJson')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadJson}>
                  <DownloadIcon /> {t('inspectorEl.downloadJson')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyPlaywright}>{t('inspectorEl.copyPlaywright')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <AnimatePresence>
          {picking && (
            <motion.p
              role="status"
              aria-live="polite"
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              className="rounded-lg border border-violet-500/30 bg-violet-500/8 px-2.5 py-2 text-xs leading-5 text-violet-950 dark:text-violet-100"
            >
              {t('inspectorEl.picking')}
            </motion.p>
          )}
        </AnimatePresence>

        {error && <PanelError message={error} />}

        <HistoryStrip
          items={history}
          activeId={activeId}
          onRestore={(item) => void restore(item)}
          onClear={() => {
            setHistory([])
            void clearHistory()
          }}
        />

        {!picked && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
            <MousePointerClickIcon className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">{t('inspectorEl.emptyTitle')}</p>
            <p className="max-w-[16rem] text-xs leading-5 text-muted-foreground">
              {t('inspectorEl.emptyBody')}
            </p>
          </div>
        )}

        {picked && (
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as InspectorTab)}
            className="min-h-0"
          >
            <TabsList variant="pill">
              <TabsTrigger value="overview">
                <LayoutDashboardIcon /> {t('inspectorEl.tab.overview')}
              </TabsTrigger>
              <TabsTrigger value="box">
                <BoxIcon /> {t('inspectorEl.tab.box')}
              </TabsTrigger>
              <TabsTrigger value="styles">
                <PaletteIcon /> {t('inspectorEl.tab.styles')}
              </TabsTrigger>
              <TabsTrigger value="selectors">
                <CodeIcon /> {t('inspectorEl.tab.selectors')}
              </TabsTrigger>
              <TabsTrigger value="a11y">
                <AccessibilityIcon /> {t('inspectorEl.tab.a11y')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <OverviewTab element={picked.element} contrast={contrast} issues={issues} />
            </TabsContent>
            <TabsContent value="box">
              <BoxTab element={picked.element} />
            </TabsContent>
            <TabsContent value="styles">
              <StylesTab element={picked.element} />
            </TabsContent>
            <TabsContent value="selectors">
              <SelectorsTab element={picked.element} selectors={picked.selectors} />
            </TabsContent>
            <TabsContent value="a11y">
              <A11yTab element={picked.element} contrast={contrast} issues={issues} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ToolPage>
  )
}

function pickErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof TabMessagingError) {
    if (error.code === 'RESTRICTED_PAGE') return t('inspectorEl.error.restricted')
    if (error.code === 'NO_TAB') return t('inspectorEl.error.noTab')
    return t('inspectorEl.error.inject')
  }
  return t('inspectorEl.error.inject')
}
