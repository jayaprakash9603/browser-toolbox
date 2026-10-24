import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRightLeftIcon } from 'lucide-react'

import { parseCsv } from '@/core/engines/csv'
import { parseDataSource, type DataFormat } from '@/core/engines/files/data'
import { parseDocument, DEFAULT_DOCUMENT_SETTINGS } from '@/core/engines/files/document'
import { familyOf, isTextFamily, type FileFamily } from '@/core/engines/files/kinds'
import { formatJson } from '@/core/engines/json'
import { DocumentPreview, FileDropZone, TablePreview, languageFor } from '@/shared/components/files'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { JsonErrorView } from '@/tools/developer/_shared'
import { PanelError } from './controls'
import { CsvTableView } from './CsvTableView'
import { FileSummaryCard } from './FileSummaryCard'
import { countLines, delimiterLabel, readLoadedFile, type LoadedFile } from './fileKinds'

const VIEW_ACCEPT =
  '.csv,.tsv,.json,.jsonl,.ndjson,.geojson,.yaml,.yml,.xml,.md,.markdown,.txt,.log,.ini,.env,.sql,.toml,.html,.css,.js,.ts,text/*,application/json'
const VIEW_FORMATS = ['CSV', 'TSV', 'JSON', 'YAML', 'XML', 'MD', 'TXT', 'LOG']

type ViewMode = 'table' | 'source' | 'rendered'

function jsonShape(source: string): { keys?: number; items?: number } {
  try {
    const value: unknown = JSON.parse(source)
    if (Array.isArray(value)) return { items: value.length }
    if (value && typeof value === 'object') return { keys: Object.keys(value).length }
  } catch {
    /* invalid JSON is reported by the viewer */
  }
  return {}
}

interface ViewPanelProps {
  onConvert: (file: File) => void
}

export function ViewPanel({ onConvert }: ViewPanelProps) {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState<{ file: File; text: LoadedFile; family: FileFamily } | null>(null)
  const [mode, setMode] = useState<ViewMode>('table')
  const [error, setError] = useState<string | null>(null)

  const open = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    const family = familyOf(file)
    if (!isTextFamily(family)) {
      setError(t('fs.view.unsupported', { name: file.name }))
      return
    }
    try {
      const text = await readLoadedFile(file)
      setLoaded({ file, text, family })
      setMode(family === 'markdown' ? 'rendered' : 'table')
      setError(null)
    } catch {
      setError(t('fs.readError', { name: file.name }))
    }
  }

  const content = loaded?.text.content ?? ''
  const family = loaded?.family

  const csv = useMemo(
    () => (family === 'csv' || family === 'tsv' ? parseCsv(content, family === 'tsv' ? { delimiter: '\t' } : {}) : null),
    [content, family],
  )
  const json = useMemo(() => (family === 'json' ? formatJson(content) : null), [content, family])
  const table = useMemo(() => {
    if (family !== 'json' && family !== 'yaml' && family !== 'xml') return null
    const parsed = parseDataSource(content, family as DataFormat, loaded?.text.name)
    return parsed.ok && parsed.value.table[0]?.length && parsed.value.table.length > 1 ? parsed.value.table : null
  }, [content, family, loaded?.text.name])
  const blocks = useMemo(() => (family === 'markdown' ? parseDocument(content, true) : null), [content, family])

  if (!loaded) {
    return (
      <div className="flex flex-col gap-3">
        <FileDropZone
          title={t('fs.view.dropTitle')}
          hint={t('fs.view.dropHint')}
          formats={VIEW_FORMATS}
          glyphs={['CSV', 'JSON', 'MD']}
          accept={VIEW_ACCEPT}
          onFiles={(files) => void open(files)}
        />
        {error && <PanelError message={error} />}
      </div>
    )
  }

  const stats: string[] = []
  if (csv?.ok) {
    const columns = csv.value.reduce((max, row) => Math.max(max, row.length), 0)
    stats.push(t('files.rows', { count: Math.max(0, csv.value.length - 1) }), t('files.columns', { count: columns }))
    if (family === 'csv') stats.push(t('files.delimiter', { value: delimiterLabel(content) }))
  } else if (family === 'json') {
    const shape = jsonShape(content)
    stats.push(t('files.lines', { count: countLines(json?.ok ? json.value : content) }))
    if (shape.keys !== undefined) stats.push(t('files.keys', { count: shape.keys }))
    if (shape.items !== undefined) stats.push(t('files.items', { count: shape.items }))
  } else {
    stats.push(t('files.lines', { count: countLines(content) }))
  }

  const modes: { value: ViewMode; label: string }[] =
    family === 'markdown'
      ? [
          { value: 'rendered', label: t('fileui.rendered') },
          { value: 'source', label: t('fileui.source') },
        ]
      : table
        ? [
            { value: 'table', label: t('fileui.table') },
            { value: 'source', label: t('fileui.source') },
          ]
        : []
  const current = modes.some((option) => option.value === mode) ? mode : (modes[0]?.value ?? 'source')
  const sourceText = family === 'json' && json?.ok ? json.value : content

  return (
    <div className="flex flex-col gap-3">
      <FileSummaryCard
        file={loaded.text}
        accept={VIEW_ACCEPT}
        stats={stats}
        onReplace={(files) => void open(files)}
        onRemove={() => setLoaded(null)}
        actions={
          <Button variant="outline" size="xs" onClick={() => onConvert(loaded.file)}>
            <ArrowRightLeftIcon aria-hidden />
            <span className="hidden @[420px]:inline">{t('fs.view.convert')}</span>
          </Button>
        }
      />
      {error && <PanelError message={error} />}

      {modes.length > 0 && (
        <Segmented size="sm" ariaLabel={t('fileui.viewAs')} value={current} onValueChange={setMode} options={modes} className="self-start" />
      )}

      {csv && !csv.ok && <JsonErrorView message={csv.error} />}
      {csv?.ok && <CsvTableView key={`${loaded.text.name}:${loaded.text.size}:${loaded.text.lastModified}`} rows={csv.value} />}

      {json && !json.ok && current === 'source' && (
        <JsonErrorView message={json.error.message} line={json.error.line} column={json.error.column} suggestion={json.error.suggestion} />
      )}

      {table && current === 'table' && <TablePreview rows={table} />}

      {blocks && current === 'rendered' && (
        <div className="rounded-2xl border bg-muted/40 p-3 @[480px]:p-5">
          <DocumentPreview blocks={blocks} settings={{ ...DEFAULT_DOCUMENT_SETTINGS, markdown: true }} />
        </div>
      )}

      {!csv && current === 'source' && (
        <TextEditor value={sourceText} readOnly language={languageFor(loaded.text.name)} minRows={18} ariaLabel={t('files.content')} />
      )}
    </div>
  )
}
