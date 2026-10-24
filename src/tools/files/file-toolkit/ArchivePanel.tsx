import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EyeIcon, FileArchiveIcon, LoaderCircleIcon, PackageIcon, PackageOpenIcon, SearchIcon, Trash2Icon, XIcon } from 'lucide-react'

import {
  gunzipFile,
  gzipFile,
  isGzip,
  uniqueName,
  unzipEntries,
  zipEntries,
  type ArchiveEntry,
  type CompressionLevel,
} from '@/core/engines/files/archive'
import { extensionOf } from '@/core/engines/files/kinds'
import { formatBytes } from '@/core/engines/image'
import {
  FileDropZone,
  FileGlyph,
  PreviewDialog,
  artifactFromBytes,
  bytesBlob,
  createArtifact,
  type FileArtifact,
} from '@/shared/components/files'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { OptionSelect, PanelError, PanelSection } from './controls'
import { readBytes } from './convert'

type ArchiveMode = 'zip' | 'unzip' | 'gzip'

const LEVELS = ['6', '9', '1', '0'] as const
const PREVIEW_LIMIT = 300

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

export function RatioBars({ before, after }: { before: number; after: number }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const max = Math.max(before, after, 1)
  const saved = before > 0 ? 1 - after / before : 0
  const rows = [
    { label: t('fs.archive.before'), value: before, tone: 'bg-muted-foreground/35' },
    { label: t('fs.archive.after'), value: after, tone: 'bg-gradient-to-r from-[var(--hero-from)] to-[var(--hero-to)]' },
  ]
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border bg-background/70 p-3">
      {rows.map((row, index) => (
        <div key={row.label} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-[11px]">
          <span className="text-muted-foreground">{row.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn('h-full rounded-full', row.tone)}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${Math.max(1.5, (row.value / max) * 100)}%` }}
              transition={{ duration: 0.6, delay: index * 0.12, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </div>
          <span className="tabular-nums font-medium">{formatBytes(row.value)}</span>
        </div>
      ))}
      <p className={cn('text-right text-[11px] font-semibold tabular-nums', saved > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground')}>
        {saved > 0 ? t('fs.archive.saved', { percent: Math.round(saved * 100) }) : t('fs.archive.grew', { percent: Math.round(-saved * 100) })}
      </p>
    </div>
  )
}

function ZipCreator() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [files, setFiles] = useState<{ id: string; file: File }[]>([])
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('6')
  const [name, setName] = useState('archive')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [artifact, setArtifact] = useState<FileArtifact | null>(null)
  const [open, setOpen] = useState(false)
  const total = files.reduce((sum, item) => sum + item.file.size, 0)

  const add = (incoming: File[]) => setFiles((current) => [...current, ...incoming.map((file) => ({ id: crypto.randomUUID(), file }))])

  const build = async () => {
    setBusy(true)
    setError(null)
    try {
      const inputs = await Promise.all(
        files.map(async ({ file }) => ({ name: file.name, bytes: await readBytes(file), lastModified: file.lastModified })),
      )
      const bytes = zipEntries(inputs, Number(level) as CompressionLevel)
      const zipName = `${(name.trim() || 'archive').replace(/[\\/:*?"<>|]+/g, '')}.zip`
      const used = new Set<string>()
      setArtifact(
        createArtifact({
          name: zipName,
          format: 'ZIP',
          blob: bytesBlob(bytes, 'application/zip'),
          source: { name: t('fs.archive.filesLabel', { count: files.length }), size: total },
          preview: { kind: 'archive', entries: files.map(({ file }) => ({ path: uniqueName(file.name, used), size: file.size })) },
        }),
      )
      setOpen(true)
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  if (!files.length) {
    return <FileDropZone title={t('fs.archive.zipDrop')} hint={t('fs.archive.zipHint')} glyphs={['PDF', 'ZIP', 'PNG']} multiple onFiles={add} />
  }

  return (
    <div className="flex flex-col gap-3">
      <PanelSection
        title={t('fs.archive.zipTitle', { count: files.length })}
        icon={<PackageIcon />}
        actions={
          <Button variant="ghost" size="xs" onClick={() => setFiles([])} disabled={busy}>
            <Trash2Icon aria-hidden />
            {t('fs.clearAll')}
          </Button>
        }
      >
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto scrollbar-styled">
          <AnimatePresence initial={false}>
            {files.map(({ id, file }) => (
              <motion.li
                key={id}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="flex items-center gap-2.5 rounded-lg border bg-background/70 px-2 py-1.5"
              >
                <FileGlyph extension={extensionOf(file.name) || 'bin'} className="h-8" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium" title={file.name}>
                  {file.name}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{formatBytes(file.size)}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setFiles((current) => current.filter((item) => item.id !== id))}
                  disabled={busy}
                  aria-label={t('fs.removeFile', { name: file.name })}
                >
                  <XIcon />
                </Button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <FileDropZone compact multiple title={t('fs.addMore')} onFiles={add} />
        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">{t('fs.archive.zipName')}</span>
            <div className="flex items-center rounded-md border border-input bg-background pr-2 shadow-xs focus-within:ring-2 focus-within:ring-ring/50">
              <Input value={name} onChange={(event) => setName(event.target.value)} className="h-8 border-0 shadow-none focus-visible:ring-0" />
              <span className="text-xs text-muted-foreground">.zip</span>
            </div>
          </label>
          <OptionSelect
            label={t('fs.archive.level')}
            value={level}
            onChange={setLevel}
            options={LEVELS.map((value) => ({ value, label: t(`fs.level.${value}`) }))}
          />
        </div>
      </PanelSection>
      {artifact && !busy && <RatioBars before={total} after={artifact.blob.size} />}
      {error && <PanelError message={error} />}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void build()} disabled={busy}>
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <FileArchiveIcon aria-hidden />}
          {busy ? t('fs.building') : t('fs.archive.zipBuild', { count: files.length })}
        </Button>
        {artifact && !busy && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <EyeIcon aria-hidden />
            {t('fs.preview')}
          </Button>
        )}
      </div>
      <PreviewDialog
        artifacts={artifact ? [artifact] : []}
        index={artifact && open ? 0 : null}
        onIndexChange={(index) => setOpen(index !== null)}
      />
    </div>
  )
}

function ZipExtractor() {
  const { t } = useTranslation()
  const [archive, setArchive] = useState<{ name: string; size: number } | null>(null)
  const [entries, setEntries] = useState<ArchiveEntry[]>([])
  const [artifacts, setArtifacts] = useState<FileArtifact[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<number | null>(null)

  const open = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const list = unzipEntries(await readBytes(file))
      setArchive({ name: file.name, size: file.size })
      setEntries(list)
      setQuery('')
      const built: FileArtifact[] = []
      for (const entry of list.slice(0, PREVIEW_LIMIT)) built.push(await artifactFromBytes(entry.name, entry.bytes, { source: { name: file.name, size: entry.size } }))
      setArtifacts(built)
    } catch (cause) {
      setError(t('fs.archive.unzipError', { message: errorText(cause) }))
    } finally {
      setBusy(false)
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => !needle || entry.path.toLowerCase().includes(needle))
  }, [entries, query])

  if (!archive) {
    return (
      <div className="flex flex-col gap-3">
        <FileDropZone
          title={t('fs.archive.unzipDrop')}
          hint={busy ? t('fs.building') : t('fs.archive.unzipHint')}
          formats={['ZIP', 'DOCX', 'XLSX', 'EPUB', 'JAR']}
          glyphs={['TXT', 'ZIP', 'JPG']}
          accept=".zip,.docx,.xlsx,.pptx,.epub,.jar,application/zip"
          onFiles={(files) => void open(files)}
        />
        {error && <PanelError message={error} />}
      </div>
    )
  }

  const unpacked = entries.reduce((sum, entry) => sum + entry.size, 0)

  return (
    <div className="flex flex-col gap-3">
      <PanelSection
        title={archive.name}
        icon={<PackageOpenIcon />}
        actions={
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setArchive(null)
              setEntries([])
              setArtifacts([])
            }}
          >
            <XIcon aria-hidden />
            {t('fs.archive.close')}
          </Button>
        }
      >
        <RatioBars before={unpacked} after={archive.size} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-40 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('fs.archive.filter', { count: entries.length })}
              aria-label={t('fs.archive.filterLabel')}
              className="h-8 pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setPreview(0)} disabled={!artifacts.length}>
            <EyeIcon aria-hidden />
            {t('fs.archive.previewAll')}
          </Button>
        </div>
        <ul className="flex max-h-[26rem] flex-col divide-y overflow-y-auto rounded-xl border bg-background/70 scrollbar-styled">
          {filtered.map(({ entry, index }) => (
            <li key={entry.path}>
              <button
                type="button"
                onClick={() => setPreview(index)}
                disabled={index >= artifacts.length}
                className="flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent disabled:cursor-default"
              >
                <FileGlyph extension={extensionOf(entry.name) || 'bin'} className="h-7" />
                <span className="min-w-0 flex-1 truncate text-xs" title={entry.path}>
                  {entry.folder && <span className="text-muted-foreground">{entry.folder}/</span>}
                  <span className="font-medium">{entry.name}</span>
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{formatBytes(entry.size)}</span>
                {index < artifacts.length && <EyeIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted-foreground">{t('fs.archive.noMatch')}</li>}
        </ul>
        {entries.length > PREVIEW_LIMIT && <p className="text-[11px] text-muted-foreground">{t('fs.archive.previewLimit', { count: PREVIEW_LIMIT })}</p>}
      </PanelSection>
      <PreviewDialog artifacts={artifacts} index={preview} onIndexChange={setPreview} zipName={archive.name} />
    </div>
  )
}

interface GzipResult {
  id: string
  source: File
  artifact?: FileArtifact
  error?: string
  direction: 'compress' | 'extract'
}

function GzipTool() {
  const { t } = useTranslation()
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('9')
  const [results, setResults] = useState<GzipResult[]>([])
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<number | null>(null)
  const artifacts = results.flatMap((result) => (result.artifact ? [result.artifact] : []))

  const process = async (files: File[]) => {
    setBusy(true)
    const next: GzipResult[] = []
    for (const file of files) {
      const id = crypto.randomUUID()
      try {
        const bytes = await readBytes(file)
        if (isGzip(bytes)) {
          const output = gunzipFile(bytes, file.name)
          next.push({ id, source: file, direction: 'extract', artifact: await artifactFromBytes(output.name, output.bytes, { source: { name: file.name, size: file.size } }) })
        } else {
          next.push({
            id,
            source: file,
            direction: 'compress',
            artifact: createArtifact({
              name: `${file.name}.gz`,
              format: 'GZIP',
              blob: bytesBlob(gzipFile(bytes, file.name, Number(level) as CompressionLevel, file.lastModified), 'application/gzip'),
              source: { name: file.name, size: file.size },
              preview: { kind: 'archive', entries: [{ path: file.name, size: file.size }] },
            }),
          })
        }
      } catch (cause) {
        next.push({ id, source: file, direction: 'extract', error: errorText(cause) })
      }
    }
    setResults((current) => [...next, ...current])
    setBusy(false)
    const first = next.find((result) => result.artifact)?.artifact
    if (first && next.length === 1) setPreview(0)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid items-end gap-3 @[560px]:grid-cols-[1fr_12rem]">
        <FileDropZone
          compact={results.length > 0}
          title={t('fs.archive.gzipDrop')}
          hint={busy ? t('fs.building') : t('fs.archive.gzipHint')}
          formats={['GZ', 'TGZ', 'LOG', 'JSON', 'CSV', 'SQL']}
          glyphs={['LOG', 'GZ', 'SQL']}
          multiple
          onFiles={(files) => void process(files)}
        />
        <OptionSelect
          label={t('fs.archive.level')}
          value={level}
          onChange={setLevel}
          options={LEVELS.map((value) => ({ value, label: t(`fs.level.${value}`) }))}
        />
      </div>
      {results.length > 0 && (
        <PanelSection
          title={t('fs.archive.gzipResults', { count: results.length })}
          icon={<FileArchiveIcon />}
          actions={
            <Button variant="ghost" size="xs" onClick={() => setResults([])}>
              <Trash2Icon aria-hidden />
              {t('fs.clearAll')}
            </Button>
          }
        >
          <ul className="grid gap-2 @[640px]:grid-cols-2">
            {results.map((result) => (
              <li key={result.id} className="flex flex-col gap-2 rounded-xl border bg-background/70 p-2.5">
                <div className="flex items-center gap-2">
                  <FileGlyph extension={result.artifact ? extensionOf(result.artifact.name) || 'bin' : 'err'} className="h-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{result.artifact?.name ?? result.source.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {result.error ? result.error : result.direction === 'compress' ? t('fs.archive.compressed') : t('fs.archive.extracted')}
                    </p>
                  </div>
                  {result.artifact && (
                    <Button variant="outline" size="xs" onClick={() => setPreview(artifacts.indexOf(result.artifact as FileArtifact))}>
                      <EyeIcon aria-hidden />
                      {t('fs.preview')}
                    </Button>
                  )}
                </div>
                {result.artifact &&
                  (result.direction === 'compress' ? (
                    <RatioBars before={result.source.size} after={result.artifact.blob.size} />
                  ) : (
                    <RatioBars before={result.artifact.blob.size} after={result.source.size} />
                  ))}
              </li>
            ))}
          </ul>
        </PanelSection>
      )}
      <PreviewDialog artifacts={artifacts} index={preview} onIndexChange={setPreview} zipName="gzip-results.zip" />
    </div>
  )
}

export function ArchivePanel() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ArchiveMode>('zip')
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        ariaLabel={t('fs.archive.modeLabel')}
        value={mode}
        onValueChange={setMode}
        options={[
          { value: 'zip', label: t('fs.archive.modeZip') },
          { value: 'unzip', label: t('fs.archive.modeUnzip') },
          { value: 'gzip', label: t('fs.archive.modeGzip') },
        ]}
        className="self-start"
      />
      <div className={cn(mode !== 'zip' && 'hidden')}>
        <ZipCreator />
      </div>
      <div className={cn(mode !== 'unzip' && 'hidden')}>
        <ZipExtractor />
      </div>
      <div className={cn(mode !== 'gzip' && 'hidden')}>
        <GzipTool />
      </div>
    </div>
  )
}
