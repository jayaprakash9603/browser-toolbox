import { useTranslation } from 'react-i18next'
import { RefreshCwIcon, XIcon, type LucideIcon } from 'lucide-react'

import { formatBytes } from '@/core/engines/image'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'
import { useFileDrop } from './useFileDrop'
import { splitFileName, type LoadedFile } from './fileKinds'

interface FileSummaryCardProps {
  file: LoadedFile
  icon: LucideIcon
  accept: string
  stats: string[]
  onReplace: (files: File[]) => void
  onRemove: () => void
}

export function FileSummaryCard({
  file,
  icon: Icon,
  accept,
  stats,
  onReplace,
  onRemove,
}: FileSummaryCardProps) {
  const { t } = useTranslation()
  const { active, handlers } = useFileDrop(onReplace)
  const { base, extension } = splitFileName(file.name)
  const modified = file.lastModified ? new Date(file.lastModified).toLocaleString() : ''

  return (
    <div
      {...handlers}
      className={cn(
        'flex items-center gap-3 rounded-[var(--radius-lg)] border bg-card p-3 shadow-xs transition-colors duration-150',
        active && 'border-primary bg-primary/5',
      )}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary"
        aria-hidden
      >
        <Icon className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="flex min-w-0 text-sm font-semibold leading-tight" tabIndex={0}>
              <span className="truncate">{base}</span>
              {extension && (
                <span className="shrink-0 text-muted-foreground">.{extension.toLowerCase()}</span>
              )}
            </p>
          </TooltipTrigger>
          <TooltipContent className="max-w-80 break-all">
            {file.name}
            {modified && <span className="block text-[11px] opacity-80">{modified}</span>}
          </TooltipContent>
        </Tooltip>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          {extension && (
            <Badge variant="secondary" className="h-[18px] px-1.5 text-[10px] font-semibold tracking-wide">
              {extension}
            </Badge>
          )}
          <span className="tabular-nums">{formatBytes(file.size)}</span>
          {stats.map((stat) => (
            <span key={stat} className="flex items-center gap-1.5 tabular-nums">
              <span aria-hidden>·</span>
              {stat}
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button asChild variant="outline" size="xs" className="cursor-pointer focus-within:ring-2 focus-within:ring-ring/40">
          <label>
            <RefreshCwIcon aria-hidden />
            <span className="hidden @[360px]:inline">{t('files.replace')}</span>
            <input
              type="file"
              accept={accept}
              className="sr-only"
              aria-label={t('files.replace')}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ''
                if (files.length > 0) onReplace(files)
              }}
            />
          </label>
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" onClick={onRemove} aria-label={t('files.remove')}>
              <XIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('files.remove')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
