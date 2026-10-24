import { BracesIcon, ClipboardListIcon, DownloadIcon, FileSpreadsheetIcon, LinkIcon, ShareIcon, TextIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  linksToCsv,
  linksToJson,
  linksToMarkdown,
  type LinkEntry,
  type StatusLookup,
} from '@/core/engines/links/pageLinks'
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
  entries: LinkEntry[]
  host: string
  statusOf: StatusLookup
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
  return `links-${site}-${day}.${extension}`
}

export function ExportMenu({ entries, host, statusOf, onDone }: ExportMenuProps) {
  const { t } = useTranslation()
  const count = entries.length

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      onDone(t('web.links.copied', { count }))
    } catch {
      onDone(t('web.links.copyFailed'))
    }
  }

  const save = (text: string, extension: 'csv' | 'json', type: string) => {
    const name = fileName(host, extension)
    download(text, name, type)
    onDone(t('web.links.downloaded', { name }))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t('web.links.export')} title={t('web.links.export')} disabled={count === 0}>
          <ShareIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
          {t('web.links.exportScope', { count })}
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void copy(entries.map((entry) => entry.link.href).join('\n'))}>
          <LinkIcon />
          {t('web.links.copyUrls')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy(linksToMarkdown(entries))}>
          <TextIcon />
          {t('web.links.copyMarkdown')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy(linksToCsv(entries, statusOf))}>
          <ClipboardListIcon />
          {t('web.links.copyCsv')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => save(linksToCsv(entries, statusOf), 'csv', 'text/csv;charset=utf-8')}>
          <FileSpreadsheetIcon />
          {t('web.links.downloadCsv')}
          <DownloadIcon className="ml-auto opacity-60" />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => save(linksToJson(entries, statusOf), 'json', 'application/json')}>
          <BracesIcon />
          {t('web.links.downloadJson')}
          <DownloadIcon className="ml-auto opacity-60" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
