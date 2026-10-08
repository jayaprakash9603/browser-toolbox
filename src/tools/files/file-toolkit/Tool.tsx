import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileUpIcon, ImagesIcon } from 'lucide-react'

import { csvToRecords } from '@/core/engines/csv'
import { formatJson } from '@/core/engines/json'
import { fileToDataUrl, loadImageFromDataUrl } from '@/core/engines/image'
import { downloadDataUrl } from '@/core/engines/capture'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { TextEditor } from '@/shared/components/TextEditor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JsonErrorView } from '@/tools/developer/_shared'
import { useFileTool } from '../_shared'

type FileTab = 'csv' | 'json' | 'text' | 'pdf'

export default function FileToolkitTool() {
  const { t } = useTranslation()
  const tool = useFileTool('files.file-toolkit')
  const [tab, setTab] = useState<FileTab>('csv')
  const [fileName, setFileName] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pdfImages, setPdfImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const readTextFile = async (file: File | null) => {
    if (!file) return
    setFileName(file.name)
    setError(null)
    setContent(await file.text())
  }

  const addImages = async (files: FileList | null) => {
    if (!files) return
    const urls: string[] = []
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) urls.push(await fileToDataUrl(file))
    }
    setPdfImages((prev) => [...prev, ...urls])
  }

  const buildPdf = async () => {
    if (pdfImages.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      for (let index = 0; index < pdfImages.length; index += 1) {
        const img = await loadImageFromDataUrl(pdfImages[index])
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const ratio = Math.min(
          (pageWidth - 20) / img.naturalWidth,
          (pageHeight - 20) / img.naturalHeight,
        )
        const width = img.naturalWidth * ratio
        const height = img.naturalHeight * ratio
        if (index > 0) doc.addPage()
        doc.addImage(
          pdfImages[index],
          'PNG',
          (pageWidth - width) / 2,
          (pageHeight - height) / 2,
          width,
          height,
        )
      }
      const blob = doc.output('datauristring')
      downloadDataUrl(blob, `images-${Date.now()}.pdf`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not build the PDF.')
    }
    setBusy(false)
  }

  const csvTable = tab === 'csv' && content ? csvToRecords(content) : null
  const jsonPretty = tab === 'json' && content ? formatJson(content) : null

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as FileTab)
            setError(null)
          }}
        >
          <TabsList className="flex-wrap">
            <TabsTrigger value="csv">CSV</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="text">{t('files.text')}</TabsTrigger>
            <TabsTrigger value="pdf">{t('files.toPdf')}</TabsTrigger>
          </TabsList>

        {tab !== 'pdf' && (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-5 text-xs text-muted-foreground hover:bg-accent/40">
            <FileUpIcon className="size-4" />
            {fileName || t('files.open')}
            <input
              type="file"
              accept={tab === 'csv' ? '.csv,.tsv' : tab === 'json' ? '.json' : '.txt,.md,.log'}
              className="hidden"
              onChange={(e) => void readTextFile(e.target.files?.[0] ?? null)}
              aria-label={t('files.open')}
            />
          </label>
        )}
        {error && <JsonErrorView message={error} />}

        <TabsContent value="csv" className="mt-0">
          {csvTable && !csvTable.ok && <JsonErrorView message={csvTable.error} />}
          {csvTable?.ok && (
            <div className="max-h-80 overflow-auto rounded-md border">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {csvTable.value.headers.map((header) => (
                      <th key={header} className="border-b px-1.5 py-1 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvTable.value.records.slice(0, 200).map((record, index) => (
                    <tr key={index} className="border-b last:border-0">
                      {csvTable.value.headers.map((header) => (
                        <td key={header} className="px-1.5 py-1 font-mono">
                          {record[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvTable.value.records.length > 200 && (
                <p className="p-1.5 text-center text-[11px] text-muted-foreground">
                  {t('files.truncated', { count: 200 })}
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="json" className="mt-0">
          {jsonPretty && !jsonPretty.ok && (
            <JsonErrorView
              message={jsonPretty.error.message}
              line={jsonPretty.error.line}
              column={jsonPretty.error.column}
              suggestion={jsonPretty.error.suggestion}
            />
          )}
          {jsonPretty?.ok && (
            <pre className="max-h-80 scrollbar-both rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
              {jsonPretty.value}
            </pre>
          )}
        </TabsContent>

        <TabsContent value="text" className="mt-0">
          {content && (
            <TextEditor value={content} readOnly minRows={14} ariaLabel={t('files.content')} />
          )}
        </TabsContent>

        <TabsContent value="pdf" className="mt-0 flex flex-col gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-5 text-xs text-muted-foreground hover:bg-accent/40">
            <ImagesIcon className="size-4" />
            {t('files.addImages')}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void addImages(e.target.files)}
              aria-label={t('files.addImages')}
            />
          </label>
          {pdfImages.length > 0 && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {pdfImages.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`${index + 1}`}
                    className="size-14 rounded border object-cover"
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" onClick={() => void buildPdf()} disabled={busy}>
                  {busy ? t('files.building') : t('files.buildPdf', { count: pdfImages.length })}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPdfImages([])}>
                  {t('common.clear')}
                </Button>
              </div>
            </>
          )}
        </TabsContent>
        </Tabs>
      </div>
    </ToolPage>
  )
}
