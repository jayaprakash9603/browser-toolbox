import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { CheckIcon, CopyIcon, DownloadIcon, SparklesIcon, TableIcon, WrapTextIcon } from 'lucide-react'

import { byteSize, formatBytes, type DataRow } from '@/core/engines/testdata'
import { DataPreviewTable } from '@/shared/components/DataPreviewTable'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { PREVIEW_LIMIT } from './shared'

interface ResultPanelProps {
  rows: DataRow[]
  columns: string[]
  /** Formatted preview text (already capped). */
  preview: string
  formatLabel: string
  onCopy: () => Promise<void> | void
  onDownload: () => void
  onGenerate: () => void
  canGenerate: boolean
}

export function ResultPanel({
  rows,
  columns,
  preview,
  formatLabel,
  onCopy,
  onDownload,
  onGenerate,
  canGenerate,
}: ResultPanelProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [view, setView] = useState<'table' | 'raw'>('table')
  const [copied, setCopied] = useState(false)

  if (rows.length === 0) {
    return (
      <div className="flex min-h-72 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
        <motion.div
          animate={reduce ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        >
          <SparklesIcon className="size-7" aria-hidden />
        </motion.div>
        <p className="max-w-56 text-xs text-muted-foreground">{t('testData.output.empty')}</p>
        <Button size="sm" onClick={onGenerate} disabled={!canGenerate}>
          {t('testData.controls.generate')}
        </Button>
      </div>
    )
  }

  const copy = async () => {
    await onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex min-h-80 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary">{t('testData.output.rows', { count: rows.length })}</Badge>
          <Badge variant="outline">{formatLabel}</Badge>
          <span className="font-mono text-[11px] text-muted-foreground">{formatBytes(byteSize(preview))}</span>
        </div>
        <div className="flex items-center gap-1">
          <Segmented
            value={view}
            onValueChange={setView}
            ariaLabel={t('testData.output.view')}
            size="sm"
            options={[
              { value: 'table', label: <TableIcon />, title: t('testData.output.table') },
              { value: 'raw', label: <WrapTextIcon />, title: t('testData.output.raw') },
            ]}
          />
          <Button variant="ghost" size="xs" onClick={copy}>
            {copied ? <CheckIcon className="text-green-600" /> : <CopyIcon />}
            {copied ? t('testData.copied') : t('common.copy')}
          </Button>
          <Button variant="ghost" size="xs" onClick={onDownload}>
            <DownloadIcon /> {t('testData.output.download')}
          </Button>
        </div>
      </header>

      {view === 'table' ? (
        <DataPreviewTable
          columns={columns}
          rows={rows.slice(0, PREVIEW_LIMIT)}
          className="min-h-0 flex-1"
        />
      ) : (
        <pre className="scrollbar-both min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre">
          {preview}
        </pre>
      )}

      {rows.length > PREVIEW_LIMIT && (
        <p className="shrink-0 border-t bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
          {t('testData.output.preview', { count: PREVIEW_LIMIT })}
        </p>
      )}
    </motion.div>
  )
}
