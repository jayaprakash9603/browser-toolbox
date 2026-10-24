import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileQuestionIcon, TriangleAlertIcon } from 'lucide-react'

import { formatBytes } from '@/core/engines/image'
import { hexRows, type HexRow } from '@/core/engines/files/inspect'
import { PdfFilePreview } from '@/shared/components/pdf/PdfFilePreview'
import { TextEditor } from '@/shared/components/TextEditor'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { splitFileName, type ArchiveEntryInfo, type FileArtifact } from './artifact'
import { DocumentPreview } from './DocumentPreview'
import { FileGlyph } from './FileGlyph'
import { PdfPagesPreview } from './PdfPagePreview'

const TEXT_LIMIT = 300_000
const TABLE_LIMIT = 500

export function TablePreview({ rows, className }: { rows: string[][]; className?: string }) {
  const { t } = useTranslation()
  const [header = [], ...body] = rows
  const columns = Math.max(header.length, ...body.slice(0, TABLE_LIMIT).map((row) => row.length), 1)
  const shown = body.slice(0, TABLE_LIMIT)
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="scrollbar-both max-h-[60dvh] overflow-auto rounded-lg border bg-card">
        <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th scope="col" className="sticky top-0 left-0 z-20 border-r border-b bg-muted px-2 py-1.5 text-right font-medium text-muted-foreground">
                #
              </th>
              {Array.from({ length: columns }, (_, index) => (
                <th key={index} scope="col" className="sticky top-0 z-10 border-b bg-muted px-3 py-1.5 text-left font-semibold whitespace-nowrap">
                  {header[index] || t('fileui.column', { index: index + 1 })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, rowIndex) => (
              <tr key={rowIndex} className="even:[&>td]:bg-muted/30">
                <td className="sticky left-0 border-r border-b bg-card px-2 py-1 text-right tabular-nums text-muted-foreground">{rowIndex + 1}</td>
                {Array.from({ length: columns }, (_, index) => (
                  <td key={index} title={(row[index] ?? '').length > 40 ? row[index] : undefined} className="max-w-[32ch] truncate border-b px-3 py-1 whitespace-nowrap">
                    {row[index] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] tabular-nums text-muted-foreground">
        {t('fileui.rows', { shown: shown.length.toLocaleString(), total: body.length.toLocaleString() })}
      </p>
    </div>
  )
}

function TextPreview({ text, language, rows }: { text: string; language: Parameters<typeof TextEditor>[0]['language']; rows?: string[][] }) {
  const { t } = useTranslation()
  const [view, setView] = useState<'table' | 'text'>(rows ? 'table' : 'text')
  const clipped = text.length > TEXT_LIMIT ? text.slice(0, TEXT_LIMIT) : text
  return (
    <div className="flex flex-col gap-2">
      {rows && (
        <Segmented
          size="sm"
          ariaLabel={t('fileui.viewAs')}
          value={view}
          onValueChange={setView}
          options={[
            { value: 'table', label: t('fileui.table') },
            { value: 'text', label: t('fileui.text') },
          ]}
          className="self-start"
        />
      )}
      {view === 'table' && rows ? (
        <TablePreview rows={rows} />
      ) : (
        <TextEditor value={clipped} readOnly language={language} minRows={18} ariaLabel={t('fileui.previewContent')} />
      )}
      {text.length > TEXT_LIMIT && view === 'text' && (
        <p className="text-[11px] text-muted-foreground">{t('fileui.truncated', { limit: TEXT_LIMIT.toLocaleString() })}</p>
      )}
    </div>
  )
}

function HtmlPreview({ html }: { html: string }) {
  const { t } = useTranslation()
  const [view, setView] = useState<'rendered' | 'source'>('rendered')
  return (
    <div className="flex flex-col gap-2">
      <Segmented
        size="sm"
        ariaLabel={t('fileui.viewAs')}
        value={view}
        onValueChange={setView}
        options={[
          { value: 'rendered', label: t('fileui.rendered') },
          { value: 'source', label: t('fileui.source') },
        ]}
        className="self-start"
      />
      {view === 'rendered' ? (
        <iframe
          title={t('fileui.rendered')}
          sandbox=""
          srcDoc={html}
          className="h-[60dvh] min-h-80 w-full rounded-lg border bg-white"
        />
      ) : (
        <TextEditor value={html.slice(0, TEXT_LIMIT)} readOnly language="html" minRows={18} ariaLabel={t('fileui.previewContent')} />
      )}
    </div>
  )
}

function ImagePreview({ blob, width, height, name }: { blob: Blob; width: number; height: number; name: string }) {
  const { t } = useTranslation()
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        className="flex max-h-[62dvh] w-full items-center justify-center overflow-hidden rounded-xl border p-3"
        style={{
          backgroundImage:
            'conic-gradient(color-mix(in srgb, var(--foreground) 7%, transparent) 25%, transparent 0 50%, color-mix(in srgb, var(--foreground) 7%, transparent) 0 75%, transparent 0)',
          backgroundSize: '16px 16px',
        }}
      >
        <img src={url} alt={name} className="max-h-[58dvh] max-w-full object-contain drop-shadow-md" />
      </div>
      <figcaption className="text-[11px] tabular-nums text-muted-foreground">
        {t('fileui.dims', { width: width.toLocaleString(), height: height.toLocaleString() })}
      </figcaption>
    </figure>
  )
}

function ArchivePreview({ entries, total }: { entries: ArchiveEntryInfo[]; total: number }) {
  const { t } = useTranslation()
  const sum = entries.reduce((acc, entry) => acc + entry.size, 0)
  const ratio = sum > 0 ? Math.min(1, total / sum) : 1
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border bg-card p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium">{t('fileui.entries', { count: entries.length })}</span>
          <span className="tabular-nums text-muted-foreground">
            {formatBytes(sum)} → {formatBytes(total)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--hero-from)] to-[var(--hero-to)] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(2, ratio * 100)}%` }}
          />
        </div>
      </div>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {entries.slice(0, 400).map((entry) => {
          const { ext } = splitFileName(entry.path)
          return (
            <li key={entry.path} className="flex items-center gap-2.5 px-3 py-1.5">
              <FileGlyph extension={ext} className="h-7" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs" title={entry.path}>
                {entry.path}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{formatBytes(entry.size)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function BinaryPreview({ blob }: { blob: Blob }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<HexRow[] | null>(null)
  useEffect(() => {
    let cancelled = false
    void blob
      .slice(0, 256)
      .arrayBuffer()
      .then((buffer) => {
        if (!cancelled) setRows(hexRows(new Uint8Array(buffer), 0, 256))
      })
    return () => {
      cancelled = true
    }
  }, [blob])
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
        <FileQuestionIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          {t('fileui.binary')} {t('fileui.binaryOpen')}
        </p>
      </div>
      {rows && <HexTable rows={rows} />}
    </div>
  )
}

export function HexTable({ rows }: { rows: HexRow[] }) {
  return (
    <div className="scrollbar-both overflow-auto rounded-lg border bg-card">
      <table className="w-max min-w-full font-mono text-[11px] leading-5">
        <tbody>
          {rows.map((row) => (
            <tr key={row.offset} className="even:bg-muted/30">
              <td className="border-r px-2 text-muted-foreground tabular-nums">{row.offset.toString(16).padStart(8, '0')}</td>
              <td className="px-2 whitespace-pre tabular-nums">
                {row.hex.slice(0, 8).join(' ')}
                {row.hex.length > 8 ? `  ${row.hex.slice(8).join(' ')}` : ''}
              </td>
              <td className="border-l px-2 whitespace-pre text-muted-foreground">{row.ascii}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Renders the right preview for any generated file. */
export function ArtifactPreview({ artifact }: { artifact: FileArtifact }) {
  const { t } = useTranslation()
  const { preview } = artifact
  const lossy = preview.kind === 'pdf' && preview.layout.lossyGlyphs
  return (
    <div className="flex flex-col gap-3">
      {lossy && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t('fileui.lossyGlyphs')}
        </p>
      )}
      {preview.kind === 'pdf' && <PdfPagesPreview layout={preview.layout} />}
      {preview.kind === 'document' && <DocumentPreview blocks={preview.blocks} settings={preview.settings} />}
      {preview.kind === 'html' && <HtmlPreview html={preview.html} />}
      {preview.kind === 'image' && (
        <ImagePreview blob={artifact.blob} width={preview.width} height={preview.height} name={artifact.name} />
      )}
      {preview.kind === 'text' && <TextPreview text={preview.text} language={preview.language} rows={preview.rows} />}
      {preview.kind === 'table' && <TablePreview rows={preview.rows} />}
      {preview.kind === 'archive' && <ArchivePreview entries={preview.entries} total={artifact.blob.size} />}
      {preview.kind === 'pdfFile' && <PdfFilePreview blob={artifact.blob} password={preview.password} />}
      {preview.kind === 'binary' && <BinaryPreview blob={artifact.blob} />}
    </div>
  )
}
