import { useMemo, useState } from 'react'

import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useTranslation } from 'react-i18next'
import { FileJsonIcon, FileSpreadsheetIcon, FileTextIcon, InfoIcon, type LucideIcon } from 'lucide-react'

import { parseCsv } from '@/core/engines/csv'
import { formatJson } from '@/core/engines/json'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import type { EditorLanguage } from '@/shared/lib/code-editor/languages'
import { JsonErrorView } from '@/tools/developer/_shared'
import { useFileTool } from '../_shared'
import { CsvTableView } from './CsvTableView'
import { FileDropzone } from './FileDropzone'
import { FileSummaryCard } from './FileSummaryCard'
import { ImagesToPdfView } from './ImagesToPdfView'
import {
  acceptFor,
  acceptLabel,
  countLines,
  delimiterLabel,
  detectFileKind,
  readLoadedFile,
  splitFileName,
  type FileTab,
  type LoadedFile,
  type TextFileKind,
} from './fileKinds'

const KIND_ICONS: Record<TextFileKind, LucideIcon> = {
  csv: FileSpreadsheetIcon,
  json: FileJsonIcon,
  text: FileTextIcon,
}

const TEXT_LANGUAGES: Record<string, EditorLanguage> = {
  XML: 'xml',
  YAML: 'yaml',
  YML: 'yaml',
  SQL: 'sql',
}

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

export default function FileToolkitTool() {
  const { t } = useTranslation()
  const tool = useFileTool('files.file-toolkit')
  const [tab, setTab] = useDeepLinkTab('tab', ['csv', 'json', 'text', 'pdf'] as const, 'csv')
  const [files, setFiles] = useState<Partial<Record<TextFileKind, LoadedFile>>>({})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const tabLabels: Record<FileTab, string> = {
    csv: 'CSV',
    json: 'JSON',
    text: t('files.text'),
    pdf: t('files.toPdf'),
  }

  const openFiles = async (incoming: File[], target: TextFileKind) => {
    const file = incoming[0]
    if (!file) return
    const kind = detectFileKind(file)
    if (!kind) {
      setError(t('files.unsupported', { name: file.name }))
      return
    }
    try {
      const loaded = await readLoadedFile(file)
      setFiles((prev) => ({ ...prev, [kind]: loaded }))
      setError(null)
      if (kind !== target) {
        setTab(kind)
        setNotice(t('files.switchedTab', { name: file.name, tab: tabLabels[kind] }))
      } else {
        setNotice(null)
      }
    } catch {
      setError(t('files.readError', { name: file.name }))
    }
  }

  const csvRows = useMemo(() => (files.csv ? parseCsv(files.csv.content) : null), [files.csv])
  const jsonPretty = useMemo(() => (files.json ? formatJson(files.json.content) : null), [files.json])

  const statsFor = (kind: TextFileKind, file: LoadedFile): string[] => {
    if (kind === 'csv' && csvRows?.ok) {
      const columns = csvRows.value.reduce((max, row) => Math.max(max, row.length), 0)
      return [
        t('files.rows', { count: Math.max(0, csvRows.value.length - 1) }),
        t('files.columns', { count: columns }),
        t('files.delimiter', { value: delimiterLabel(file.content) }),
      ]
    }
    if (kind === 'json') {
      const shape = jsonShape(file.content)
      const stats = [t('files.lines', { count: countLines(jsonPretty?.ok ? jsonPretty.value : file.content) })]
      if (shape.keys !== undefined) stats.push(t('files.keys', { count: shape.keys }))
      if (shape.items !== undefined) stats.push(t('files.items', { count: shape.items }))
      return stats
    }
    return [t('files.lines', { count: countLines(file.content) })]
  }

  const renderFileHeader = (kind: TextFileKind) => {
    const file = files[kind]
    if (!file) {
      return (
        <FileDropzone
          accept={acceptFor(kind)}
          acceptLabel={acceptLabel(kind)}
          icon={KIND_ICONS[kind]}
          title={t(`files.drop.${kind}`)}
          onFiles={(incoming) => void openFiles(incoming, kind)}
        />
      )
    }
    return (
      <FileSummaryCard
        file={file}
        icon={KIND_ICONS[kind]}
        accept={acceptFor(kind)}
        stats={statsFor(kind, file)}
        onReplace={(incoming) => void openFiles(incoming, kind)}
        onRemove={() => {
          setFiles((prev) => ({ ...prev, [kind]: undefined }))
          setNotice(null)
        }}
      />
    )
  }

  const textLanguage = files.text
    ? (TEXT_LANGUAGES[splitFileName(files.text.name).extension] ?? 'text')
    : 'text'

  return (
    <ToolPage tool={tool}>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as FileTab)
          setError(null)
          setNotice(null)
        }}
        className="flex flex-col gap-3"
      >
        <TabsList className="flex-wrap">
          {(Object.keys(tabLabels) as FileTab[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {tabLabels[key]}
            </TabsTrigger>
          ))}
        </TabsList>

        {notice && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground"
          >
            <InfoIcon className="size-3.5 shrink-0 text-primary" aria-hidden />
            {notice}
          </p>
        )}
        {error && <JsonErrorView message={error} />}

        <TabsContent value="csv" forceMount className="mt-0 flex flex-col gap-3 data-[state=inactive]:hidden">
          {renderFileHeader('csv')}
          {csvRows && !csvRows.ok && <JsonErrorView message={csvRows.error} />}
          {csvRows?.ok && <CsvTableView key={files.csv ? `${files.csv.name}:${files.csv.size}:${files.csv.lastModified}` : undefined} rows={csvRows.value} />}
        </TabsContent>

        <TabsContent value="json" forceMount className="mt-0 flex flex-col gap-3 data-[state=inactive]:hidden">
          {renderFileHeader('json')}
          {jsonPretty && !jsonPretty.ok && (
            <JsonErrorView
              message={jsonPretty.error.message}
              line={jsonPretty.error.line}
              column={jsonPretty.error.column}
              suggestion={jsonPretty.error.suggestion}
            />
          )}
          {jsonPretty?.ok && (
            <TextEditor
              value={jsonPretty.value}
              readOnly
              language="json"
              minRows={16}
              ariaLabel={t('files.content')}
            />
          )}
        </TabsContent>

        <TabsContent value="text" forceMount className="mt-0 flex flex-col gap-3 data-[state=inactive]:hidden">
          {renderFileHeader('text')}
          {files.text && (
            <TextEditor
              value={files.text.content}
              readOnly
              language={textLanguage}
              minRows={16}
              ariaLabel={t('files.content')}
            />
          )}
        </TabsContent>

        <TabsContent value="pdf" forceMount className="mt-0 data-[state=inactive]:hidden">
          <ImagesToPdfView />
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
