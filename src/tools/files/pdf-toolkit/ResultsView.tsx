import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeftIcon, CheckIcon, DownloadIcon, FilePenLineIcon, InfoIcon, LoaderCircleIcon, Maximize2Icon, RotateCcwIcon } from 'lucide-react'

import { formatBytes } from '@/core/engines/image'
import { downloadBlob } from '@/features/netmon/download'
import { ArtifactPreview, artifactsToZip, downloadArtifact, FileGlyph, PreviewDialog, splitFileName, type FileArtifact } from '@/shared/components/files'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { TOOL_META } from './toolMeta'
import type { Results } from './session'
import { NEXT_STEPS, type ToolId } from './toolList'

function ImageThumb({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <img src={url} alt="" className="size-full rounded-md object-cover" />
}

function Thumb({ artifact }: { artifact: FileArtifact }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/60">
      {artifact.preview.kind === 'image' ? <ImageThumb blob={artifact.blob} /> : <FileGlyph extension={splitFileName(artifact.name).ext || artifact.format} className="h-8" />}
    </span>
  )
}

function SizeChange({ artifact }: { artifact: FileArtifact }) {
  const { t } = useTranslation()
  if (!artifact.source || !artifact.source.size) return null
  const change = Math.round(((artifact.blob.size - artifact.source.size) / artifact.source.size) * 100)
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
      {formatBytes(artifact.source.size)} → <span className="font-medium text-foreground">{formatBytes(artifact.blob.size)}</span>
      {change !== 0 && (
        <span
          className={cn(
            'rounded-full px-1.5 py-px font-semibold',
            change < 0 ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
          )}
        >
          {change < 0 ? t('pdf.results.saved', { value: -change }) : t('pdf.results.grew', { value: change })}
        </span>
      )}
    </span>
  )
}

interface ResultsViewProps {
  results: Results
  tool: ToolId
  onBack: () => void
  onStartOver: () => void
  onContinue: (artifact: FileArtifact, next: ToolId) => void
  onEditResult: (artifact: FileArtifact) => void
}

/** Finished files: a list, a large live preview, downloads and next steps. */
export function ResultsView({ results, tool, onBack, onStartOver, onContinue, onEditResult }: ResultsViewProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const { artifacts } = results
  const [selected, setSelected] = useState(0)
  const [dialog, setDialog] = useState<number | null>(null)
  const [zipping, setZipping] = useState(false)
  const current = artifacts[Math.min(selected, artifacts.length - 1)]
  const many = artifacts.length > 1
  const total = artifacts.reduce((sum, artifact) => sum + artifact.blob.size, 0)
  const isPdf = current?.format === 'PDF'
  const next = NEXT_STEPS.filter((id) => id !== tool).slice(0, 6)

  const downloadAll = async () => {
    setZipping(true)
    try {
      downloadBlob(await artifactsToZip(artifacts), results.zipName ?? 'pdf-toolkit-results.zip')
    } finally {
      setZipping(false)
    }
  }

  if (!current) return null

  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs"
      aria-labelledby="pdf-results-title"
    >
      <header className="flex flex-wrap items-center gap-3 border-b bg-gradient-to-r from-emerald-500/[0.07] via-transparent to-transparent px-3 py-3 @[480px]:px-4">
        <motion.span
          initial={reduce ? false : { scale: 0.4, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.05 }}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
          aria-hidden
        >
          <CheckIcon className="size-5" strokeWidth={3} />
        </motion.span>
        <div className="min-w-0 flex-1">
          <h2 id="pdf-results-title" className="text-sm font-semibold">
            {t('pdf.results.ready', { count: artifacts.length })}
          </h2>
          <p className="text-[11px] tabular-nums text-muted-foreground">{t('pdf.results.total', { size: formatBytes(total) })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeftIcon aria-hidden />
            {t('pdf.results.back')}
          </Button>
          {many ? (
            <Button size="sm" onClick={() => void downloadAll()} disabled={zipping}>
              {zipping ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <DownloadIcon aria-hidden />}
              {t('pdf.results.downloadAll')}
            </Button>
          ) : (
            <Button size="sm" onClick={() => downloadArtifact(current)}>
              <DownloadIcon aria-hidden />
              {t('pdf.results.download')}
            </Button>
          )}
        </div>
      </header>

      <div className={cn('grid min-w-0', many && '@[820px]:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]')}>
        {many && (
          <ul className="scrollbar-styled flex max-h-56 flex-col gap-1 overflow-y-auto border-b p-2 @[820px]:max-h-[72dvh] @[820px]:border-r @[820px]:border-b-0" aria-label={t('pdf.results.files')}>
            {artifacts.map((artifact, index) => (
              <li key={artifact.id}>
                <div
                  className={cn(
                    'group flex items-center gap-2.5 rounded-xl p-1.5 transition-colors',
                    index === selected ? 'bg-primary/[0.08] ring-1 ring-primary/40' : 'hover:bg-accent',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(index)}
                    aria-current={index === selected ? 'true' : undefined}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Thumb artifact={artifact} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-medium" title={artifact.name}>
                        {artifact.name}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {artifact.format} · {formatBytes(artifact.blob.size)}
                      </span>
                    </span>
                  </button>
                  <Button variant="ghost" size="icon-xs" onClick={() => downloadArtifact(artifact)} aria-label={t('pdf.results.downloadOne', { name: artifact.name })}>
                    <DownloadIcon />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 @[480px]:px-4">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-xs font-semibold" title={current.name}>
                {current.name}
              </p>
              {current.source ? <SizeChange artifact={current} /> : <span className="text-[11px] tabular-nums text-muted-foreground">{formatBytes(current.blob.size)}</span>}
            </div>
            <div className="flex items-center gap-1">
              {isPdf && (
                <Button variant="outline" size="xs" onClick={() => onEditResult(current)}>
                  <FilePenLineIcon aria-hidden />
                  {t('pdf.results.editResult')}
                </Button>
              )}
              <Button variant="ghost" size="icon-xs" onClick={() => setDialog(selected)} aria-label={t('pdf.results.fullscreen')}>
                <Maximize2Icon />
              </Button>
              {many && (
                <Button variant="ghost" size="icon-xs" onClick={() => downloadArtifact(current)} aria-label={t('pdf.results.download')}>
                  <DownloadIcon />
                </Button>
              )}
            </div>
          </div>
          {current.note && (
            <p className="mx-3 mt-3 flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground @[480px]:mx-4">
              <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden />
              {current.note}
            </p>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.2 }}
              className="scrollbar-styled max-h-[72dvh] min-h-48 overflow-auto bg-muted/30 p-3 @[480px]:p-4"
            >
              <ArtifactPreview artifact={current} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t px-3 py-2.5 @[480px]:px-4">
        {isPdf && (
          <>
            <span className="text-[11px] font-medium text-muted-foreground">{t('pdf.results.continue')}</span>
            <div className="flex flex-wrap gap-1.5">
              {next.map((id) => {
                const { icon: Icon, tone } = TOOL_META[id]
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onContinue(current, id)}
                    className="flex h-7 cursor-pointer items-center gap-1.5 rounded-full border bg-background pr-2.5 pl-1 text-[11px] font-medium outline-none transition-colors hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className={cn('flex size-5 items-center justify-center rounded-full', tone)} aria-hidden>
                      <Icon className="size-3" />
                    </span>
                    {t(`pdf.tools.${id}.name`)}
                  </button>
                )
              })}
            </div>
          </>
        )}
        <Button variant="ghost" size="xs" onClick={onStartOver} className="ml-auto">
          <RotateCcwIcon aria-hidden />
          {t('pdf.results.startOver')}
        </Button>
      </footer>

      <PreviewDialog artifacts={artifacts} index={dialog} onIndexChange={setDialog} zipName={results.zipName} />
    </motion.section>
  )
}
