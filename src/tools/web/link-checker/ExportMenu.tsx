import {
  AlertOctagonIcon,
  BracesIcon,
  ClipboardListIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ShareIcon,
  TextIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  entriesToCsv,
  entriesToJson,
  entriesToMarkdown,
  isProblem,
  type CheckEntry,
  type LinkHealth,
  type ReportMeta,
} from '@/core/engines/linkChecker/report'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

interface ExportMenuProps {
  entries: CheckEntry[]
  meta: ReportMeta
  host: string
  onDone: (message: string) => void
}

function download(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function fileName(host: string, extension: string) {
  const day = new Date().toISOString().slice(0, 10)
  const site = (host || 'page').replace(/[^a-z0-9.-]+/gi, '-')
  return `link-check-${site}-${day}.${extension}`
}

export function ExportMenu({ entries, meta, host, onDone }: ExportMenuProps) {
  const { t } = useTranslation()
  const done = entries.filter((entry) => entry.state.phase === 'done')
  const label = (health: LinkHealth) => t(`linkChecker.health.${health}`)

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      onDone(t('linkChecker.copied'))
    } catch {
      onDone(t('linkChecker.copyFailed'))
    }
  }

  const copyProblems = () => {
    const urls = done
      .filter((entry) => entry.state.phase === 'done' && isProblem(entry.state.health, meta.redirectsAsIssues))
      .map((entry) => entry.target.url)
    if (urls.length === 0) onDone(t('linkChecker.nothingToCopy'))
    else void copy(urls.join('\n'))
  }

  const save = (text: string, extension: 'csv' | 'json' | 'md', type: string) => {
    const name = fileName(host, extension)
    download(text, name, type)
    onDone(t('linkChecker.downloaded', { name }))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('linkChecker.export')}
          title={t('linkChecker.export')}
          disabled={done.length === 0}
        >
          <ShareIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
          {t('linkChecker.exportScope', { count: done.length })}
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={copyProblems}>
          <AlertOctagonIcon />
          {t('linkChecker.copyProblemUrls')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy(entriesToMarkdown(done, meta, label))}>
          <TextIcon />
          {t('linkChecker.copyReport')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy(entriesToCsv(done))}>
          <ClipboardListIcon />
          {t('linkChecker.copyCsv')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => save(entriesToCsv(done), 'csv', 'text/csv;charset=utf-8')}>
          <FileSpreadsheetIcon />
          {t('linkChecker.downloadCsv')}
          <DownloadIcon className="ml-auto opacity-60" />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => save(entriesToJson(done, meta), 'json', 'application/json')}>
          <BracesIcon />
          {t('linkChecker.downloadJson')}
          <DownloadIcon className="ml-auto opacity-60" />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => save(entriesToMarkdown(done, meta, label), 'md', 'text/markdown;charset=utf-8')}>
          <FileTextIcon />
          {t('linkChecker.downloadReport')}
          <DownloadIcon className="ml-auto opacity-60" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
