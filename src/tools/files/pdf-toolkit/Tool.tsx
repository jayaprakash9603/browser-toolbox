import { lazy, Suspense, useRef, useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import type { FileArtifact } from '@/shared/components/files'
import { ToolPage } from '@/shared/components/ToolPage'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { cn } from '@/shared/utils/cn'
import { useFileTool } from '../_shared'
import { Catalog } from './Catalog'
import { DocumentBar, OpenDocument } from './DocumentChrome'
import { ResultsView } from './ResultsView'
import { PdfSessionContext, usePdfSessionController } from './session'
import { WorkspaceBar } from './ToolBar'
import { LEGACY_TABS, TOOL_BY_ID, TOOL_IDS, type ToolId } from './toolList'

const ViewPanel = lazy(() => import('./ViewPanel').then((module) => ({ default: module.ViewPanel })))
const OrganizePanel = lazy(() => import('./OrganizePanel').then((module) => ({ default: module.OrganizePanel })))
const MergePanel = lazy(() => import('./MergePanel').then((module) => ({ default: module.MergePanel })))
const SplitPanel = lazy(() => import('./SplitPanel').then((module) => ({ default: module.SplitPanel })))
const CompressPanel = lazy(() => import('./CompressPanel').then((module) => ({ default: module.CompressPanel })))
const SignPanel = lazy(() => import('./SignPanel').then((module) => ({ default: module.SignPanel })))
const StampPanel = lazy(() => import('./StampPanel').then((module) => ({ default: module.StampPanel })))
const ConvertPanel = lazy(() => import('./ConvertPanel').then((module) => ({ default: module.ConvertPanel })))
const ProtectPanel = lazy(() => import('./ProtectPanel').then((module) => ({ default: module.ProtectPanel })))
const UnlockPanel = lazy(() => import('./UnlockPanel').then((module) => ({ default: module.UnlockPanel })))
const PagesPanel = lazy(() => import('./PagesPanel').then((module) => ({ default: module.PagesPanel })))
const RotatePanel = lazy(() => import('./RotatePanel').then((module) => ({ default: module.RotatePanel })))
const CropPanel = lazy(() => import('./CropPanel').then((module) => ({ default: module.CropPanel })))
const FormsPanel = lazy(() => import('./FormsPanel').then((module) => ({ default: module.FormsPanel })))
const RedactPanel = lazy(() => import('./RedactPanel').then((module) => ({ default: module.RedactPanel })))
const ComparePanel = lazy(() => import('./ComparePanel').then((module) => ({ default: module.ComparePanel })))
const PdfaPanel = lazy(() => import('./PdfaPanel').then((module) => ({ default: module.PdfaPanel })))
const PdfToOfficePanel = lazy(() => import('./PdfToOfficePanel').then((module) => ({ default: module.PdfToOfficePanel })))
const SummarizePanel = lazy(() => import('./SummarizePanel').then((module) => ({ default: module.SummarizePanel })))
const TranslatePanel = lazy(() => import('./TranslatePanel').then((module) => ({ default: module.TranslatePanel })))
const MarkdownPanel = lazy(() => import('./MarkdownPanel').then((module) => ({ default: module.MarkdownPanel })))
const ImagesToPdfPanel = lazy(() => import('./ImagesToPdfPanel').then((module) => ({ default: module.ImagesToPdfPanel })))
const OfficeToPdfPanel = lazy(() => import('./OfficeToPdfPanel').then((module) => ({ default: module.OfficeToPdfPanel })))
const HtmlToPdfPanel = lazy(() => import('./HtmlToPdfPanel').then((module) => ({ default: module.HtmlToPdfPanel })))
const ScanPanel = lazy(() => import('./ScanPanel').then((module) => ({ default: module.ScanPanel })))
const RepairPanel = lazy(() => import('./RepairPanel').then((module) => ({ default: module.RepairPanel })))

const PANELS: Record<ToolId, () => ReactElement> = {
  merge: () => <MergePanel />,
  split: () => <SplitPanel />,
  'remove-pages': () => <PagesPanel mode="remove" />,
  'extract-pages': () => <PagesPanel mode="extract" />,
  organize: () => <OrganizePanel />,
  scan: () => <ScanPanel />,
  compress: () => <CompressPanel />,
  repair: () => <RepairPanel />,
  'jpg-to-pdf': () => <ImagesToPdfPanel />,
  'word-to-pdf': () => <OfficeToPdfPanel kind="word" />,
  'powerpoint-to-pdf': () => <OfficeToPdfPanel kind="powerpoint" />,
  'excel-to-pdf': () => <OfficeToPdfPanel kind="excel" />,
  'html-to-pdf': () => <HtmlToPdfPanel />,
  'pdf-to-jpg': () => <ConvertPanel target="images" />,
  'pdf-to-word': () => <ConvertPanel target="word" />,
  'pdf-to-text': () => <ConvertPanel target="text" />,
  'pdf-to-powerpoint': () => <PdfToOfficePanel kind="powerpoint" />,
  'pdf-to-excel': () => <PdfToOfficePanel kind="excel" />,
  'pdf-to-pdfa': () => <PdfaPanel />,
  view: () => <ViewPanel />,
  rotate: () => <RotatePanel />,
  'page-numbers': () => <StampPanel mode="numbers" />,
  watermark: () => <StampPanel mode="watermark" />,
  crop: () => <CropPanel />,
  edit: () => <SignPanel variant="edit" />,
  forms: () => <FormsPanel />,
  unlock: () => <UnlockPanel />,
  protect: () => <ProtectPanel />,
  sign: () => <SignPanel variant="sign" />,
  redact: () => <RedactPanel />,
  compare: () => <ComparePanel />,
  summarize: () => <SummarizePanel />,
  translate: () => <TranslatePanel />,
  'pdf-to-markdown': () => <MarkdownPanel />,
}

const TABS = ['all', ...TOOL_IDS, ...Object.keys(LEGACY_TABS)] as const
const RECENT_KEY = 'pdf-toolkit:recent'

function readRecent(): ToolId[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is ToolId => typeof id === 'string' && id in TOOL_BY_ID).slice(0, 6) : []
  } catch {
    return []
  }
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-11 w-48 rounded-xl" />
    </div>
  )
}

export default function PdfToolkitTool() {
  const tool = useFileTool('files.pdf-toolkit')
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [tab, setTab] = useDeepLinkTab('tab', TABS, 'all')
  const active: ToolId | 'all' = tab in LEGACY_TABS ? LEGACY_TABS[tab] : (tab as ToolId | 'all')
  const session = usePdfSessionController()
  const [shownTool, setShownTool] = useState(active)
  // Back, forward and deep links change the tool without `open`, so results are dropped here too.
  if (shownTool !== active) {
    setShownTool(active)
    session.showResults(null)
  }
  const [recent, setRecent] = useState<ToolId[]>(readRecent)
  const [resetKey, setResetKey] = useState(0)
  const top = useRef<HTMLDivElement>(null)

  const doc = session.state.status === 'ready' ? session.state.doc : null
  const info = active === 'all' ? null : TOOL_BY_ID[active]
  const results = info ? session.results : null

  const open = (id: ToolId) => {
    session.showResults(null)
    setTab(id)
    const next = [id, ...recent.filter((entry) => entry !== id)].slice(0, 6)
    setRecent(next)
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      // Private windows may refuse storage; recents are a nicety.
    }
    top.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
  }

  const backToCatalog = () => {
    session.showResults(null)
    setTab('all')
  }

  const continueWith = async (artifact: FileArtifact, next: ToolId) => {
    await session.adopt(artifact)
    open(next)
  }

  const startOver = () => {
    session.showResults(null)
    if (info?.input === 'pdf') session.close()
    setResetKey((value) => value + 1)
  }

  const panelKey = info ? `${info.id}:${info.input === 'pdf' ? (doc?.id ?? 'none') : 'files'}:${resetKey}` : 'catalog'

  return (
    <PdfSessionContext.Provider value={session}>
      <ToolPage tool={tool}>
        <div ref={top} className="flex scroll-mt-16 flex-col gap-3 @container">
          {info ? (
            <WorkspaceBar tool={info.id} onBack={backToCatalog} onSelect={open} />
          ) : (
            doc && (
              <div className="flex flex-col gap-1.5">
                <p className="px-1 text-[11px] font-medium text-muted-foreground">{t('pdf.ui.workingOn')}</p>
                <DocumentBar doc={doc} />
              </div>
            )
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={info ? info.id : 'catalog'}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, transition: { duration: 0.12 } }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex flex-col gap-3"
            >
              {!info ? (
                <Catalog recent={recent} onOpen={open} />
              ) : (
                <>
                  {info.input === 'pdf' && doc && <DocumentBar doc={doc} />}
                  {results && (
                    <ResultsView
                      results={results}
                      tool={info.id}
                      onBack={() => session.showResults(null)}
                      onStartOver={startOver}
                      onContinue={(artifact, next) => void continueWith(artifact, next)}
                      onEditResult={(artifact) => void session.adopt(artifact)}
                    />
                  )}
                  {/* The panel stays mounted under the results, so "Back to options" keeps every setting. */}
                  <div className={cn('flex flex-col gap-3', results && 'hidden')}>
                    {info.input === 'pdf' && !doc ? (
                      <OpenDocument hint={t(`pdf.tools.${info.id}.desc`)} />
                    ) : (
                      <Suspense fallback={<PanelSkeleton />}>
                        <PanelHost key={panelKey} id={info.id} />
                      </Suspense>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </ToolPage>
    </PdfSessionContext.Provider>
  )
}

function PanelHost({ id }: { id: ToolId }) {
  return PANELS[id]()
}
