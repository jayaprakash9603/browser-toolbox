import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TargetIcon, ZapIcon } from 'lucide-react'

import { classifyTabUrl } from '@/chrome/contentScriptClient'
import {
  DEFAULT_SCRAPE_CONFIG,
  type ScrapeColumn,
  type ScrapeConfig,
  type ScrapePaginationMode,
  type ScrapeRow,
} from '@/core/scraper'
import { toolRegistry } from '@/core/registry'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

import { ExportBar } from './ExportBar'
import { PreviewTable } from './PreviewTable'
import {
  cancelPick,
  detectGrid,
  extractRows,
  getJob,
  resolveScraperTab,
  startJob,
  startPick,
  stopJob,
  suggestNext,
} from './service'
import { useScraperJob } from './useScraperJob'

export default function DataScraperTool() {
  const { t } = useTranslation()
  const tool = toolRegistry.get('data.data-scraper')
  if (!tool) throw new Error('data.data-scraper')
  const [tabId, setTabId] = useState<number>()
  const [host, setHost] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [candidateCount, setCandidateCount] = useState(0)
  const [rowSelector, setRowSelector] = useState('')
  const [columns, setColumns] = useState<ScrapeColumn[]>([])
  const [rows, setRows] = useState<ScrapeRow[]>([])
  const [nextSelector, setNextSelector] = useState('')
  const [mode, setMode] = useState<ScrapePaginationMode>('none')
  const [delayMin, setDelayMin] = useState(DEFAULT_SCRAPE_CONFIG.delayMinMs)
  const [delayMax, setDelayMax] = useState(DEFAULT_SCRAPE_CONFIG.delayMaxMs)
  const [maxWait, setMaxWait] = useState(DEFAULT_SCRAPE_CONFIG.maxWaitMs)
  const [maxPages, setMaxPages] = useState(DEFAULT_SCRAPE_CONFIG.maxPages)

  const { job, pick } = useScraperJob(tabId)

  const config: ScrapeConfig = useMemo(
    () => ({
      rowSelector,
      columns,
      nextSelector: nextSelector || undefined,
      mode,
      delayMinMs: delayMin,
      delayMaxMs: delayMax,
      maxWaitMs: maxWait,
      maxPages,
    }),
    [rowSelector, columns, nextSelector, mode, delayMin, delayMax, maxWait, maxPages],
  )

  const refreshTab = useCallback(async () => {
    try {
      const { tabId: id, url } = await resolveScraperTab()
      const blocked = classifyTabUrl(url)
      if (blocked) {
        throw new Error(
          'Open a normal website tab, click it once, then run Auto-detect again. (Extension and browser system pages cannot be scraped.)',
        )
      }
      setTabId(id)
      try {
        setHost(new URL(url).hostname)
      } catch {
        setHost('page')
      }
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tab error')
    }
  }, [])

  useEffect(() => {
    void refreshTab()
  }, [refreshTab])

  useEffect(() => {
    if (job?.rows) setRows(job.rows)
  }, [job])

  useEffect(() => {
    if (!pick || tabId == null) return
    if (pick.mode === 'row' && pick.rowSelector) {
      setRowSelector(pick.rowSelector)
      void extractRows(tabId, { ...config, rowSelector: pick.rowSelector }).then(({ rows: r }) => setRows(r))
    }
    if (pick.mode === 'column' && pick.selector) {
      setColumns((prev) => [
        ...prev,
        {
          key: `col_${prev.length}`,
          label: `Column ${prev.length + 1}`,
          relativeSelector: pick.selector,
          attr: 'text',
          order: prev.length,
        },
      ])
    }
    if (pick.mode === 'next') setNextSelector(pick.selector)
  }, [pick, tabId])

  const runDetect = async (index = candidateIndex) => {
    if (tabId == null) return
    setError(null)
    try {
      const data = await detectGrid(tabId, index)
      setCandidateIndex(data.candidateIndex)
      setCandidateCount(data.candidateCount)
      setRowSelector(data.candidate.rowSelector)
      setColumns(data.candidate.sampleColumns)
      const { rows: r } = await extractRows(tabId, {
        ...config,
        rowSelector: data.candidate.rowSelector,
        columns: data.candidate.sampleColumns,
      })
      setRows(r)
      const next = await suggestNext(tabId)
      if (next.selector) setNextSelector(next.selector)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detect failed')
    }
  }

  const runExtract = async () => {
    if (tabId == null || !rowSelector) return
    try {
      const { rows: r } = await extractRows(tabId, config)
      setRows(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extract failed')
    }
  }

  const runCrawl = async () => {
    if (tabId == null) return
    setError(null)
    await startJob(tabId, config, rows)
  }

  const runStop = async () => {
    if (tabId == null) return
    await stopJob(tabId)
    const state = await getJob(tabId)
    if (state && 'rows' in state && state.rows) setRows(state.rows)
  }

  const displayRows = job?.rows?.length ? job.rows : rows
  const phase = job?.phase ?? 'idle'
  const crawling = phase === 'extracting' || phase === 'paginating' || phase === 'waiting'

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-4 text-sm">
        {error && <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-700">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => void runDetect(0)}>
            <ZapIcon className="size-3.5" />
            {t('dataScraper.autoDetect')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={candidateCount < 2}
            onClick={() => {
              const next = (candidateIndex + 1) % Math.max(candidateCount, 1)
              setCandidateIndex(next)
              void runDetect(next)
            }}
          >
            {t('dataScraper.tryAnother')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!tabId}
            onClick={() => tabId && void startPick(tabId, 'row', rowSelector)}
          >
            <TargetIcon className="size-3.5" />
            {t('dataScraper.pickRows')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!tabId || !rowSelector}
            onClick={() => tabId && void startPick(tabId, 'column', rowSelector)}
          >
            {t('dataScraper.addColumn')}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void runExtract()}>
            {t('dataScraper.refresh')}
          </Button>
        </div>

        <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
          <div>
            <span className="text-xs font-medium">{t('dataScraper.rowSelector')}</span>
            <Input className="h-8 font-mono text-xs" value={rowSelector} onChange={(e) => setRowSelector(e.target.value)} />
          </div>
          <div>
            <span className="text-xs font-medium">{t('dataScraper.nextSelector')}</span>
            <div className="flex gap-1">
              <Input
                className="h-8 font-mono text-xs"
                value={nextSelector}
                onChange={(e) => setNextSelector(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => tabId && void startPick(tabId, 'next')}
              >
                Pick
              </Button>
            </div>
          </div>
          <div>
            <span className="text-xs font-medium">{t('dataScraper.pagination')}</span>
            <Select value={mode} onValueChange={(v) => setMode(v as ScrapePaginationMode)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('dataScraper.modeNone')}</SelectItem>
                <SelectItem value="click">{t('dataScraper.modeClick')}</SelectItem>
                <SelectItem value="scroll">{t('dataScraper.modeScroll')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button type="button" size="sm" disabled={crawling || !rowSelector} onClick={() => void runCrawl()}>
              {t('dataScraper.startCrawl')}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={!crawling} onClick={() => void runStop()}>
              {t('dataScraper.stop')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => tabId && void cancelPick(tabId)}>
              Cancel pick
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          <div>
            <span className="text-xs font-medium">Delay min (ms)</span>
            <Input type="number" className="h-8" value={delayMin} onChange={(e) => setDelayMin(Number(e.target.value))} />
          </div>
          <div>
            <span className="text-xs font-medium">Delay max (ms)</span>
            <Input type="number" className="h-8" value={delayMax} onChange={(e) => setDelayMax(Number(e.target.value))} />
          </div>
          <div>
            <span className="text-xs font-medium">Max wait (ms)</span>
            <Input type="number" className="h-8" value={maxWait} onChange={(e) => setMaxWait(Number(e.target.value))} />
          </div>
          <div>
            <span className="text-xs font-medium">Max pages</span>
            <Input type="number" className="h-8" value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))} />
          </div>
        </div>

        <div className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{displayRows.length}</span> {t('dataScraper.rows')} ·{' '}
          {job?.pages ?? 1} {t('dataScraper.pages')} · {t('dataScraper.phase')}: <strong>{phase}</strong>
          {job?.warning && <span className="ml-2 text-amber-600">{job.warning}</span>}
        </div>

        <ExportBar rows={displayRows} columns={columns} hostLabel={host} />
        <PreviewTable rows={displayRows} columns={columns} onColumnsChange={setColumns} />
      </div>
    </ToolPage>
  )
}
