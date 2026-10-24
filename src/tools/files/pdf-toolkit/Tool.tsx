import { useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { FilePenLineIcon } from 'lucide-react'

import { PreviewDialog } from '@/shared/components/files'
import { GlyphPairArt, ModeTiles, ToolkitHero } from '@/shared/components/toolkit'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { TabsContent } from '@/shared/components/ui/tabs'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useFileTool } from '../_shared'
import { CompressPanel } from './CompressPanel'
import { ConvertPanel } from './ConvertPanel'
import { DocumentBar, OpenDocument } from './DocumentChrome'
import { MergePanel } from './MergePanel'
import { MODE_META, MODES, STANDALONE_MODES, type Mode } from './modes'
import { OrganizePanel } from './OrganizePanel'
import { ProtectPanel } from './ProtectPanel'
import { PdfSessionContext, usePdfSessionController, type OpenPdf, type Results } from './session'
import { SignPanel } from './SignPanel'
import { SplitPanel } from './SplitPanel'
import { StampPanel } from './StampPanel'
import { ViewPanel } from './ViewPanel'

const PANELS: Record<Exclude<Mode, 'merge'>, ComponentType> = {
  view: ViewPanel,
  organize: OrganizePanel,
  split: SplitPanel,
  compress: CompressPanel,
  sign: SignPanel,
  stamp: StampPanel,
  convert: ConvertPanel,
  protect: ProtectPanel,
}

function ModePanel({ mode, doc }: { mode: Mode; doc: OpenPdf | null }) {
  const { t } = useTranslation()
  if (mode === 'merge') return <MergePanel />
  if (!doc) return STANDALONE_MODES.has(mode) ? null : <OpenDocument hint={t(`pdf.${mode}.dropHint`)} />
  const Panel = PANELS[mode]
  return <Panel key={doc.id} />
}

export default function PdfToolkitTool() {
  const tool = useFileTool('files.pdf-toolkit')
  const { t } = useTranslation()
  const [mode, setMode] = useDeepLinkTab('tab', MODES, 'view')
  const session = usePdfSessionController()
  const [visited, setVisited] = useState<ReadonlySet<Mode>>(() => new Set([mode]))
  if (!visited.has(mode)) setVisited(new Set(visited).add(mode))
  const [resultIndex, setResultIndex] = useState(0)
  const [shownResults, setShownResults] = useState<Results | null>(null)
  if (session.results !== shownResults) {
    setShownResults(session.results)
    setResultIndex(0)
  }

  const doc = session.state.status === 'ready' ? session.state.doc : null
  const [from, to] = MODE_META[mode].pair

  return (
    <PdfSessionContext.Provider value={session}>
      <ToolPage tool={tool}>
        <TabsPrimitive.Root value={mode} onValueChange={(value) => setMode(value as Mode)} className="flex flex-col gap-3 @container">
          <ToolkitHero
            motionKey={mode}
            badge={t('pdf.hero.badge')}
            title={t(`pdf.hero.${mode}.title`)}
            text={t(`pdf.hero.${mode}.text`)}
            art={<GlyphPairArt motionKey={mode} from={from} to={to} />}
          />
          <ModeTiles
            label={t('pdf.modesLabel')}
            layoutId="pdf-toolkit-mode"
            value={mode}
            className="grid grid-cols-3 gap-1.5 @[1100px]:grid-cols-9"
            hintClassName="hidden @[560px]:block @[1100px]:hidden"
            tiles={MODES.map((value) => ({
              value,
              label: t(`pdf.modes.${value}`),
              hint: t(`pdf.modes.${value}Hint`),
              icon: MODE_META[value].icon,
              tone: MODE_META[value].tone,
            }))}
          />

          {doc && <DocumentBar doc={doc} />}

          {/* Panels mount on first visit and stay mounted; each restarts when a different document opens. */}
          {MODES.map((value) => (
            <TabsContent key={value} value={value} forceMount className="mt-0 flex flex-col gap-3 data-[state=inactive]:hidden">
              {visited.has(value) && <ModePanel mode={value} doc={doc} />}
            </TabsContent>
          ))}
        </TabsPrimitive.Root>

        <PreviewDialog
          artifacts={session.results?.artifacts ?? []}
          index={session.results ? resultIndex : null}
          onIndexChange={(index) => {
            if (index === null) session.showResults(null)
            else setResultIndex(index)
          }}
          zipName={session.results?.zipName}
          actions={(artifact) =>
            artifact.format === 'PDF' && (
              <Button variant="outline" size="sm" onClick={() => void session.adopt(artifact)}>
                <FilePenLineIcon aria-hidden />
                {t('pdf.keepEditing')}
              </Button>
            )
          }
        />
      </ToolPage>
    </PdfSessionContext.Provider>
  )
}
