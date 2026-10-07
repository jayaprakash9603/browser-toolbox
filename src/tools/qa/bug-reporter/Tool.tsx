import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileTextIcon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { TextEditor } from '@/shared/components/TextEditor'
import { CopyButton } from '@/shared/components/CopyButton'
import { useQaTool } from '../_shared'

interface PageMeta {
  url: string
  title: string
}

export default function BugReporterTool() {
  const { t } = useTranslation()
  const tool = useQaTool('qa.bug-reporter')
  const [page, setPage] = useState<PageMeta | null>(null)
  const [expected, setExpected] = useState('')
  const [actual, setActual] = useState('')
  const [steps, setSteps] = useState('')
  const [notes, setNotes] = useState('')
  const [report, setReport] = useState('')

  useEffect(() => {
    let live = true
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (live && tab) setPage({ url: tab.url ?? '', title: tab.title ?? '' })
    })
    return () => {
      live = false
    }
  }, [])

  const build = () => {
    const now = new Date().toISOString()
    const viewport =
      typeof window !== 'undefined' ? `${window.screen.width}×${window.screen.height}` : '—'
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '—'
    setReport(
      [
        '## Bug Report',
        '',
        `**Page:** ${page?.title || '—'}`,
        `**URL:** ${page?.url || '—'}`,
        `**Reported:** ${now}`,
        `**Viewport:** ${viewport}`,
        `**User agent:** ${ua}`,
        '',
        '### Expected',
        expected || '—',
        '',
        '### Actual',
        actual || '—',
        '',
        '### Steps to reproduce',
        steps || '—',
        '',
        '### Notes',
        notes || '—',
      ].join('\n'),
    )
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        {page && (
          <div className="rounded-md border bg-muted/40 p-2 text-[11px]">
            <p className="truncate font-medium">{page.title}</p>
            <p className="truncate text-muted-foreground">{page.url}</p>
          </div>
        )}
        <Field label={t('qa.expected')} value={expected} onChange={setExpected} />
        <Field label={t('qa.actual')} value={actual} onChange={setActual} />
        <Field label={t('qa.steps')} value={steps} onChange={setSteps} area />
        <Field label={t('qa.notes')} value={notes} onChange={setNotes} area />
        <Button size="sm" className="w-fit" onClick={build}>
          <FileTextIcon /> {t('qa.generateReport')}
        </Button>
        {report && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">{t('qa.report')}</span>
              <CopyButton text={report} size="xs" />
            </div>
            <TextEditor value={report} readOnly minRows={10} ariaLabel={t('qa.report')} />
          </div>
        )}
      </div>
    </ToolPage>
  )
}

function Field({
  label,
  value,
  onChange,
  area,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  area?: boolean
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium">{label}</span>
      {area ? (
        <TextEditor value={value} onChange={onChange} minRows={3} mono={false} ariaLabel={label} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      )}
    </label>
  )
}
