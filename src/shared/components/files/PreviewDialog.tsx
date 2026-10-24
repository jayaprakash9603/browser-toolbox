import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArchiveIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  XIcon,
} from 'lucide-react'

import { formatBytes } from '@/core/engines/image'
import { CopyButton } from '@/shared/components/CopyButton'
import { downloadBlob } from '@/features/netmon/download'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import {
  artifactText,
  artifactsToZip,
  downloadArtifact,
  openArtifact,
  splitFileName,
  type FileArtifact,
} from './artifact'
import { ArtifactPreview } from './ArtifactPreview'
import { FileGlyph } from './FileGlyph'

interface PreviewDialogProps {
  artifacts: FileArtifact[]
  /** Index of the artifact on screen; `null` closes the dialog. */
  index: number | null
  onIndexChange: (index: number | null) => void
  /** File name for "Download all"; the button only shows with two or more files. */
  zipName?: string
  /** Extra footer buttons for the artifact on screen, placed before the download buttons. */
  actions?: (artifact: FileArtifact) => ReactNode
}

function SizeDelta({ before, after }: { before: number; after: number }) {
  if (before <= 0) return null
  const change = (after - before) / before
  if (Math.abs(change) < 0.005 || change > 1) return null
  const smaller = change < 0
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums',
        smaller ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground',
      )}
    >
      {smaller ? '−' : '+'}
      {Math.round(Math.abs(change) * 100)}%
    </span>
  )
}

/** Shared "look before you save" dialog: rename, flip through results, then download. */
export function PreviewDialog({ artifacts, index, onIndexChange, zipName = 'files.zip', actions }: PreviewDialogProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [names, setNames] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<string | null>(null)
  const [zipping, setZipping] = useState(false)
  const [direction, setDirection] = useState(1)
  const savedTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(savedTimer.current), [])

  const open = index !== null && index < artifacts.length
  const artifact = open ? artifacts[index] : null
  const count = artifacts.length
  const name = artifact ? names[artifact.id] ?? artifact.name : ''
  const { stem, ext } = splitFileName(name)
  const text = artifact ? artifactText(artifact) : null

  const go = (step: number) => {
    if (index === null || count < 2) return
    setDirection(step)
    onIndexChange((index + step + count) % count)
  }

  const rename = (value: string) => {
    if (!artifact) return
    const clean = value.replace(/[\\/:*?"<>|]+/g, '')
    setNames((current) => ({ ...current, [artifact.id]: ext ? `${clean || 'file'}.${ext}` : clean || 'file' }))
  }

  const flashSaved = (id: string) => {
    setSaved(id)
    window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setSaved(null), 1800)
  }

  const download = () => {
    if (!artifact) return
    downloadArtifact(artifact, name)
    flashSaved(artifact.id)
  }

  const downloadAll = async () => {
    setZipping(true)
    try {
      downloadBlob(await artifactsToZip(artifacts, names), zipName)
      flashSaved('all')
    } finally {
      setZipping(false)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable="true"], .cm-editor')) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(1)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
      <AnimatePresence>
        {open && artifact && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount onKeyDown={onKeyDown} aria-describedby={undefined}>
              <motion.div
                className="fixed inset-x-2 top-2 bottom-2 z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl outline-none sm:inset-x-6 sm:top-6 sm:bottom-6"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.16 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              >
                <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-card/80 px-3 py-2.5 sm:px-4">
                  <motion.div
                    key={artifact.id}
                    initial={reduce ? false : { rotate: -8, scale: 0.8, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  >
                    <FileGlyph extension={ext || artifact.format} className="h-10" />
                  </motion.div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <DialogPrimitive.Title className="sr-only">{t('fileui.previewTitle', { name })}</DialogPrimitive.Title>
                    <label className="group flex min-w-0 items-center rounded-md border border-transparent px-1 transition-colors focus-within:border-ring hover:border-input">
                      <input
                        aria-label={t('fileui.fileName')}
                        value={stem}
                        onChange={(event) => rename(event.target.value)}
                        spellCheck={false}
                        className="min-w-0 flex-1 bg-transparent py-0.5 text-sm font-semibold outline-none"
                      />
                      {ext && <span className="shrink-0 text-sm text-muted-foreground">.{ext}</span>}
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
                      <span className="rounded bg-primary/10 px-1.5 py-px font-semibold tracking-wide text-primary">{artifact.format}</span>
                      {artifact.source ? (
                        <span className="inline-flex min-w-0 items-center gap-1 tabular-nums">
                          <span className="max-w-[18ch] truncate" title={artifact.source.name}>
                            {artifact.source.name}
                          </span>
                          <span>{formatBytes(artifact.source.size)}</span>
                          <ArrowRightIcon className="size-3" aria-hidden />
                          <span className="font-medium text-foreground">{formatBytes(artifact.blob.size)}</span>
                          <SizeDelta before={artifact.source.size} after={artifact.blob.size} />
                        </span>
                      ) : (
                        <span className="tabular-nums">{formatBytes(artifact.blob.size)}</span>
                      )}
                    </div>
                  </div>
                  {count > 1 && (
                    <div className="flex items-center gap-1" role="group" aria-label={t('fileui.navigate')}>
                      <Button variant="outline" size="icon-sm" onClick={() => go(-1)} aria-label={t('fileui.previous')}>
                        <ChevronLeftIcon />
                      </Button>
                      <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
                        {(index ?? 0) + 1} / {count}
                      </span>
                      <Button variant="outline" size="icon-sm" onClick={() => go(1)} aria-label={t('fileui.next')}>
                        <ChevronRightIcon />
                      </Button>
                    </div>
                  )}
                  <DialogPrimitive.Close asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={t('dialogs.close')}>
                      <XIcon />
                    </Button>
                  </DialogPrimitive.Close>
                </header>

                <div
                  className="scrollbar-styled relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-muted/40 p-3 sm:p-6"
                  style={{
                    backgroundImage: 'radial-gradient(color-mix(in srgb, var(--foreground) 9%, transparent) 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={artifact.id}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 28 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -28, transition: { duration: 0.12 } }}
                      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                      <ArtifactPreview artifact={artifact} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <footer className="flex flex-wrap items-center gap-2 border-t bg-card/80 px-3 py-2.5 sm:px-4">
                  <p className="mr-auto min-w-0 flex-1 text-[11px] text-muted-foreground">{artifact.note ?? t('fileui.localOnly')}</p>
                  {text !== null && <CopyButton text={text} size="xs" />}
                  <Button variant="ghost" size="xs" onClick={() => openArtifact(artifact)}>
                    <ExternalLinkIcon aria-hidden />
                    {t('fileui.openTab')}
                  </Button>
                  {actions?.(artifact)}
                  {count > 1 && (
                    <Button variant="outline" size="sm" onClick={() => void downloadAll()} disabled={zipping}>
                      {zipping ? (
                        <LoaderCircleIcon className="animate-spin" aria-hidden />
                      ) : saved === 'all' ? (
                        <CheckIcon className="text-emerald-600" aria-hidden />
                      ) : (
                        <ArchiveIcon aria-hidden />
                      )}
                      {t('fileui.downloadAll', { count })}
                    </Button>
                  )}
                  <Button size="sm" onClick={download} className="min-w-32">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={saved === artifact.id ? 'saved' : 'download'}
                        className="inline-flex items-center gap-1.5"
                        initial={reduce ? false : { y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { y: -8, opacity: 0 }}
                        transition={{ duration: 0.16 }}
                      >
                        {saved === artifact.id ? <CheckIcon aria-hidden /> : <DownloadIcon aria-hidden />}
                        {saved === artifact.id ? t('fileui.saved') : t('fileui.download')}
                      </motion.span>
                    </AnimatePresence>
                  </Button>
                </footer>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
