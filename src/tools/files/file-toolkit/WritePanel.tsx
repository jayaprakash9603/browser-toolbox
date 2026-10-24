import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EyeIcon, FileUpIcon, LoaderCircleIcon, Settings2Icon, TriangleAlertIcon, WandSparklesIcon, XIcon } from 'lucide-react'

import {
  DEFAULT_DOCUMENT_SETTINGS,
  docToHtmlDocument,
  docToPlainText,
  docToRtf,
  documentStem,
  parseDocument,
  type DocumentSettings,
} from '@/core/engines/files/document'
import { docToDocx } from '@/core/engines/files/docx'
import { extensionOf, stemOf, TARGET_META } from '@/core/engines/files/kinds'
import { renderPdf, type PdfLayout } from '@/core/engines/files/pdfLayout'
import { layoutTextDocument } from '@/core/engines/files/pdfText'
import {
  DocumentPreview,
  PdfPagesPreview,
  PreviewDialog,
  bytesBlob,
  createArtifact,
  useFileDrop,
  type FileArtifact,
} from '@/shared/components/files'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { DocumentSettingsForm, PanelError, PanelSection } from './controls'
import { readText } from './convert'

const WRITE_FORMATS = ['pdf', 'docx', 'html', 'rtf', 'txt', 'md'] as const
type WriteFormat = (typeof WRITE_FORMATS)[number]

const FORMAT_LABELS: Record<WriteFormat, string> = {
  pdf: 'PDF',
  docx: 'Word',
  html: 'HTML',
  rtf: 'RTF',
  txt: 'TXT',
  md: 'Markdown',
}

const TEXT_ACCEPT = '.txt,.md,.markdown,.log,.csv,.json,.xml,.yaml,.yml,.html,.htm,.ini,.cfg,.sql,text/*'

const SAMPLE = `# Quarterly project update

A short **status report** generated right in your browser. Edit this text and watch the preview update.

## Highlights

- Shipped the new *onboarding* flow
- Cut page load time by **38%**
- [x] Security review completed
- [ ] Localisation for 4 more languages

## Next steps

1. Finalise the pricing page
2. Run the beta with 50 customers
3. Publish the changelog

> Simple tools, done well, beat clever tools done halfway.

\`\`\`
npm run build && npm test
\`\`\`

---

Questions? Write to [the team](mailto:team@example.com).
`

const MD_EXTENSIONS = new Set(['md', 'markdown', 'mdx'])

export function WritePanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [source, setSource] = useState('')
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_DOCUMENT_SETTINGS)
  const [format, setFormat] = useState<WriteFormat>('pdf')
  const [layout, setLayout] = useState<PdfLayout | null>(null)
  const [fileStem, setFileStem] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(true)
  const [artifact, setArtifact] = useState<FileArtifact | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deferred = useDeferredValue(source)
  const blocks = useMemo(() => parseDocument(deferred, settings.markdown), [deferred, settings.markdown])
  const empty = !deferred.trim()
  const words = useMemo(() => (deferred.match(/\S+/g) ?? []).length, [deferred])

  useEffect(() => {
    if (format !== 'pdf' || empty) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void layoutTextDocument(blocks, settings).then((next) => {
        if (!cancelled) setLayout(next)
      })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [blocks, settings, format, empty])

  const html = useMemo(() => (format === 'html' ? docToHtmlDocument(blocks, settings) : ''), [blocks, settings, format])
  const plain = useMemo(() => (format === 'txt' ? docToPlainText(blocks, settings.title) : ''), [blocks, settings.title, format])

  const openFile = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    try {
      const text = await readText(file)
      setSource(text)
      setFileStem(stemOf(file.name))
      setSettings((current) => ({ ...current, markdown: MD_EXTENSIONS.has(extensionOf(file.name)) }))
      setError(null)
    } catch {
      setError(t('fs.readError', { name: file.name }))
    }
  }

  const drop = useFileDrop((files) => void openFile(files))

  const build = async () => {
    if (!source.trim()) return
    setBusy(true)
    setError(null)
    try {
      const fresh = parseDocument(source, settings.markdown)
      const stem = documentStem(settings.title, source, fileStem ?? 'document')
      const base = { format: FORMAT_LABELS[format] }
      let next: FileArtifact
      if (format === 'pdf') {
        const pdf = await layoutTextDocument(fresh, settings)
        next = createArtifact({ ...base, name: `${stem}.pdf`, blob: await renderPdf(pdf), preview: { kind: 'pdf', layout: pdf } })
      } else if (format === 'docx') {
        next = createArtifact({
          ...base,
          name: `${stem}.docx`,
          blob: bytesBlob(docToDocx(fresh, settings), TARGET_META.docx.mime),
          preview: { kind: 'document', blocks: fresh, settings },
          note: t('fs.write.docxNote'),
        })
      } else if (format === 'rtf') {
        next = createArtifact({
          ...base,
          name: `${stem}.rtf`,
          blob: new Blob([docToRtf(fresh, settings)], { type: TARGET_META.rtf.mime }),
          preview: { kind: 'document', blocks: fresh, settings },
          note: t('fs.write.rtfNote'),
        })
      } else if (format === 'html') {
        const page = docToHtmlDocument(fresh, settings)
        next = createArtifact({ ...base, name: `${stem}.html`, blob: new Blob([page], { type: TARGET_META.html.mime }), preview: { kind: 'html', html: page } })
      } else {
        const text = format === 'txt' ? docToPlainText(fresh, settings.title) : settings.title ? `# ${settings.title}\n\n${source}` : source
        next = createArtifact({
          ...base,
          name: `${stem}.${format}`,
          blob: new Blob([text], { type: format === 'md' ? 'text/markdown;charset=utf-8' : TARGET_META.txt.mime }),
          preview: { kind: 'text', text, language: 'text' },
        })
      }
      setArtifact(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const editorActions = (
    <div className="flex items-center gap-0.5">
      <Button asChild variant="ghost" size="xs" className="cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
        <label>
          <FileUpIcon aria-hidden />
          <span className="hidden @[420px]:inline">{t('fs.write.open')}</span>
          <input
            type="file"
            accept={TEXT_ACCEPT}
            className="sr-only"
            aria-label={t('fs.write.open')}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              void openFile(files)
            }}
          />
        </label>
      </Button>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => {
          setSource(SAMPLE)
          setFileStem('project-update')
          setSettings((current) => ({ ...current, markdown: true }))
        }}
      >
        <WandSparklesIcon aria-hidden />
        <span className="hidden @[420px]:inline">{t('fs.write.sample')}</span>
      </Button>
      {source && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => {
            setSource('')
            setFileStem(null)
          }}
          aria-label={t('common.clear')}
        >
          <XIcon />
        </Button>
      )}
    </div>
  )

  return (
    <div className="grid items-start gap-3 @[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <PanelSection title={t('fs.write.sourceTitle')} icon={<FileUpIcon />} actions={editorActions}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">{t('fs.write.docTitle')}</span>
            <Input
              value={settings.title}
              onChange={(event) => setSettings((current) => ({ ...current, title: event.target.value }))}
              placeholder={t('fs.write.docTitlePlaceholder')}
              className="h-8 text-sm"
            />
          </label>
          <div {...drop.handlers} className={cn('relative rounded-lg transition-shadow', drop.active && 'ring-2 ring-primary ring-offset-2 ring-offset-card')}>
            <TextEditor
              value={source}
              onChange={setSource}
              wrap
              language="text"
              minRows={16}
              placeholder={t('fs.write.placeholder')}
              ariaLabel={t('fs.write.sourceTitle')}
            />
            {drop.active && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary backdrop-blur-[1px]">
                {t('fileui.release')}
              </div>
            )}
          </div>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {t('fs.write.stats', { words: words.toLocaleString(), chars: deferred.length.toLocaleString() })}
            {format === 'pdf' && layout && !empty ? ` · ${t('fs.write.pages', { count: layout.pages.length })}` : ''}
          </p>
        </PanelSection>

        <PanelSection
          title={t('fs.write.layoutTitle')}
          icon={<Settings2Icon />}
          actions={
            <Button variant="ghost" size="xs" onClick={() => setShowSettings((value) => !value)} aria-expanded={showSettings}>
              {showSettings ? t('fs.hide') : t('fs.show')}
            </Button>
          }
        >
          <AnimatePresence initial={false}>
            {showSettings && (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                <DocumentSettingsForm value={settings} onChange={setSettings} />
              </motion.div>
            )}
          </AnimatePresence>
        </PanelSection>
      </div>

      <PanelSection
        className="@[900px]:sticky @[900px]:top-0"
        title={t('fs.write.previewTitle')}
        icon={<EyeIcon />}
        actions={
          <Segmented
            size="sm"
            ariaLabel={t('fs.write.format')}
            value={format}
            onValueChange={setFormat}
            options={WRITE_FORMATS.map((value) => ({ value, label: FORMAT_LABELS[value] }))}
            className="max-w-full overflow-x-auto scrollbar-none"
          />
        }
      >
        <div
          className="scrollbar-styled max-h-[72dvh] min-h-72 overflow-y-auto rounded-xl border bg-muted/40 p-3 @[480px]:p-5"
          style={{
            backgroundImage: 'radial-gradient(color-mix(in srgb, var(--foreground) 9%, transparent) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        >
          {empty ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
              <div className="relative h-24 w-[4.25rem] rounded-[3px] bg-white shadow-md ring-1 ring-black/5">
                {[0, 1, 2, 3, 4].map((line) => (
                  <motion.span
                    key={line}
                    className="absolute left-2 h-1 rounded-full bg-slate-200"
                    style={{ top: 12 + line * 12, width: line === 0 ? '55%' : `${78 - line * 6}%` }}
                    initial={reduce ? false : { scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.1 + line * 0.08, duration: 0.4 }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium">{t('fs.write.emptyTitle')}</p>
              <p className="max-w-64 text-xs text-muted-foreground">{t('fs.write.emptyText')}</p>
            </div>
          ) : format === 'pdf' ? (
            layout ? (
              <div className="flex flex-col gap-3">
                {layout.lossyGlyphs && (
                  <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {t('fileui.lossyGlyphs')}
                  </p>
                )}
                <PdfPagesPreview layout={layout} initialPages={4} />
              </div>
            ) : (
              <div className="mx-auto aspect-[1/1.414] w-full max-w-md animate-pulse rounded-[3px] bg-background/80 shadow-sm" aria-hidden />
            )
          ) : format === 'docx' || format === 'rtf' ? (
            <DocumentPreview blocks={blocks} settings={settings} />
          ) : format === 'html' ? (
            <iframe title={t('fs.write.previewTitle')} sandbox="" srcDoc={html} className="h-[62dvh] w-full rounded-lg border bg-white" />
          ) : (
            <pre className="rounded-lg border bg-background p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
              {format === 'txt' ? plain : settings.title ? `# ${settings.title}\n\n${deferred}` : deferred}
            </pre>
          )}
        </div>
        {error && <PanelError message={error} />}
        <Button onClick={() => void build()} disabled={empty || busy} className="w-full">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <EyeIcon aria-hidden />}
          {busy ? t('fs.building') : t('fs.write.build', { format: FORMAT_LABELS[format] })}
        </Button>
      </PanelSection>

      <PreviewDialog
        artifacts={artifact ? [artifact] : []}
        index={artifact ? 0 : null}
        onIndexChange={(index) => {
          if (index === null) setArtifact(null)
        }}
      />
    </div>
  )
}
