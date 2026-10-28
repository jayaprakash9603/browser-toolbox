import { BracesIcon, ClipboardListIcon, DownloadIcon, FileTextIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { reportToJson, reportToMarkdown, type A11yReport } from '@/core/engines/a11y'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

import { a11yReportText } from './reportText'

interface ExportMenuProps {
  report: A11yReport
  onDone: (message: string) => void
  disabled?: boolean
}

function download(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function fileName(report: A11yReport, extension: string) {
  const day = new Date().toISOString().slice(0, 10)
  let host = 'page'
  try {
    host = new URL(report.scan.url).hostname.replace(/[^a-z0-9.-]+/gi, '-')
  } catch {
    // keep default
  }
  return `a11y-${host}-${day}.${extension}`
}

export function ExportMenu({ report, onDone, disabled }: ExportMenuProps) {
  const { t } = useTranslation()
  const text = a11yReportText(t)

  const copy = async (payload: string) => {
    try {
      await navigator.clipboard.writeText(payload)
      onDone(t('a11y.copied'))
    } catch {
      onDone(t('a11y.copyFailed'))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="xs" disabled={disabled}>
          <DownloadIcon className="size-3.5" />
          {t('a11y.export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{t('a11y.export')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void copy(reportToMarkdown(report, text))}>
          <ClipboardListIcon className="size-4" />
          {t('a11y.exportCopyMd')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const md = reportToMarkdown(report, text)
            download(md, fileName(report, 'md'), 'text/markdown;charset=utf-8')
            onDone(t('a11y.downloaded', { name: fileName(report, 'md') }))
          }}
        >
          <FileTextIcon className="size-4" />
          {t('a11y.exportMarkdown')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const json = reportToJson(report)
            download(json, fileName(report, 'json'), 'application/json;charset=utf-8')
            onDone(t('a11y.downloaded', { name: fileName(report, 'json') }))
          }}
        >
          <BracesIcon className="size-4" />
          {t('a11y.exportJson')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
