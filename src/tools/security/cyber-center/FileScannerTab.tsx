import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { digestBlob } from '@/core/engines/hash/digests'
import { FILE_SCAN_SIZE_LIMIT, analyzeFileLocal, type FileAnalysisReport } from '@/core/security-center'
import { CapsLabel, Panel, StatusBadge } from './ui'

export function FileScannerTab() {
  const { t } = useTranslation()
  const [report, setReport] = useState<FileAnalysisReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const tooLarge = file.size > FILE_SCAN_SIZE_LIMIT
      const digest = tooLarge
        ? null
        : await digestBlob(file, { algorithms: ['SHA-256'] })
      const next = analyzeFileLocal({
        name: file.name,
        mime: file.type,
        size: file.size,
        head: digest?.head ?? new Uint8Array(await file.slice(0, 64).arrayBuffer()),
        sha256: digest?.digests['SHA-256'],
      })
      if (tooLarge) next.notes.push('File exceeds the local size limit, so SHA-256 was skipped.')
      setReport(next)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not read that file.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel
        className="space-y-2"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          void analyze(event.dataTransfer.files[0])
        }}
      >
        <CapsLabel>Local file checks</CapsLabel>
        <p className="text-sm text-muted-foreground">{t('securityCenter.fileDisclaimer', 'Local file checks are not antivirus. Hashes and magic bytes cannot prove a file is safe.')}</p>
        <input
          type="file"
          disabled={busy}
          onChange={(event) => {
            void analyze(event.target.files?.[0])
            event.currentTarget.value = ''
          }}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </Panel>
      {report ? (
        <Panel className="space-y-2">
          <p className="font-mono text-sm">{report.name}</p>
          <div className="flex flex-wrap gap-1">
            <StatusBadge label={report.mime} tone="muted" />
            <StatusBadge label={`${report.size} bytes`} tone="info" />
            {report.signatureLabel ? <StatusBadge label={report.signatureLabel} tone="info" /> : null}
            {report.riskyType ? <StatusBadge label="risky type" tone="warning" /> : null}
            {report.doubleExtension ? <StatusBadge label="double extension" tone="warning" /> : null}
            {report.extensionMismatch ? <StatusBadge label="extension mismatch" tone="danger" /> : null}
          </div>
          {report.sha256 ? <p className="break-all font-mono text-[11px]">SHA-256 {report.sha256}</p> : null}
          <ul className="list-disc pl-4 text-xs text-muted-foreground">
            {report.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">{report.disclaimer}</p>
        </Panel>
      ) : null}
    </div>
  )
}
