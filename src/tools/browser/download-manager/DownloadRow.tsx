import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  extensionFromPath,
  bytesReceived,
  formatSpeed,
  hostFromUrl,
  totalBytes,
  mapChromeDownloadStatus,
  progressPercent,
  formatBytes,
  formatDuration,
  type DownloadLiveSnapshot,
} from '@/core/download-manager'
import { FileGlyph } from '@/shared/components/files/FileGlyph'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/utils/cn'

import { controlDownloads } from './service'

interface DownloadRowProps {
  item: chrome.downloads.DownloadItem
  snapshot: DownloadLiveSnapshot | null
  compact?: boolean
  selected: boolean
  onSelect: (id: number, on: boolean) => void
}

export function DownloadRow({ item, snapshot, compact, selected, onSelect }: DownloadRowProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const status = mapChromeDownloadStatus(item)
  const pct = progressPercent(item)
  const speed = snapshot?.speeds[item.id]
  const name = item.filename?.split(/[\\/]/).pop() ?? t('downloadManager.unknownFile')
  const ext = extensionFromPath(item.filename || item.url)
  const host = hostFromUrl(item.referrer || item.url)

  const statusTone =
    status === 'completed'
      ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
      : status === 'failed' || status === 'interrupted'
        ? 'bg-rose-500/12 text-rose-700 dark:text-rose-400'
        : status === 'paused'
          ? 'bg-amber-500/12 text-amber-800 dark:text-amber-400'
          : 'bg-sky-500/12 text-sky-800 dark:text-sky-400'

  return (
    <motion.li layout={reduce ? false : 'position'} className="list-none">
      <motion.article
        className={cn(
          'rounded-xl border bg-card shadow-xs transition-colors',
          selected && 'border-primary/35 bg-primary/5',
          compact ? 'p-2.5' : 'p-3.5',
        )}
      >
        <div className="flex items-start gap-2">
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelect(item.id, v === true)}
            aria-label={t('downloadManager.selectItem', { name })}
            className="mt-1"
          />
          <FileGlyph extension={ext || 'file'} className="h-9 w-7" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {host} · {formatBytes(totalBytes(item) ?? bytesReceived(item))}
                </p>
              </div>
              <Badge variant="secondary" className={cn('shrink-0 text-[10px]', statusTone)}>
                {t(`downloadManager.status.${status}`)}
              </Badge>
            </div>
            {pct != null && status === 'in_progress' && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-primary/15">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: reduce ? 0 : 0.35 }}
                  />
                </div>
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {pct}% · {formatSpeed(speed?.bps ?? 0)}
                  {speed?.etaMs ? ` · ${formatDuration(speed.etaMs)}` : ''}
                </p>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {item.state === 'in_progress' && !item.paused ? (
              <Button size="icon-xs" variant="ghost" onClick={() => void controlDownloads('pause', [item.id])}>
                <PauseIcon />
              </Button>
            ) : item.state === 'in_progress' && item.paused ? (
              <Button size="icon-xs" variant="ghost" onClick={() => void controlDownloads('resume', [item.id])}>
                <PlayIcon />
              </Button>
            ) : null}
            <Button size="icon-xs" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              <ChevronDownIcon className={cn('transition-transform', open && 'rotate-180')} />
            </Button>
          </div>
        </div>
        <AnimatePresence>
          {open ? (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex flex-wrap gap-1 border-t border-border/60 pt-2">
                <Button size="xs" variant="secondary" onClick={() => void controlDownloads('show', [item.id])}>
                  <FolderOpenIcon className="size-3" />
                  {t('downloadManager.action.show')}
                </Button>
                <Button size="xs" variant="secondary" onClick={() => void controlDownloads('retry', [item.id])}>
                  <RotateCcwIcon className="size-3" />
                  {t('downloadManager.action.retry')}
                </Button>
                <Button size="xs" variant="secondary" onClick={() => void controlDownloads('cancel', [item.id])}>
                  <XIcon className="size-3" />
                  {t('downloadManager.action.cancel')}
                </Button>
                <Button size="xs" variant="ghost" onClick={() => void controlDownloads('erase', [item.id])}>
                  <Trash2Icon className="size-3" />
                  {t('downloadManager.action.erase')}
                </Button>
                {item.referrer ? (
                  <Button size="xs" variant="ghost" asChild>
                    <a href={item.referrer} target="_blank" rel="noreferrer">
                      <ExternalLinkIcon className="size-3" />
                      {t('downloadManager.action.source')}
                    </a>
                  </Button>
                ) : null}
                <CopyButton text={item.finalUrl || item.url} label={t('downloadManager.action.copyUrl')} size="xs" />
                <CopyButton text={name} label={t('downloadManager.action.copyName')} size="xs" />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.article>
    </motion.li>
  )
}
